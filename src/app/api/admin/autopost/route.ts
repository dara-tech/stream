import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteSettings } from "@/models/SiteSettings";
import { MovieModel } from "@/models/Movie";
import { TMDB_CONFIG } from "@/config/tmdb";
import { testTumblrAuth, postMovieToTumblr } from "@/lib/tumblr";

async function syncMoviesFromTMDB(limitPages = 3): Promise<number> {
  try {
    const apiKey = TMDB_CONFIG.API_KEY;
    let inserted = 0;
    const endpoints = [
      `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&page=1`,
      `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&page=2`,
      `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&page=3`,
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}&page=1`,
      `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&page=1`,
    ];

    for (const url of endpoints.slice(0, Math.max(1, limitPages))) {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        for (const m of data.results) {
          if (!m.title || !m.poster_path) continue;
          const exists = await MovieModel.findOne({ tmdbId: m.id });
          if (!exists) {
            await MovieModel.create({
              tmdbId: m.id,
              title: m.title,
              overview: m.overview || "No overview available",
              releaseDate: m.release_date ? new Date(m.release_date) : new Date(),
              posterPath: m.poster_path,
              backdropPath: m.backdrop_path || "",
              voteAverage: m.vote_average || 0,
              voteCount: m.vote_count || 0,
              isAvailable: true,
              telegramPostedAt: null,
            });
            inserted++;
          }
        }
      }
    }
    return inserted;
  } catch (err) {
    console.error("Auto-sync TMDB catalog error:", err);
    return 0;
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    const settings = await SiteSettings.findOne().lean();

    let [unpostedCount, postedCount] = await Promise.all([
      MovieModel.countDocuments({
        $or: [{ telegramPostedAt: null }, { telegramPostedAt: { $exists: false } }],
      }),
      MovieModel.countDocuments({ telegramPostedAt: { $ne: null } }),
    ]);

    // If MongoDB catalog has 0 movies, automatically seed top-rated movies from TMDB
    if (unpostedCount === 0 && postedCount === 0) {
      await syncMoviesFromTMDB(4);
      [unpostedCount, postedCount] = await Promise.all([
        MovieModel.countDocuments({
          $or: [{ telegramPostedAt: null }, { telegramPostedAt: { $exists: false } }],
        }),
        MovieModel.countDocuments({ telegramPostedAt: { $ne: null } }),
      ]);
    }

    return NextResponse.json({
      success: true,
      data: {
        telegram: settings?.telegram || {
          botToken: "",
          chatId: "",
          enabled: false,
          siteUrl: "https://streamhd.to",
        },
        bluesky: settings?.bluesky || {
          identifier: "",
          appPassword: "",
          serviceUrl: "https://bsky.social",
          enabled: false,
        },
        reddit: settings?.reddit || {
          clientId: "",
          clientSecret: "",
          username: "",
          password: "",
          subreddit: "",
          enabled: false,
        },
        facebook: settings?.facebook || {
          pageAccessToken: "",
          pageId: "",
          enabled: false,
        },
        tumblr: settings?.tumblr || {
          consumerKey: "",
          consumerSecret: "",
          token: "",
          tokenSecret: "",
          blogIdentifier: "",
          postState: "draft",
          enabled: false,
        },
        stats: {
          unpostedMovies: unpostedCount,
          postedMovies: postedCount,
          totalMovies: unpostedCount + postedCount,
        },
        autoPost: settings?.autoPost || {
          enabled: false,
          intervalMinutes: 30,
          minRating: 7.0,
          postOnlyTopRated: true,
          lastPostedAt: null,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { action } = body;

    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings();
    }

    // 1. Save Settings (All Social Platforms)
    if (action === "save_settings" || action === "save_social_settings") {
      if (body.autoPost) {
        settings.autoPost = {
          ...settings.autoPost,
          enabled: Boolean(body.autoPost.enabled),
          intervalMinutes: Math.max(1, Number(body.autoPost.intervalMinutes) || 30),
          minRating: Number(body.autoPost.minRating) || 7.0,
          postOnlyTopRated: Boolean(body.autoPost.postOnlyTopRated),
          updatedAt: new Date(),
        };
      }

      if (body.telegram) {
        settings.telegram = {
          ...settings.telegram,
          botToken: body.telegram.botToken,
          chatId: body.telegram.chatId,
          siteUrl: body.telegram.siteUrl || body.siteUrl,
          groupLink: body.telegram.groupLink,
          enabled: Boolean(body.telegram.enabled),
          updatedAt: new Date(),
        };
      } else if (body.botToken !== undefined) {
        // legacy shape fallback
        settings.telegram = {
          ...settings.telegram,
          botToken: body.botToken,
          chatId: body.chatId,
          siteUrl: body.siteUrl,
          groupLink: body.groupLink,
          enabled: Boolean(body.enabled),
          updatedAt: new Date(),
        };
      }

      if (body.bluesky) {
        settings.bluesky = {
          ...settings.bluesky,
          identifier: body.bluesky.identifier,
          appPassword: body.bluesky.appPassword,
          serviceUrl: body.bluesky.serviceUrl || "https://bsky.social",
          enabled: Boolean(body.bluesky.enabled),
          updatedAt: new Date(),
        };
      }

      if (body.reddit) {
        settings.reddit = {
          ...settings.reddit,
          clientId: body.reddit.clientId,
          clientSecret: body.reddit.clientSecret,
          username: body.reddit.username,
          password: body.reddit.password,
          subreddit: body.reddit.subreddit,
          enabled: Boolean(body.reddit.enabled),
          updatedAt: new Date(),
        };
      }

      if (body.facebook) {
        settings.facebook = {
          ...settings.facebook,
          pageAccessToken: body.facebook.pageAccessToken,
          pageId: body.facebook.pageId,
          enabled: Boolean(body.facebook.enabled),
          updatedAt: new Date(),
        };
      }

      if (body.tumblr) {
        settings.tumblr = {
          ...settings.tumblr,
          consumerKey: body.tumblr.consumerKey,
          consumerSecret: body.tumblr.consumerSecret,
          token: body.tumblr.token,
          tokenSecret: body.tumblr.tokenSecret,
          blogIdentifier: body.tumblr.blogIdentifier,
          postState: body.tumblr.postState || "draft",
          enabled: Boolean(body.tumblr.enabled),
          updatedAt: new Date(),
        };
      }

      await settings.save();
      return NextResponse.json({ success: true, message: "Social settings saved successfully!" });
    }

    // 1.1 Sync Catalog from TMDB
    if (action === "sync_catalog") {
      const pages = Math.min(10, Math.max(1, Number(body.pages) || 4));
      const inserted = await syncMoviesFromTMDB(pages);
      const total = await MovieModel.countDocuments();
      const unposted = await MovieModel.countDocuments({
        $or: [{ telegramPostedAt: null }, { telegramPostedAt: { $exists: false } }],
      });
      return NextResponse.json({
        success: true,
        message: `Synced ${inserted} new movies from TMDB! Total catalog: ${total} (${unposted} queued to post)`,
        total,
        unposted,
        inserted,
      });
    }

    // 2. Test Single Channel
    if (action === "test_channel" || action === "test_bot") {
      const channel = body.channel || "telegram";

      // TELEGRAM
      if (channel === "telegram") {
        const token = body.botToken || settings.telegram?.botToken;
        const chatId = body.chatId || settings.telegram?.chatId;

        if (!token || !chatId) {
          return NextResponse.json(
            { success: false, message: "Telegram Bot Token and Chat ID are required" },
            { status: 400 }
          );
        }

        const telegramApiUrl = `https://api.telegram.org/bot${token}/sendMessage`;
        const testMsg = `🎬 *StreamFlix Social Test*\n\n✅ Telegram channel connection verified!\n📡 Ready to broadcast movies & series.\n⏰ ${new Date().toLocaleString()}`;

        const res = await fetch(telegramApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: testMsg,
            parse_mode: "Markdown",
          }),
        });

        const data = await res.json();
        if (!data.ok) {
          return NextResponse.json(
            { success: false, message: data.description || "Telegram API rejected test message" },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Telegram test message sent successfully!",
        });
      }

      // BLUESKY
      if (channel === "bluesky") {
        const identifier = body.identifier || settings.bluesky?.identifier;
        const appPassword = body.appPassword || settings.bluesky?.appPassword;
        const serviceUrl = body.serviceUrl || settings.bluesky?.serviceUrl || "https://bsky.social";

        if (!identifier || !appPassword) {
          return NextResponse.json(
            { success: false, message: "Bluesky Handle and App Password are required" },
            { status: 400 }
          );
        }

        try {
          const res = await fetch(`${serviceUrl.replace(/\/$/, "")}/xrpc/com.atproto.server.createSession`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password: appPassword }),
          });

          const data = await res.json();
          if (!res.ok) {
            return NextResponse.json(
              { success: false, message: data.message || "Bluesky authentication failed" },
              { status: 400 }
            );
          }

          return NextResponse.json({
            success: true,
            message: `Bluesky connection verified! Logged in as @${data.handle || identifier}`,
          });
        } catch (e: any) {
          return NextResponse.json(
            { success: false, message: e.message || "Failed to reach Bluesky server" },
            { status: 400 }
          );
        }
      }

      // REDDIT
      if (channel === "reddit") {
        const clientId = body.clientId || settings.reddit?.clientId;
        const clientSecret = body.clientSecret || settings.reddit?.clientSecret;
        const username = body.username || settings.reddit?.username;
        const password = body.password || settings.reddit?.password;

        if (!clientId || !clientSecret || !username || !password) {
          return NextResponse.json(
            { success: false, message: "Reddit Client ID, Secret, Username and Password are required" },
            { status: 400 }
          );
        }

        try {
          const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
          const res = await fetch("https://www.reddit.com/api/v1/access_token", {
            method: "POST",
            headers: {
              Authorization: `Basic ${authString}`,
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "StreamFlix-AutoPoster/1.0",
            },
            body: new URLSearchParams({
              grant_type: "password",
              username,
              password,
            }),
          });

          const data = await res.json();
          if (data.error) {
            return NextResponse.json(
              { success: false, message: `Reddit auth error: ${data.error}` },
              { status: 400 }
            );
          }

          return NextResponse.json({
            success: true,
            message: "Reddit credentials verified successfully!",
          });
        } catch (e: any) {
          return NextResponse.json(
            { success: false, message: e.message || "Reddit API error" },
            { status: 400 }
          );
        }
      }

      // FACEBOOK
      if (channel === "facebook") {
        const pageAccessToken = body.pageAccessToken || settings.facebook?.pageAccessToken;
        const pageId = body.pageId || settings.facebook?.pageId;

        if (!pageAccessToken || !pageId) {
          return NextResponse.json(
            { success: false, message: "Facebook Page Access Token and Page ID are required" },
            { status: 400 }
          );
        }

        try {
          const res = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}?fields=name,id&access_token=${pageAccessToken}`
          );
          const data = await res.json();
          if (data.error) {
            return NextResponse.json(
              { success: false, message: data.error.message || "Facebook Graph API error" },
              { status: 400 }
            );
          }

          return NextResponse.json({
            success: true,
            message: `Facebook Page verified: "${data.name}" (${data.id})`,
          });
        } catch (e: any) {
          return NextResponse.json(
            { success: false, message: e.message || "Facebook API error" },
            { status: 400 }
          );
        }
      }

      // TUMBLR (OAuth 1.0a)
      if (channel === "tumblr") {
        const consumerKey = body.consumerKey || settings.tumblr?.consumerKey;
        const consumerSecret = body.consumerSecret || settings.tumblr?.consumerSecret;
        const token = body.token || settings.tumblr?.token;
        const tokenSecret = body.tokenSecret || settings.tumblr?.tokenSecret;
        const blogIdentifier = body.blogIdentifier || settings.tumblr?.blogIdentifier;

        if (!consumerKey || !consumerSecret || !token || !tokenSecret) {
          return NextResponse.json(
            { success: false, message: "Tumblr Consumer Key, Consumer Secret, OAuth Token, and Token Secret are required" },
            { status: 400 }
          );
        }

        const authResult = await testTumblrAuth({
          consumerKey,
          consumerSecret,
          token,
          tokenSecret,
          blogIdentifier: blogIdentifier || "streamhdfan",
        });

        return NextResponse.json(authResult, { status: authResult.success ? 200 : 400 });
      }

      return NextResponse.json({ success: false, message: "Unknown channel" }, { status: 400 });
    }

    // 3. Post Next Movie Across Enabled Social Channels
    if (action === "post_next_movie" || action === "broadcast_next") {
      const siteUrl = (settings.seo?.siteUrl || settings.telegram?.siteUrl || "https://streamhd.to").replace(/\/+$/, "");
      const postOnlyTopRated = settings.autoPost?.postOnlyTopRated ?? true;
      const minRating = Number(settings.autoPost?.minRating ?? 7.0);

      // 1. Build query for next unposted movie
      const query: any = {
        $or: [{ telegramPostedAt: null }, { telegramPostedAt: { $exists: false } }],
        posterPath: { $exists: true, $ne: "" },
      };

      // Apply top-rated constraint if enabled
      if (postOnlyTopRated && minRating > 0) {
        query.voteAverage = { $gte: minRating };
      }

      // Sort strictly by highest rating, then vote count, then release date
      let nextMovie = await MovieModel.findOne(query).sort({
        voteAverage: -1,
        voteCount: -1,
        popularity: -1,
        releaseDate: -1,
      });

      // Fallback: If all movies above rating threshold have been posted, pick highest remaining unposted
      if (!nextMovie && postOnlyTopRated) {
        delete query.voteAverage;
        nextMovie = await MovieModel.findOne(query).sort({
          voteAverage: -1,
          voteCount: -1,
          popularity: -1,
        });
      }

      // If still no movie found, auto-sync more movies from TMDB!
      if (!nextMovie) {
        await syncMoviesFromTMDB(4);
        nextMovie = await MovieModel.findOne(query).sort({
          voteAverage: -1,
          voteCount: -1,
          popularity: -1,
        });
      }

      if (!nextMovie) {
        return NextResponse.json({
          success: false,
          message: "All movies in the catalog have already been posted! Please sync more movies from TMDB.",
        });
      }

      if (!settings.autoPost) {
        settings.autoPost = {};
      }
      settings.autoPost.lastPostedAt = new Date();
      await settings.save();

      const year = nextMovie.releaseDate ? new Date(nextMovie.releaseDate).getFullYear() : "";
      const rating = nextMovie.voteAverage ? `⭐ ${nextMovie.voteAverage.toFixed(1)}/10` : "";
      const streamLink = `${siteUrl}/movie/${nextMovie.tmdbId || nextMovie._id}`;
      const posterUrl = nextMovie.posterPath?.startsWith("http")
        ? nextMovie.posterPath
        : `https://image.tmdb.org/t/p/w780${nextMovie.posterPath}`;

      const results: Record<string, { success: boolean; message: string }> = {};

      // 3.1 Telegram Broadcast
      if (settings.telegram?.enabled && settings.telegram?.botToken && settings.telegram?.chatId) {
        try {
          const caption = `🎬 *${nextMovie.title}* ${year ? `(${year})` : ""}\n\n${rating}\n\n📖 ${nextMovie.overview?.slice(0, 300)}...\n\n🍿 *Watch Online Free:* [Click Here to Stream](${streamLink})\n\n#Movie #${nextMovie.title.replace(/\s+/g, "")}`;
          const res = await fetch(`https://api.telegram.org/bot${settings.telegram.botToken}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: settings.telegram.chatId,
              photo: posterUrl,
              caption,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "▶️ Watch Now", url: streamLink },
                    { text: "💬 Join Channel", url: settings.telegram?.groupLink || "https://t.me" },
                  ],
                ],
              },
            }),
          });
          const tgData = await res.json();
          results.telegram = tgData.ok
            ? { success: true, message: "Published to Telegram" }
            : { success: false, message: tgData.description || "Telegram failed" };
        } catch (e: any) {
          results.telegram = { success: false, message: e.message };
        }
      }

      // 3.2 Bluesky Broadcast
      if (settings.bluesky?.enabled && settings.bluesky?.identifier && settings.bluesky?.appPassword) {
        try {
          const bskyUrl = (settings.bluesky.serviceUrl || "https://bsky.social").replace(/\/$/, "");
          const sessionRes = await fetch(`${bskyUrl}/xrpc/com.atproto.server.createSession`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              identifier: settings.bluesky.identifier,
              password: settings.bluesky.appPassword,
            }),
          });
          const session = await sessionRes.json();
          if (sessionRes.ok && session.accessJwt && session.did) {
            const bskyPostText = `🎬 Now Streaming: ${nextMovie.title} ${year ? `(${year})` : ""}\n\n${nextMovie.overview?.slice(0, 180)}...\n\n🍿 Watch: ${streamLink}`;
            const recordRes = await fetch(`${bskyUrl}/xrpc/com.atproto.repo.createRecord`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.accessJwt}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                repo: session.did,
                collection: "app.bsky.feed.post",
                record: {
                  $type: "app.bsky.feed.post",
                  text: bskyPostText,
                  createdAt: new Date().toISOString(),
                },
              }),
            });
            results.bluesky = recordRes.ok
              ? { success: true, message: "Published to Bluesky" }
              : { success: false, message: "Failed to create Bluesky post record" };
          } else {
            results.bluesky = { success: false, message: session.message || "Bluesky login failed" };
          }
        } catch (e: any) {
          results.bluesky = { success: false, message: e.message };
        }
      }

      // 3.3 Facebook Page Broadcast
      if (settings.facebook?.enabled && settings.facebook?.pageAccessToken && settings.facebook?.pageId) {
        try {
          const fbMessage = `🎬 Stream Now: ${nextMovie.title} ${year ? `(${year})` : ""}\n\n${nextMovie.overview?.slice(0, 300)}...\n\n🍿 Watch Online Free: ${streamLink}`;
          const fbRes = await fetch(`https://graph.facebook.com/v19.0/${settings.facebook.pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: fbMessage,
              link: streamLink,
              access_token: settings.facebook.pageAccessToken,
            }),
          });
          const fbData = await fbRes.json();
          results.facebook = fbData.id
            ? { success: true, message: `Published to Facebook Page (${fbData.id})` }
            : { success: false, message: fbData.error?.message || "Facebook post failed" };
        } catch (e: any) {
          results.facebook = { success: false, message: e.message };
        }
      }

      // 3.4 Tumblr Broadcast (OAuth 1.0a)
      if (
        settings.tumblr?.enabled &&
        settings.tumblr?.consumerKey &&
        settings.tumblr?.consumerSecret &&
        settings.tumblr?.token &&
        settings.tumblr?.tokenSecret &&
        settings.tumblr?.blogIdentifier
      ) {
        try {
          const posterUrl = nextMovie.posterPath
            ? nextMovie.posterPath.startsWith("http")
              ? nextMovie.posterPath
              : `https://image.tmdb.org/t/p/w780${nextMovie.posterPath}`
            : "";

          const tumblrRes = await postMovieToTumblr(
            {
              consumerKey: settings.tumblr.consumerKey,
              consumerSecret: settings.tumblr.consumerSecret,
              token: settings.tumblr.token,
              tokenSecret: settings.tumblr.tokenSecret,
              blogIdentifier: settings.tumblr.blogIdentifier,
              postState: (settings.tumblr.postState as any) || "draft",
            },
            {
              title: nextMovie.title,
              overview: nextMovie.overview || "",
              year,
              rating,
              posterUrl,
              streamLink,
            }
          );
          results.tumblr = tumblrRes;
        } catch (e: any) {
          results.tumblr = { success: false, message: e.message };
        }
      }

      // Check if any channel was attempted or enabled
      const enabledChannels = ["telegram", "bluesky", "reddit", "facebook", "tumblr"].filter(
        (ch) => (settings as any)?.[ch]?.enabled
      );

      if (enabledChannels.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "No social channels are enabled. Please enable Telegram, Bluesky, Reddit, Facebook, or Tumblr.",
          },
          { status: 400 }
        );
      }

      // Mark movie as posted
      nextMovie.telegramPostedAt = new Date();
      await nextMovie.save();

      const succeededCount = Object.values(results).filter((r) => r.success).length;

      return NextResponse.json({
        success: true,
        message: `Broadcasted "${nextMovie.title}" to ${succeededCount} channel(s)`,
        movie: {
          id: nextMovie._id,
          title: nextMovie.title,
          postedAt: nextMovie.telegramPostedAt,
        },
        results,
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

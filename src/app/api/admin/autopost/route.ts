import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteSettings } from "@/models/SiteSettings";
import { TMDB_CONFIG } from "@/config/tmdb";
import { testTumblrAuth, postMovieToTumblr } from "@/lib/tumblr";

interface TMDBMovieItem {
  id: number;
  title: string;
  overview: string;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  poster_path?: string;
  backdrop_path?: string;
}

/**
 * Pure TMDB API Bridge: Fetches next unposted top-rated / trending movie directly from TMDB API
 * No local MongoDB movie storage is needed.
 */
async function fetchNextMovieFromTMDB(
  postedIds: number[] = [],
  minRating = 7.0,
  feedType: "top_rated" | "trending" | "now_playing" = "top_rated"
): Promise<TMDBMovieItem | null> {
  const apiKey = TMDB_CONFIG.API_KEY;
  const postedSet = new Set(postedIds);

  const endpoints: string[] = [];

  // Scan up to 10 pages for unposted high-quality titles
  for (let p = 1; p <= 10; p++) {
    if (feedType === "trending") {
      endpoints.push(`https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}&page=${p}`);
    } else if (feedType === "now_playing") {
      endpoints.push(`https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&page=${p}`);
    } else {
      endpoints.push(`https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&page=${p}`);
    }
  }

  // Fallbacks if top_rated has seen many titles
  if (feedType === "top_rated") {
    endpoints.push(
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}&page=1`,
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}&page=2`,
      `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&page=1`,
      `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&page=2`
    );
  }

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.results || !Array.isArray(data.results)) continue;

      for (const m of data.results) {
        if (!m.id || !m.title || !m.poster_path) continue;
        if (postedSet.has(m.id)) continue;
        if (minRating > 0 && (m.vote_average ?? 0) < minRating) continue;
        return m as TMDBMovieItem;
      }
    } catch (err) {
      console.error("TMDB fetch error:", err);
    }
  }

  // If minRating was too strict, scan without rating filter to never run out of movies
  if (minRating > 0) {
    return fetchNextMovieFromTMDB(postedIds, 0, feedType);
  }

  return null;
}

export async function GET() {
  try {
    await connectToDatabase();
    const settings = await SiteSettings.findOne().lean();

    const postedTmdbIds = (settings?.autoPost?.postedTmdbIds as number[]) || [];

    return NextResponse.json({
      success: true,
      data: {
        telegram: settings?.telegram || {
          botToken: "",
          chatId: "",
          enabled: false,
          siteUrl: "https://www.streamhd.to",
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
          consumerKey: "VLvlAFdYzyKLizYtgaWJGUNv0pp8zCLUoIFmW0C5ghPSb1Fk4O",
          consumerSecret: "tzVkDyj89P4lCf0fZvWYqCzXRUiEHaHpcjLmsMEUZTCzAkUX3y",
          token: "eaOkT3PcIuD0BCMsP5mBsdCEz0pe65sanzkb28YUlhDS7VVuHK",
          tokenSecret: "26xAhlD2a8BQhCg7pGy3chvcng8gqbhnyWLZfdfIAMms04ZFyG",
          blogIdentifier: "fanmovie",
          postState: "published",
          enabled: true,
        },
        stats: {
          mode: "TMDB Live Bridge",
          unpostedMovies: "Unlimited (TMDB API)",
          postedMovies: postedTmdbIds.length,
          totalMovies: "10,000+ (TMDB)",
        },
        autoPost: settings?.autoPost || {
          enabled: false,
          intervalMinutes: 30,
          minRating: 7.0,
          postOnlyTopRated: true,
          feedType: "top_rated",
          postedTmdbIds: [],
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
        if (!settings.autoPost) settings.autoPost = {};
        if (body.autoPost.enabled !== undefined) settings.autoPost.enabled = Boolean(body.autoPost.enabled);
        if (body.autoPost.intervalMinutes !== undefined) {
          settings.autoPost.intervalMinutes = Math.max(1, Number(body.autoPost.intervalMinutes) || 30);
        }
        if (body.autoPost.minRating !== undefined) {
          settings.autoPost.minRating = Number(body.autoPost.minRating) || 7.0;
        }
        if (body.autoPost.postOnlyTopRated !== undefined) {
          settings.autoPost.postOnlyTopRated = Boolean(body.autoPost.postOnlyTopRated);
        }
        if (body.autoPost.feedType) {
          settings.autoPost.feedType = body.autoPost.feedType;
        }
        settings.autoPost.updatedAt = new Date();
      }

      if (body.telegram) {
        if (!settings.telegram) settings.telegram = {};
        if (body.telegram.botToken) settings.telegram.botToken = body.telegram.botToken;
        if (body.telegram.chatId) settings.telegram.chatId = body.telegram.chatId;
        if (body.telegram.siteUrl) settings.telegram.siteUrl = body.telegram.siteUrl;
        if (body.telegram.groupLink !== undefined) settings.telegram.groupLink = body.telegram.groupLink;
        if (body.telegram.enabled !== undefined) settings.telegram.enabled = Boolean(body.telegram.enabled);
        settings.telegram.updatedAt = new Date();
      }

      if (body.bluesky) {
        if (!settings.bluesky) settings.bluesky = {};
        if (body.bluesky.identifier) settings.bluesky.identifier = body.bluesky.identifier;
        if (body.bluesky.appPassword) settings.bluesky.appPassword = body.bluesky.appPassword;
        if (body.bluesky.serviceUrl) settings.bluesky.serviceUrl = body.bluesky.serviceUrl;
        if (body.bluesky.enabled !== undefined) settings.bluesky.enabled = Boolean(body.bluesky.enabled);
        settings.bluesky.updatedAt = new Date();
      }

      if (body.reddit) {
        if (!settings.reddit) settings.reddit = {};
        if (body.reddit.clientId) settings.reddit.clientId = body.reddit.clientId;
        if (body.reddit.clientSecret) settings.reddit.clientSecret = body.reddit.clientSecret;
        if (body.reddit.username) settings.reddit.username = body.reddit.username;
        if (body.reddit.password) settings.reddit.password = body.reddit.password;
        if (body.reddit.subreddit) settings.reddit.subreddit = body.reddit.subreddit;
        if (body.reddit.enabled !== undefined) settings.reddit.enabled = Boolean(body.reddit.enabled);
        settings.reddit.updatedAt = new Date();
      }

      if (body.facebook) {
        if (!settings.facebook) settings.facebook = {};
        if (body.facebook.pageAccessToken) settings.facebook.pageAccessToken = body.facebook.pageAccessToken;
        if (body.facebook.pageId) settings.facebook.pageId = body.facebook.pageId;
        if (body.facebook.enabled !== undefined) settings.facebook.enabled = Boolean(body.facebook.enabled);
        settings.facebook.updatedAt = new Date();
      }

      if (body.tumblr) {
        if (!settings.tumblr) settings.tumblr = {};
        if (body.tumblr.consumerKey) settings.tumblr.consumerKey = body.tumblr.consumerKey;
        if (body.tumblr.consumerSecret) settings.tumblr.consumerSecret = body.tumblr.consumerSecret;
        if (body.tumblr.token) settings.tumblr.token = body.tumblr.token;
        if (body.tumblr.tokenSecret) settings.tumblr.tokenSecret = body.tumblr.tokenSecret;
        if (body.tumblr.blogIdentifier) settings.tumblr.blogIdentifier = body.tumblr.blogIdentifier;
        if (body.tumblr.postState) settings.tumblr.postState = body.tumblr.postState;
        if (body.tumblr.enabled !== undefined) settings.tumblr.enabled = Boolean(body.tumblr.enabled);
        settings.tumblr.updatedAt = new Date();
      }

      await settings.save();
      return NextResponse.json({
        success: true,
        message: "Social broadcast & scheduler settings saved successfully!",
        data: {
          autoPost: settings.autoPost,
          tumblr: settings.tumblr,
          telegram: settings.telegram,
        },
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
        const testMsg = `🎬 *StreamHD Social Test*\n\n✅ Telegram channel connection verified!\n📡 Ready to broadcast movies & series.\n⏰ ${new Date().toLocaleString()}`;

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
          if (!res.ok || !data.accessJwt) {
            return NextResponse.json(
              { success: false, message: data.message || "Failed to authenticate with Bluesky" },
              { status: 400 }
            );
          }
          return NextResponse.json({
            success: true,
            message: `Bluesky authenticated as ${data.handle} (${data.did})`,
          });
        } catch (e: any) {
          return NextResponse.json({ success: false, message: e.message || "Bluesky error" }, { status: 400 });
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
        const blogIdentifier = body.blogIdentifier || settings.tumblr?.blogIdentifier || "fanmovie";

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
          blogIdentifier,
        });

        return NextResponse.json(authResult, { status: authResult.success ? 200 : 400 });
      }

      return NextResponse.json({ success: false, message: "Unknown channel" }, { status: 400 });
    }

    // 3. Post Next Movie Directly from TMDB API Bridge
    if (action === "post_next_movie" || action === "broadcast_next") {
      const siteUrl = "https://www.streamhd.to";
      const minRating = Number(settings.autoPost?.minRating ?? 7.0);
      const feedType = (settings.autoPost?.feedType as any) || "top_rated";
      const postedTmdbIds = (settings.autoPost?.postedTmdbIds as number[]) || [];

      // Fetch live movie from TMDB
      const movie = await fetchNextMovieFromTMDB(postedTmdbIds, minRating, feedType);

      if (!movie) {
        return NextResponse.json({
          success: false,
          message: "No unposted movie found from TMDB. All top titles have already been broadcasted!",
        });
      }

      const year = movie.release_date ? new Date(movie.release_date).getFullYear().toString() : "";
      const rating = movie.vote_average ? `⭐ ${movie.vote_average.toFixed(1)}/10` : "";
      const streamLink = `${siteUrl}/movie/${movie.id}`;
      const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
        : "";

      const results: Record<string, { success: boolean; message: string }> = {};

      // 3.1 Telegram Broadcast
      if (settings.telegram?.enabled && settings.telegram?.botToken && settings.telegram?.chatId) {
        try {
          const caption = `🎬 *${movie.title}* ${year ? `(${year})` : ""}\n\n${rating}\n\n📖 ${movie.overview?.slice(0, 300)}...\n\n🍿 *Watch on StreamHD:* [Click to Stream](${streamLink})\n\n#Movie #${movie.title.replace(/[^\w]/g, "")}`;
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
            const bskyPostText = `🎬 Featured Cinema: ${movie.title} ${year ? `(${year})` : ""}\n\n${movie.overview?.slice(0, 180)}...\n\n🍿 Stream: ${streamLink}`;
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
          const fbMessage = `🎬 Cinema Spotlight: ${movie.title} ${year ? `(${year})` : ""}\n\n${movie.overview?.slice(0, 300)}...\n\n🍿 Stream in HD: ${streamLink}`;
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
          const tumblrRes = await postMovieToTumblr(
            {
              consumerKey: settings.tumblr.consumerKey,
              consumerSecret: settings.tumblr.consumerSecret,
              token: settings.tumblr.token,
              tokenSecret: settings.tumblr.tokenSecret,
              blogIdentifier: settings.tumblr.blogIdentifier,
              postState: (settings.tumblr.postState as any) || "published",
            },
            {
              title: movie.title,
              overview: movie.overview || "",
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

      // Track TMDB ID as posted
      if (!settings.autoPost) settings.autoPost = {};
      if (!Array.isArray(settings.autoPost.postedTmdbIds)) {
        settings.autoPost.postedTmdbIds = [];
      }
      settings.autoPost.postedTmdbIds.push(movie.id);
      settings.autoPost.lastPostedAt = new Date();
      await settings.save();

      const succeededCount = Object.values(results).filter((r) => r.success).length;

      return NextResponse.json({
        success: true,
        message: `Broadcasted "${movie.title}" (${year}) via live TMDB bridge!`,
        movie: {
          id: movie.id,
          title: movie.title,
          year,
          rating,
          streamLink,
          posterUrl,
          postedAt: settings.autoPost.lastPostedAt,
        },
        results,
        succeededCount,
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

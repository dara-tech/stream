import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteSettings } from "@/models/SiteSettings";
import { testTumblrAuth } from "@/lib/tumblr";
import {
  broadcastNextMovie,
  checkAndRunAutoPost,
  startServerScheduler,
} from "@/lib/server-scheduler";

// Initialize 24/7 background scheduler daemon on the server
startServerScheduler();

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

      // If auto-post was enabled, trigger an immediate check
      if (settings.autoPost?.enabled) {
        checkAndRunAutoPost().catch((err) => console.error("[AutoPost] Immediate trigger error:", err));
      }

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
      const outcome = await broadcastNextMovie();
      return NextResponse.json(outcome, { status: outcome.success ? 200 : 400 });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

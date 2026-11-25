import { connectToDatabase } from "@/lib/mongodb";
import { SiteSettings } from "@/models/SiteSettings";
import { TMDB_CONFIG } from "@/config/tmdb";
import { postMovieToTumblr } from "@/lib/tumblr";
import { submitToIndexNow } from "@/services/indexnow.service";

export interface TMDBMovieItem {
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
 * Fetches the official YouTube trailer for a given TMDB movie ID
 */
export async function fetchMovieTrailer(movieId: number): Promise<string | null> {
  try {
    const apiKey = TMDB_CONFIG.API_KEY;
    const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${apiKey}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return null;

    const trailer =
      data.results.find((v: any) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
      data.results.find((v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")) ||
      data.results.find((v: any) => v.site === "YouTube");

    if (trailer?.key) {
      return `https://www.youtube.com/watch?v=${trailer.key}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Pure TMDB API Bridge: Fetches next unposted top-rated / trending movie directly from TMDB API
 */
export async function fetchNextMovieFromTMDB(
  postedIds: number[] = [],
  minRating = 7.0,
  feedType: "top_rated" | "trending" | "now_playing" = "top_rated"
): Promise<TMDBMovieItem | null> {
  const apiKey = TMDB_CONFIG.API_KEY;
  const postedSet = new Set(postedIds);

  const endpoints: string[] = [];

  for (let p = 1; p <= 10; p++) {
    if (feedType === "trending") {
      endpoints.push(`https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}&page=${p}`);
    } else if (feedType === "now_playing") {
      endpoints.push(`https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&page=${p}`);
    } else {
      endpoints.push(`https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&page=${p}`);
    }
  }

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

  if (minRating > 0) {
    return fetchNextMovieFromTMDB(postedIds, 0, feedType);
  }

  return null;
}

/**
 * Core broadcast worker: broadcasts next movie across all configured social channels
 */
export async function broadcastNextMovie(): Promise<{
  success: boolean;
  message: string;
  movie?: any;
  results?: Record<string, { success: boolean; message: string }>;
  succeededCount?: number;
}> {
  await connectToDatabase();
  let settings = await SiteSettings.findOne();
  if (!settings) settings = new SiteSettings();

  const siteUrl = "https://www.streamhd.to";
  const minRating = Number(settings.autoPost?.minRating ?? 7.0);
  const feedType = (settings.autoPost?.feedType as any) || "top_rated";
  const postedTmdbIds = (settings.autoPost?.postedTmdbIds as number[]) || [];

  const movie = await fetchNextMovieFromTMDB(postedTmdbIds, minRating, feedType);

  if (!movie) {
    return {
      success: false,
      message: "No unposted movie found from TMDB. All top titles have already been broadcasted!",
    };
  }

  const year = movie.release_date ? new Date(movie.release_date).getFullYear().toString() : "";
  const rating = movie.vote_average ? `⭐ ${movie.vote_average.toFixed(1)}/10` : "";
  const streamLink = `${siteUrl}/movie/${movie.id}`;
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : "";

  const youtubeTrailerUrl = await fetchMovieTrailer(movie.id);
  const results: Record<string, { success: boolean; message: string }> = {};

  // 1. Telegram
  if (settings.telegram?.enabled && settings.telegram?.botToken && settings.telegram?.chatId) {
    try {
      const caption = `🎬 *${movie.title}* ${year ? `(${year})` : ""}\n\n${rating}\n\n📖 ${movie.overview?.slice(0, 300)}...\n\n🍿 *Watch on StreamHD:* [Click to Stream](${streamLink})\n\n#Movie #${movie.title.replace(/[^\w]/g, "")}`;
      const inlineButtons: Array<Array<{ text: string; url: string }>> = [
        [
          { text: "▶️ Watch Now", url: streamLink },
          ...(youtubeTrailerUrl ? [{ text: "🎬 Trailer", url: youtubeTrailerUrl }] : []),
        ],
        [
          { text: "💬 Join Channel", url: settings.telegram?.groupLink || "https://t.me" },
        ],
      ];

      const res = await fetch(`https://api.telegram.org/bot${settings.telegram.botToken}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: settings.telegram.chatId,
          photo: posterUrl,
          caption,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: inlineButtons },
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

  // 2. Bluesky
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
        const bskyPostText = `🎬 Featured Cinema: ${movie.title} ${year ? `(${year})` : ""}\n\n${movie.overview?.slice(0, 160)}...\n\n🍿 Stream: ${streamLink}${youtubeTrailerUrl ? `\n🎬 Trailer: ${youtubeTrailerUrl}` : ""}`;
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

  // 3. Facebook Page
  if (settings.facebook?.enabled && settings.facebook?.pageAccessToken && settings.facebook?.pageId) {
    try {
      const fbMessage = `🎬 Cinema Spotlight: ${movie.title} ${year ? `(${year})` : ""}\n\n${movie.overview?.slice(0, 300)}...\n\n🍿 Stream in HD: ${streamLink}${youtubeTrailerUrl ? `\n\n🎬 Watch Official Trailer: ${youtubeTrailerUrl}` : ""}`;
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

  // 4. Tumblr
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
          youtubeTrailerUrl,
        }
      );
      results.tumblr = tumblrRes;
    } catch (e: any) {
      results.tumblr = { success: false, message: e.message };
    }
  }

  // Save posted TMDB ID & update lastPostedAt
  if (!settings.autoPost) settings.autoPost = {};
  if (!Array.isArray(settings.autoPost.postedTmdbIds)) {
    settings.autoPost.postedTmdbIds = [];
  }
  settings.autoPost.postedTmdbIds.push(movie.id);
  settings.autoPost.lastPostedAt = new Date();
  await settings.save();

  const succeededCount = Object.values(results).filter((r) => r.success).length;

  console.log(
    `[Server Scheduler] Auto-Broadcasted "${movie.title}" (${year}) to ${succeededCount} channel(s) at ${new Date().toISOString()}`
  );

  // Auto-submit URL to IndexNow for instant search engine indexing (Bing, Yahoo, DuckDuckGo)
  try {
    const indexNowRes = await submitToIndexNow([streamLink], siteUrl);
    if (indexNowRes.success) {
      console.log(`[IndexNow] Instant search index notification sent for: ${streamLink}`);
    }
  } catch (err: any) {
    console.warn(`[IndexNow] Notice: ${err?.message || err}`);
  }

  return {
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
  };
}

let isSchedulerRunning = false;

/**
 * Checks if auto-post is due based on settings and triggers if overdue
 */
export async function checkAndRunAutoPost(): Promise<{ executed: boolean; reason: string; result?: any }> {
  if (isSchedulerRunning) {
    return { executed: false, reason: "A broadcast is already in progress" };
  }

  try {
    isSchedulerRunning = true;
    await connectToDatabase();
    const settings = await SiteSettings.findOne().lean();

    if (!settings?.autoPost?.enabled) {
      return { executed: false, reason: "Auto-posting is disabled in settings" };
    }

    const intervalMinutes = Math.max(1, settings.autoPost.intervalMinutes || 30);
    const lastPostedAt = settings.autoPost.lastPostedAt ? new Date(settings.autoPost.lastPostedAt).getTime() : 0;
    const now = Date.now();
    const elapsedMinutes = (now - lastPostedAt) / (60 * 1000);

    if (elapsedMinutes < intervalMinutes) {
      const remainingMinutes = (intervalMinutes - elapsedMinutes).toFixed(1);
      return {
        executed: false,
        reason: `Not due yet. Next post due in ~${remainingMinutes} minutes (${intervalMinutes}m interval)`,
      };
    }

    console.log(`[Server Scheduler] Auto-post interval (${intervalMinutes}m) reached. Triggering live broadcast...`);
    const result = await broadcastNextMovie();
    return { executed: true, reason: "Broadcast triggered successfully", result };
  } catch (err: any) {
    console.error("[Server Scheduler] Error running auto-post check:", err);
    return { executed: false, reason: err.message };
  } finally {
    isSchedulerRunning = false;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __streamflix_scheduler_timer: NodeJS.Timeout | undefined;
}

/**
 * Starts continuous background daemon on the Node.js server.
 * Runs check every 30 seconds 24/7.
 */
export function startServerScheduler() {
  if (globalThis.__streamflix_scheduler_timer) {
    return;
  }

  console.log("🚀 [Server Scheduler] Starting 24/7 background Auto-Post Daemon (ticks every 30s)...");

  // Initial check after 10 seconds of server boot
  setTimeout(() => {
    checkAndRunAutoPost().catch((e) => console.error("[Server Scheduler] Initial check error:", e));
  }, 10_000);

  // Ticks every 30 seconds
  globalThis.__streamflix_scheduler_timer = setInterval(() => {
    checkAndRunAutoPost().catch((e) => console.error("[Server Scheduler] Timer tick error:", e));
  }, 30_000);
}

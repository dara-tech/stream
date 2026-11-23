import type { MetadataRoute } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteSettings } from "@/models/SiteSettings";
import { tmdbService } from "@/services/tmdb.service";
import { GENRE_MAP } from "@/config/tmdb";

export const revalidate = 3600; // Cache and revalidate sitemap once per hour

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Returns a strict W3C Date (YYYY-MM-DD) recommended by Google Search Console.
 * Prevents ancient date rejections (e.g., 1957 film release dates causing out-of-range lastmod errors).
 */
function getTodayDateString(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toSafeDateString(rawDate?: string | Date | null): string {
  const fallback = getTodayDateString();
  if (!rawDate) return fallback;

  try {
    const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (isNaN(d.getTime())) return fallback;

    const year = d.getUTCFullYear();
    const currentYear = new Date().getUTCFullYear();
    // A webpage URL on StreamHD cannot have been last modified before the web or decades ago (e.g. 1957)
    if (year < 2000 || year > currentYear + 1) {
      return fallback;
    }

    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  } catch {
    return fallback;
  }
}

async function getBaseSiteUrl(): Promise<string> {
  let siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://www.streamhd.to"
  ).replace(/\/+$/, "");

  try {
    await connectToDatabase();
    const settings = await SiteSettings.findOne().lean();
    if (settings?.seo?.siteUrl) {
      siteUrl = settings.seo.siteUrl.replace(/\/+$/, "");
    }
  } catch {
    // Fallback URL
  }
  return siteUrl;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getBaseSiteUrl();
  const todayDate = getTodayDateString();

  // 1. Static high-priority pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: todayDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/search`,
      lastModified: todayDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // 2. Programmatic Genre Hubs
  const genreEntries: MetadataRoute.Sitemap = Object.entries(GENRE_MAP).map(([_, name]) => ({
    url: `${siteUrl}/genre/${toSlug(name)}`,
    lastModified: todayDate,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  // 3. Programmatic Year Hubs
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, 2020, 2019, 2018];
  const yearEntries: MetadataRoute.Sitemap = years.map((yr) => ({
    url: `${siteUrl}/year/${yr}`,
    lastModified: todayDate,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  // 4. TMDB Live Bridge: Trending, Popular, Top-Rated Movies & TV Series
  const mediaMap = new Map<string, MetadataRoute.Sitemap[number]>();

  try {
    const [trending, popular, topRated] = await Promise.all([
      tmdbService.getTrending().catch(() => []),
      tmdbService.getPopularMovies().catch(() => []),
      tmdbService.getTopRatedMovies().catch(() => []),
    ]);

    for (const item of [...trending, ...popular, ...topRated]) {
      if (!item.id) continue;
      const title = item.title || item.name || "";
      const slug = toSlug(title);
      const isTv = item.media_type === "tv";
      const key = `${isTv ? "tv" : "movie"}-${item.id}`;

      if (mediaMap.has(key)) continue;

      const path = isTv
        ? `/series/${item.id}${slug ? `-${slug}` : ""}`
        : `/movie/${item.id}${slug ? `-${slug}` : ""}`;
      const rawDate = item.release_date || item.first_air_date;

      mediaMap.set(key, {
        url: `${siteUrl}${path}`,
        lastModified: toSafeDateString(rawDate),
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }
  } catch (err: any) {
    console.warn("Sitemap: TMDB fetch notice:", err?.message || err);
  }

  return [...staticPages, ...genreEntries, ...yearEntries, ...Array.from(mediaMap.values())];
}

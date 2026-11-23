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
 * Validates any date string or object into a strict W3C ISO 8601 string.
 * Completely eliminates "Invalid date" Google Search Console errors.
 */
function toSafeIsoDate(rawDate?: string | Date | null): string {
  if (!rawDate) return new Date().toISOString();
  try {
    const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (isNaN(d.getTime())) {
      return new Date().toISOString();
    }
    const year = d.getUTCFullYear();
    // Guard against malformed years (e.g. 0000 or ancient/extreme dates)
    if (year < 1900 || year > 2035) {
      return new Date().toISOString();
    }
    return d.toISOString();
  } catch {
    return new Date().toISOString();
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
  const currentIsoDate = new Date().toISOString();

  // 1. Static high-priority pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: currentIsoDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/search`,
      lastModified: currentIsoDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // 2. Programmatic Genre Hubs
  const genreEntries: MetadataRoute.Sitemap = Object.entries(GENRE_MAP).map(([_, name]) => ({
    url: `${siteUrl}/genre/${toSlug(name)}`,
    lastModified: currentIsoDate,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  // 3. Programmatic Year Hubs
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, 2020, 2019, 2018];
  const yearEntries: MetadataRoute.Sitemap = years.map((yr) => ({
    url: `${siteUrl}/year/${yr}`,
    lastModified: currentIsoDate,
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
        lastModified: toSafeIsoDate(rawDate),
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }
  } catch (err: any) {
    console.warn("Sitemap: TMDB fetch notice:", err?.message || err);
  }

  return [...staticPages, ...genreEntries, ...yearEntries, ...Array.from(mediaMap.values())];
}

import type { MetadataRoute } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { MovieModel } from "@/models/Movie";
import { SiteSettings } from "@/models/SiteSettings";
import { tmdbService } from "@/services/tmdb.service";
import { GENRE_MAP } from "@/config/tmdb";

export const revalidate = 3600; // Cache and revalidate sitemap once per hour

const CHUNK_SIZE = 4000; // Optimal chunk size for Googlebot ingestion

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getBaseSiteUrl(): Promise<string> {
  let siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://moviestream.cc"
  ).replace(/\/+$/, "");

  try {
    await connectToDatabase();
    const settings = await SiteSettings.findOne().lean();
    if (settings?.seo?.siteUrl) {
      siteUrl = settings.seo.siteUrl.replace(/\/+$/, "");
    }
  } catch (e: any) {
    // Fallback URL
  }
  return siteUrl;
}

/**
 * Next.js 16 Multi-Chunk Sitemap Index Generator
 * Divides the 60,000+ movie catalog and taxonomy pages into parallel sitemaps.
 */
export async function generateSitemaps() {
  try {
    await connectToDatabase();
    const totalCount = await MovieModel.countDocuments({ isAvailable: true });
    const numChunks = Math.max(1, Math.ceil(totalCount / CHUNK_SIZE));
    
    // Chunk 0: Static, taxonomy (genres, years, search)
    // Chunks 1..numChunks: Catalog movies
    const sitemaps = [{ id: "0" }];
    for (let i = 1; i <= Math.min(numChunks, 15); i++) {
      sitemaps.push({ id: String(i) });
    }
    return sitemaps;
  } catch {
    // Fallback chunks if DB is busy
    return [{ id: "0" }, { id: "1" }, { id: "2" }, { id: "3" }];
  }
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const idStr = await props.id;
  const chunkId = parseInt(idStr, 10) || 0;
  const siteUrl = await getBaseSiteUrl();
  const currentDate = new Date();

  // CHUNK 0: Core Pages & Taxonomy Hubs (Genres, Years, Static Routes)
  if (chunkId === 0) {
    const staticPages: MetadataRoute.Sitemap = [
      {
        url: `${siteUrl}`,
        lastModified: currentDate,
        changeFrequency: "daily",
        priority: 1.0,
      },
      {
        url: `${siteUrl}/search`,
        lastModified: currentDate,
        changeFrequency: "weekly",
        priority: 0.8,
      },
    ];

    // Programmatic Genre Hubs
    const genreEntries: MetadataRoute.Sitemap = Object.entries(GENRE_MAP).map(([_, name]) => ({
      url: `${siteUrl}/genre/${toSlug(name)}`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    // Programmatic Year Hubs
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, 2020, 2019, 2018];
    const yearEntries: MetadataRoute.Sitemap = years.map((yr) => ({
      url: `${siteUrl}/year/${yr}`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.85,
    }));

    // Supplement with TMDB trending
    const trendingEntries: MetadataRoute.Sitemap = [];
    try {
      const trending = await tmdbService.getTrending().catch(() => []);
      for (const item of trending) {
        if (!item.id) continue;
        const title = item.title || item.name || "";
        const slug = toSlug(title);
        const isTv = item.media_type === "tv";
        const path = isTv ? `/series/${item.id}${slug ? `-${slug}` : ""}` : `/movie/${item.id}${slug ? `-${slug}` : ""}`;
        trendingEntries.push({
          url: `${siteUrl}${path}`,
          lastModified: currentDate,
          changeFrequency: "daily",
          priority: 0.95,
        });
      }
    } catch {
      // Ignore
    }

    return [...staticPages, ...genreEntries, ...yearEntries, ...trendingEntries];
  }

  // CHUNKS 1..N: Paginated Movie Catalog (4,000 URLs per chunk)
  const skip = (chunkId - 1) * CHUNK_SIZE;
  const movieUrlMap = new Map<number, MetadataRoute.Sitemap[number]>();

  try {
    await connectToDatabase();
    const dbMovies = await MovieModel.find({ isAvailable: true })
      .select("tmdbId title releaseDate updatedAt voteAverage")
      .sort({ updatedAt: -1, releaseDate: -1 })
      .skip(skip)
      .limit(CHUNK_SIZE)
      .lean();

    for (const m of dbMovies) {
      if (!m.tmdbId) continue;
      const slug = m.title ? toSlug(m.title) : "";
      movieUrlMap.set(m.tmdbId, {
        url: `${siteUrl}/movie/${m.tmdbId}${slug ? `-${slug}` : ""}`,
        lastModified: m.updatedAt ? new Date(m.updatedAt) : currentDate,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (err: any) {
    console.warn(`Sitemap chunk ${chunkId} error:`, err?.message || err);
  }

  return Array.from(movieUrlMap.values());
}

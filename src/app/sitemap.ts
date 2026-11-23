import type { MetadataRoute } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { MovieModel } from "@/models/Movie";
import { SiteSettings } from "@/models/SiteSettings";
import { tmdbService } from "@/services/tmdb.service";

export const revalidate = 3600; // Cache and revalidate sitemap once per hour

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    console.warn("Sitemap: site settings notice (using fallback URL):", e?.message || e);
  }

  const currentDate = new Date();

  // Static high-priority pages (only existing valid routes)
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  // Dynamic movie routes
  const movieUrlMap = new Map<number, MetadataRoute.Sitemap[number]>();

  // 1. Fetch available movies from MongoDB
  try {
    await connectToDatabase();
    const dbMovies = await MovieModel.find({ isAvailable: true })
      .select("tmdbId title releaseDate updatedAt voteAverage")
      .sort({ updatedAt: -1, releaseDate: -1 })
      .limit(2000)
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
    console.warn("Sitemap: DB movie catalog notice:", err?.message || err);
  }

  // 2. Supplement with high-traffic trending and popular movies from TMDB if catalog is sparse
  try {
    const [trending, popular, topRated] = await Promise.all([
      tmdbService.getTrending().catch(() => []),
      tmdbService.getPopularMovies().catch(() => []),
      tmdbService.getTopRatedMovies().catch(() => []),
    ]);

    for (const item of [...trending, ...popular, ...topRated]) {
      if (!item.id || movieUrlMap.has(item.id)) continue;
      const title = item.title || item.name || "";
      const slug = title ? toSlug(title) : "";
      const releaseDate = item.release_date || item.first_air_date;

      movieUrlMap.set(item.id, {
        url: `${siteUrl}/movie/${item.id}${slug ? `-${slug}` : ""}`,
        lastModified: releaseDate ? new Date(releaseDate) : currentDate,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (err: any) {
    console.warn("Sitemap: TMDB supplemental notice:", err?.message || err);
  }

  const movieRoutes = Array.from(movieUrlMap.values());

  return [...staticPages, ...movieRoutes];
}

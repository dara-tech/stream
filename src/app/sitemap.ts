import type { MetadataRoute } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { MovieModel } from "@/models/Movie";
import { SiteSettings } from "@/models/SiteSettings";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://moviestream.cc";

  try {
    await connectToDatabase();
    const settings = await SiteSettings.findOne().lean();
    if (settings?.seo?.siteUrl) {
      siteUrl = settings.seo.siteUrl.replace(/\/+$/, "");
    }
  } catch (e) {
    console.error("Sitemap site settings fetch error:", e);
  }

  const currentDate = new Date();

  // Static high-priority pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/movies`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/tv`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/latest`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Dynamic movie routes from MongoDB (Top available movies sorted by recent/rating)
  let movieRoutes: MetadataRoute.Sitemap = [];
  try {
    await connectToDatabase();
    const movies = await MovieModel.find({ isAvailable: true })
      .select("tmdbId title releaseDate updatedAt voteAverage")
      .sort({ updatedAt: -1, releaseDate: -1 })
      .limit(2000)
      .lean();

    movieRoutes = movies.map((m: any) => {
      const slug = m.title
        ? encodeURIComponent(
            m.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
          )
        : m.tmdbId;

      return {
        url: `${siteUrl}/movie/${m.tmdbId}${slug ? `-${slug}` : ""}`,
        lastModified: m.updatedAt ? new Date(m.updatedAt) : currentDate,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    });
  } catch (err) {
    console.error("Error generating dynamic movie sitemap:", err);
  }

  return [...staticPages, ...movieRoutes];
}

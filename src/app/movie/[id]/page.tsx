import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { tmdbService } from "@/services/tmdb.service";
import { connectToDatabase } from "@/lib/mongodb";
import { MovieModel } from "@/models/Movie";
import { SiteSettings } from "@/models/SiteSettings";
import { STREAM_SERVERS, buildStreamUrl } from "@/services/streaming.service";
import { MoviePlayerClient } from "./movie-player-client";

interface MoviePageProps {
  params: Promise<{ id: string }>;
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://moviestream.cc"
  ).replace(/\/+$/, "");
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractTmdbId(idOrSlug: string): { tmdbId: number | null; mongoId: string | null } {
  // Pattern 1: Leading numbers e.g. "1560520" or "1560520-batman-knightfall"
  const match = idOrSlug.match(/^(\d+)/);
  if (match) {
    return { tmdbId: parseInt(match[1], 10), mongoId: null };
  }
  // Pattern 2: MongoDB 24-char ObjectId
  if (/^[a-fA-F0-9]{24}$/.test(idOrSlug)) {
    return { tmdbId: null, mongoId: idOrSlug };
  }
  return { tmdbId: null, mongoId: null };
}

async function getMovieData(idOrSlug: string) {
  const { tmdbId, mongoId } = extractTmdbId(idOrSlug);

  // 1. If MongoDB ObjectId, try finding in DB first
  if (mongoId) {
    try {
      await connectToDatabase();
      const doc = await MovieModel.findById(mongoId).lean();
      if (doc) {
        if (doc.tmdbId) {
          const tmdbData = await tmdbService.getDetails(doc.tmdbId, "movie").catch(() => null);
          if (tmdbData) return tmdbData;
        }
        return {
          id: doc.tmdbId || 0,
          title: doc.title,
          overview: doc.overview,
          poster_path: doc.posterPath,
          backdrop_path: doc.backdropPath || doc.posterPath,
          release_date: doc.releaseDate ? new Date(doc.releaseDate).toISOString() : "",
          vote_average: doc.voteAverage || 0,
          vote_count: doc.voteCount || 0,
          genres: [],
        } as any;
      }
    } catch (e) {
      console.error("DB lookup error:", e);
    }
  }

  // 2. Fetch directly from TMDB
  if (tmdbId) {
    try {
      const tmdbData = await tmdbService.getDetails(tmdbId, "movie");
      if (tmdbData) return tmdbData;
    } catch {
      // Fallback: check MongoDB
      try {
        await connectToDatabase();
        const doc = await MovieModel.findOne({ tmdbId }).lean();
        if (doc) {
          return {
            id: doc.tmdbId,
            title: doc.title,
            overview: doc.overview,
            poster_path: doc.posterPath,
            backdrop_path: doc.backdropPath || doc.posterPath,
            release_date: doc.releaseDate ? new Date(doc.releaseDate).toISOString() : "",
            vote_average: doc.voteAverage || 0,
            vote_count: doc.voteCount || 0,
            genres: [],
          } as any;
        }
      } catch (e) {
        console.error("Fallback lookup error:", e);
      }
    }
  }

  return null;
}

export async function generateMetadata({ params }: MoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const movie = await getMovieData(id);
  const siteUrl = getSiteUrl();

  if (!movie) {
    return {
      title: "Movie Not Found | StreamFlix",
      description: "Watch thousands of movies and TV series online free in HD and 4K on StreamFlix.",
    };
  }

  const title = movie.title || "Watch Movie";
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : "2026";
  const slug = toSlug(title);
  const canonicalId = movie.id || id;
  const canonicalUrl = `${siteUrl}/movie/${canonicalId}${slug ? `-${slug}` : ""}`;

  const pageTitle = `Watch ${title} (${year}) Full Movie Online Free in HD | StreamFlix`;
  const description =
    movie.overview?.slice(0, 200) ||
    `Stream ${title} (${year}) full movie online for free in Ultra HD/4K with English subtitles and multiple high-speed servers. No sign up required on StreamFlix.`;

  const image = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : movie.poster_path
    ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
    : `${siteUrl}/og-image.jpg`;

  return {
    title: pageTitle,
    description,
    keywords: [
      `watch ${title} online free`,
      `stream ${title} full movie`,
      `${title} ${year} hd`,
      `${title} free streaming`,
      `${title} english subtitles`,
      "streamflix",
      "watch movies online free",
    ].join(", "),
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      siteName: "StreamFlix",
      type: "video.movie",
      images: [
        {
          url: image,
          width: 1280,
          height: 720,
          alt: `Watch ${title} (${year}) Full Movie Online Free`,
        },
      ],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      creator: "@StreamFlix",
      images: [image],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params;
  const movie = await getMovieData(id);

  if (!movie) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const title = movie.title || "Watch Movie";
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : "2026";
  const slug = toSlug(title);
  const canonicalId = movie.id || id;
  const canonicalUrl = `${siteUrl}/movie/${canonicalId}${slug ? `-${slug}` : ""}`;

  // Get default streaming server from settings
  let defaultServerId = "zxcstream";
  try {
    await connectToDatabase();
    const settings = await SiteSettings.findOne().lean();
    if (settings?.streaming?.defaultServerId) {
      defaultServerId = settings.streaming.defaultServerId;
    }
  } catch {}

  const activeServer =
    STREAM_SERVERS.find((s) => s.id === defaultServerId) || STREAM_SERVERS[0];
  const streamUrl = buildStreamUrl(activeServer, movie.id, "movie");

  const image = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : movie.poster_path
    ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
    : `${siteUrl}/og-image.jpg`;

  // Extract directors & cast for Schema.org
  const directors = movie.credits?.crew?.filter((c: any) => c.job === "Director") || [];
  const actors = movie.credits?.cast?.slice(0, 10) || [];

  // Schema.org Graph (Movie + VideoObject + BreadcrumbList)
  const schemaGraph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Movie",
        "@id": `${canonicalUrl}#movie`,
        url: canonicalUrl,
        name: title,
        description: movie.overview || `Watch ${title} full movie online free in HD on StreamFlix.`,
        image: image,
        datePublished: movie.release_date || undefined,
        ...(movie.runtime ? { duration: `PT${movie.runtime}M` } : {}),
        ...(movie.genres?.length ? { genre: movie.genres.map((g: any) => g.name) } : {}),
        ...(directors.length
          ? {
              director: directors.map((d: any) => ({
                "@type": "Person",
                name: d.name,
              })),
            }
          : {}),
        ...(actors.length
          ? {
              actor: actors.map((a: any) => ({
                "@type": "Person",
                name: a.name,
              })),
            }
          : {}),
        ...(movie.vote_count
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: movie.vote_average ? movie.vote_average.toFixed(1) : "7.0",
                ratingCount: movie.vote_count,
                bestRating: "10",
                worstRating: "1",
              },
            }
          : {}),
      },
      {
        "@type": "VideoObject",
        "@id": `${canonicalUrl}#video`,
        name: `Watch ${title} (${year}) Full Movie Online Free`,
        description:
          movie.overview ||
          `Stream ${title} full movie online in HD and 4K with English subtitles.`,
        thumbnailUrl: [image],
        uploadDate: movie.release_date
          ? new Date(movie.release_date).toISOString()
          : new Date().toISOString(),
        embedUrl: streamUrl,
        ...(movie.runtime ? { duration: `PT${movie.runtime}M` } : {}),
        potentialAction: {
          "@type": "WatchAction",
          target: canonicalUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Movies",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
      />
      <MoviePlayerClient movie={movie} defaultServerId={defaultServerId} />
    </>
  );
}

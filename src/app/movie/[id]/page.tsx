import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { tmdbService } from "@/services/tmdb.service";
import { connectToDatabase } from "@/lib/mongodb";
import { MovieModel } from "@/models/Movie";
import { SiteSettings } from "@/models/SiteSettings";
import { MoviePlayerClient } from "./movie-player-client";

interface MoviePageProps {
  params: Promise<{ id: string }>;
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
        // Fallback to doc shaped like TMDB
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

  if (!movie) {
    return {
      title: "Movie Not Found | StreamHD",
      description: "Watch thousands of movies and TV series online free in HD and 4K on StreamHD.",
    };
  }

  const title = movie.title || "Watch Movie";
  const year = movie.release_date ? ` (${new Date(movie.release_date).getFullYear()})` : "";
  const pageTitle = `${title}${year} - Watch Free Online HD | StreamHD`;
  const description = movie.overview?.slice(0, 200) || `Stream ${title} online in HD without buffering. High-speed stream servers available.`;
  const image = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "/og-image.jpg";

  return {
    title: pageTitle,
    description,
    keywords: `${title}, watch ${title} online, stream ${title} free, ${title} hd, streamhd`,
    openGraph: {
      title: pageTitle,
      description,
      url: `https://streamhd.to/movie/${id}`,
      type: "video.movie",
      images: [{ url: image, width: 1280, height: 720, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [image],
    },
    alternates: {
      canonical: `https://streamhd.to/movie/${id}`,
    },
  };
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params;
  const movie = await getMovieData(id);

  if (!movie) {
    notFound();
  }

  // Get default streaming server from settings
  let defaultServerId = "zxcstream";
  try {
    await connectToDatabase();
    const settings = await SiteSettings.findOne().lean();
    if (settings?.streaming?.defaultServerId) {
      defaultServerId = settings.streaming.defaultServerId;
    }
  } catch {}

  return <MoviePlayerClient movie={movie} defaultServerId={defaultServerId} />;
}

"use client";

import React from "react";
import Image from "next/image";
import { Movie } from "@/types/tmdb";
import { getImageUrl } from "@/config/tmdb";
import { useMovie } from "@/context/movie-context";

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  const { openModal } = useMovie();

  const title = movie.title || movie.name || "Untitled";
  const posterUrl = getImageUrl(movie.poster_path || movie.backdrop_path, "poster");
  const releaseYear = (movie.release_date || movie.first_air_date || "").slice(0, 4) || "2026";

  return (
    <div
      onClick={() => openModal(movie)}
      className="group relative flex-none w-[130px] sm:w-[160px] md:w-[185px] lg:w-[195px] cursor-pointer select-none"
    >
      {/* Minimal Sharp Vertical Poster Card */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-900 border border-white/10 shadow-md transition-all duration-200 group-hover:border-white/35 group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.85)] rounded-none">
        <Image
          src={posterUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 160px, 200px"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />

        {/* Minimal Gradient at Bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

        {/* Release Year (Top-Right of the Card) */}
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <span className="text-[11px] font-semibold tracking-wider text-neutral-200 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 border border-white/15 shadow-sm">
            {releaseYear}
          </span>
        </div>
      </div>
    </div>
  );
}

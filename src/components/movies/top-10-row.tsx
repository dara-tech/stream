"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Movie } from "@/types/tmdb";
import { getImageUrl } from "@/config/tmdb";
import { useMovie } from "@/context/movie-context";

interface Top10RowProps {
  title?: string;
  movies: Movie[];
}

export function Top10Row({ title = "Top 10 Movies Now", movies }: Top10RowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { openModal } = useMovie();

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const top10 = movies.slice(0, 10);
  if (top10.length === 0) return null;

  return (
    <section className="relative px-4 md:px-12 py-4 group">
      {/* Title matching Dribbble reference */}
      <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-4">
        {title}
      </h2>

      <div className="relative">
        {/* Left Arrow Button */}
        <button
          onClick={() => handleScroll("left")}
          aria-label="Scroll left"
          className="absolute left-0 top-0 bottom-0 z-30 w-10 sm:w-12 bg-black/85 hover:bg-black/95 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-md cursor-pointer border-r border-white/10"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Scroll Container with sharp rectangular posters */}
        <div
          ref={rowRef}
          className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none scroll-smooth pb-3 pt-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {top10.map((movie, index) => {
            const posterUrl = getImageUrl(movie.poster_path, "posterSmall");
            const rank = index + 1;
            return (
              <div
                key={`${movie.id}-${index}`}
                onClick={() => openModal(movie)}
                className="relative flex-none cursor-pointer group/card select-none"
              >
                {/* Sharp Vertical Poster (NOT rounded - matching Dribbble reference) */}
                <div className="relative w-[130px] sm:w-[160px] md:w-[185px] aspect-[2/3] overflow-hidden z-10 shadow-xl border border-white/5 group-hover/card:border-white/30 transition-all duration-200 bg-neutral-900 rounded-none">
                  <Image
                    src={posterUrl}
                    alt={movie.title || movie.name || "Top 10"}
                    fill
                    sizes="(max-width: 768px) 160px, 185px"
                    className="object-cover group-hover/card:scale-105 transition-transform duration-300"
                  />

                  {/* Gradient bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  {/* Top-Left Outlined Number (1, 2, 3...) matching Dribbble reference */}
                  <div className="absolute top-1 left-2 z-20 pointer-events-none">
                    <span
                      className="font-black text-4xl sm:text-5xl md:text-6xl leading-none select-none tracking-tighter"
                      style={{
                        WebkitTextStroke: "2px #ffffff",
                        color: "transparent",
                        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                      }}
                    >
                      {rank}
                    </span>
                  </div>

                  {/* Title overlay at bottom of poster */}
                  <div className="absolute bottom-2 left-2 right-2 z-20">
                    <p className="text-white text-xs font-bold truncate drop-shadow text-center">
                      {movie.title || movie.name}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => handleScroll("right")}
          aria-label="Scroll right"
          className="absolute right-0 top-0 bottom-0 z-30 w-10 sm:w-12 bg-black/85 hover:bg-black/95 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-md cursor-pointer border-l border-white/10"
        >
          <ChevronRight className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
    </section>
  );
}

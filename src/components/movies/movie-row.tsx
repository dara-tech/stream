"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Movie } from "@/types/tmdb";
import { MovieCard } from "./movie-card";

interface MovieRowProps {
  title: string;
  movies: Movie[];
}

export function MovieRow({ title, movies }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

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

  if (!movies || movies.length === 0) return null;

  return (
    <section className="relative px-4 md:px-12 py-3 group">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          {title}
        </h2>
        <span className="text-xs md:text-sm text-neutral-400 font-medium hover:text-white transition cursor-pointer flex items-center">
          Explore All ›
        </span>
      </div>

      {/* Row Wrapper with Side Arrow Controls (sharp edges) */}
      <div className="relative">
        {/* Left Arrow Button */}
        <button
          onClick={() => handleScroll("left")}
          aria-label="Scroll left"
          className="absolute left-0 top-0 bottom-0 z-40 w-10 sm:w-12 bg-black/85 hover:bg-black/95 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-md cursor-pointer border-r border-white/10 rounded-none shadow-xl"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Scrollable Container with minimal vertical posters */}
        <div
          ref={rowRef}
          className="flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto scrollbar-none scroll-smooth pb-3 pt-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {movies.map((movie, idx) => (
            <MovieCard key={`${movie.id}-${idx}`} movie={movie} />
          ))}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => handleScroll("right")}
          aria-label="Scroll right"
          className="absolute right-0 top-0 bottom-0 z-40 w-10 sm:w-12 bg-black/85 hover:bg-black/95 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-md cursor-pointer border-l border-white/10 rounded-none shadow-xl"
        >
          <ChevronRight className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
    </section>
  );
}

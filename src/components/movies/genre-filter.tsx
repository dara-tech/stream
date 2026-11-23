"use client";

import React from "react";
import { useMovie } from "@/context/movie-context";

const GENRES = [
  { id: null, label: "All Titles" },
  { id: 28, label: "Action" },
  { id: 12, label: "Adventure" },
  { id: 878, label: "Sci-Fi" },
  { id: 10749, label: "Romance" },
  { id: 35, label: "Comedy" },
  { id: 53, label: "Thriller" },
  { id: 27, label: "Horror" },
  { id: 99, label: "Documentaries" },
];

export function GenreFilter() {
  const { activeGenre, setActiveGenre } = useMovie();

  return (
    <div className="px-4 md:px-12 py-2 overflow-x-auto scrollbar-none flex items-center gap-2 select-none">
      {GENRES.map((g) => {
        const isActive = activeGenre === g.id;
        return (
          <button
            key={g.label}
            onClick={() => setActiveGenre(g.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              isActive
                ? "bg-white text-black shadow-lg scale-105"
                : "bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-700 border border-white/5"
            }`}
          >
            {g.label}
          </button>
        );
      })}
    </div>
  );
}

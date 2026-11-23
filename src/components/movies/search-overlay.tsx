"use client";

import React from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useMovie } from "@/context/movie-context";
import { MovieCard } from "./movie-card";

export function SearchOverlay() {
  const {
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
  } = useMovie();

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#141414]/95 backdrop-blur-md overflow-y-auto p-4 sm:p-8 animate-in fade-in duration-200">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header & Search Input */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles, actors, genres..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-full pl-12 pr-10 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition text-sm sm:text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery("");
            }}
            className="p-2 text-neutral-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Results Area */}
        <div>
          {isSearching && (
            <div className="flex items-center justify-center py-20 text-neutral-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-red-600" />
              <span>Searching TMDB...</span>
            </div>
          )}

          {!isSearching && searchQuery && searchResults.length === 0 && (
            <div className="text-center py-20 text-neutral-400">
              <p className="text-lg">No results found for &quot;{searchQuery}&quot;</p>
              <p className="text-sm mt-1 text-neutral-500">
                Try searching for a different movie, tv show, or genre.
              </p>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
                Search Results ({searchResults.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </div>
          )}

          {!searchQuery && (
            <div className="text-neutral-500 text-center py-16 text-sm">
              Type to explore millions of movies, TV shows, and anime on TMDB.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

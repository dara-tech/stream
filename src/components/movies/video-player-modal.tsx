"use client";

import React from "react";
import { X, Minimize2, Maximize2 } from "lucide-react";
import { useMovie } from "@/context/movie-context";

export function VideoPlayerModal() {
  const {
    isPlayingTrailer,
    closeTrailer,
    trailerKey,
    selectedMovie,
    isMiniPlayer,
    minimizeTrailer,
    maximizeTrailer,
  } = useMovie();

  if (!isPlayingTrailer) return null;

  const title = selectedMovie?.title || selectedMovie?.name || "Official Trailer";

  // Floating Mini-Player mode in the bottom-right corner
  if (isMiniPlayer) {
    return (
      <div className="fixed bottom-6 right-6 z-[200] w-80 md:w-96 aspect-video overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.95)] border border-white/20 bg-black animate-in slide-in-from-bottom-5 duration-300 rounded-none">
        {/* Mini Header Overlay */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-30 bg-black/70 backdrop-blur-md px-2.5 py-1">
          <p className="text-white text-xs font-semibold truncate max-w-[180px]">{title}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={maximizeTrailer}
              className="p-1 text-neutral-300 hover:text-white transition cursor-pointer"
              title="Expand Player"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={closeTrailer}
              className="p-1 text-neutral-300 hover:text-white transition cursor-pointer"
              title="Close Player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {trailerKey ? (
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        ) : null}
      </div>
    );
  }

  // Full Screen Cinema Mode (Z-index 150 ensures it covers all page elements)
  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-6 animate-in fade-in duration-200">
      {/* Top Bar with title, minimize & close */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-3">
          <span className="text-[#E50914] font-black text-2xl tracking-tighter">N</span>
          <h2 className="text-white font-bold text-lg sm:text-xl drop-shadow">{title}</h2>
          <span className="text-xs text-neutral-400 bg-white/10 px-2 py-0.5 rounded-none hidden sm:inline uppercase tracking-wider font-semibold">
            Official Trailer
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Minimize to Picture-in-Picture */}
          <button
            onClick={minimizeTrailer}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 cursor-pointer"
            title="Minimize to Picture-in-Picture"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={closeTrailer}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 cursor-pointer"
            aria-label="Close Player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Cinema Container (Sharp rectangular cut, no rounded corners) */}
      <div className="w-full max-w-6xl aspect-video overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-neutral-800 bg-black relative rounded-none">
        {trailerKey ? (
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 gap-2">
            <p>No video trailer available for this title.</p>
          </div>
        )}
      </div>
    </div>
  );
}

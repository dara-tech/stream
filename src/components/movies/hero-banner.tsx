"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { Play, Info, Volume2, VolumeX } from "lucide-react";
import { Movie } from "@/types/tmdb";
import { getImageUrl, GENRE_MAP } from "@/config/tmdb";
import { useMovie } from "@/context/movie-context";

interface HeroBannerProps {
  movies: Movie[];
}

export function HeroBanner({ movies }: HeroBannerProps) {
  const { openModal, playTrailer, playStream, isMuted, toggleMute, heroIndex, setHeroIndex } = useMovie();
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const featured = useMemo(() => {
    const seen = new Set<number | string>();
    return movies
      .filter((m) => {
        if (!m || !m.id || seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      })
      .slice(0, 5);
  }, [movies]);
  const currentMovie = featured[heroIndex] || featured[0] || null;

  useEffect(() => {
    if (!isAutoPlaying || featured.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((heroIndex + 1) % featured.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, heroIndex, featured.length, setHeroIndex]);

  const title = currentMovie?.title || currentMovie?.name || "Guarding STARS";
  const releaseYear = useMemo(() => {
    const date = currentMovie?.release_date || currentMovie?.first_air_date;
    return date ? new Date(date).getFullYear() : 2026;
  }, [currentMovie]);

  const genres = useMemo(() => {
    if (!currentMovie?.genre_ids || currentMovie.genre_ids.length === 0) return ["Action", "Adventure"];
    return currentMovie.genre_ids.slice(0, 2).map((id) => GENRE_MAP[id] || "Featured");
  }, [currentMovie]);

  if (!currentMovie) return null;

  const backdropUrl = getImageUrl(currentMovie.backdrop_path, "backdrop");

  return (
    <section
      className="relative w-full aspect-[16/9] md:aspect-[21/9] min-h-[520px] md:min-h-[640px] bg-black overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Background Image (Edge to Edge, NOT rounded) */}
      <div key={currentMovie.id} className="absolute inset-0 animate-in fade-in duration-700">
        <Image
          src={backdropUrl}
          alt={title}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center filter brightness-[0.92] contrast-[1.05]"
        />
      </div>

      {/* Ambient Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/40 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent w-full md:w-2/3" />

      {/* Top-Right Sound Mute Toggle */}
      <div className="absolute top-20 right-6 md:right-12 z-20">
        <button
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute" : "Mute"}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md hover:bg-black/90 border border-white/20 text-white flex items-center justify-center transition cursor-pointer shadow-xl"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Content Area */}
      <div className="absolute bottom-8 left-6 md:bottom-16 md:left-12 max-w-xl lg:max-w-2xl z-20 space-y-4">
        {/* Title */}
        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-none text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.95)] uppercase">
          {title}
        </h2>

        {/* Metadata Line (ACTION & ADVENTURE • 2026 • PG-13 • 1H 52M) */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-bold text-neutral-300 uppercase tracking-wider">
          <span className="text-[#0066FF] font-black">{genres.join(" & ").toUpperCase()}</span>
          <span className="text-neutral-500">•</span>
          <span>{releaseYear}</span>
          <span className="text-neutral-500">•</span>
          <span className="border border-neutral-600 px-1 py-0.2 text-[10px] rounded-none">
            PG-13
          </span>
          <span className="text-neutral-500">•</span>
          <span>1H 52M</span>
        </div>

        {/* Overview Synopsis */}
        <p className="text-xs sm:text-sm text-neutral-300 line-clamp-3 max-w-xl leading-relaxed drop-shadow">
          {currentMovie.overview}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          {/* Blue Watch Now / Play Button */}
          <button
            onClick={() => playStream(currentMovie)}
            className="bg-[#0066FF] hover:bg-[#0055DD] text-white text-xs sm:text-sm font-bold py-3 px-8 flex items-center gap-2 tracking-wider transition-colors cursor-pointer rounded-none uppercase shadow-xl"
          >
            <Play className="w-4 h-4 fill-white stroke-white" />
            <span>WATCH NOW</span>
          </button>

          {/* More Info */}
          <button
            onClick={() => openModal(currentMovie)}
            className="bg-neutral-800/80 hover:bg-neutral-700 text-white text-xs sm:text-sm font-semibold py-3 px-6 flex items-center gap-2 tracking-wider transition-colors cursor-pointer rounded-none border border-white/20 backdrop-blur-md"
          >
            <Info className="w-4 h-4" />
            <span>MORE INFO</span>
          </button>
        </div>
      </div>

      {/* Bottom-Right Hero Slide Switcher */}
      <div className="absolute bottom-8 right-6 md:bottom-16 md:right-12 z-20 flex items-center gap-2">
        {featured.map((m, idx) => (
          <button
            key={`${m.id}-${idx}`}
            onClick={() => setHeroIndex(idx)}
            className={`transition-all duration-300 cursor-pointer ${
              heroIndex === idx
                ? "w-8 h-1 bg-[#0066FF]"
                : "w-4 h-1 bg-white/40 hover:bg-white/80"
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  RefreshCw,
  Maximize2,
  Server,
  Star,
  Clock,
  Calendar,
  Share2,
  Film,
  Check,
} from "lucide-react";
import { STREAM_SERVERS, StreamServerOption, buildStreamUrl } from "@/services/streaming.service";
import { MovieDetails } from "@/types/tmdb";
import { getImageUrl } from "@/config/tmdb";

interface MoviePlayerClientProps {
  movie: MovieDetails;
  defaultServerId: string;
}

export function MoviePlayerClient({ movie, defaultServerId }: MoviePlayerClientProps) {
  const [servers, setServers] = useState<StreamServerOption[]>(STREAM_SERVERS);
  const [disabledServerIds, setDisabledServerIds] = useState<string[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>(defaultServerId || "zxcstream");
  const [reloadKey, setReloadKey] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Fetch servers configured in Admin
  useEffect(() => {
    fetch("/api/admin/streaming")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          if (data.data.disabledServerIds) {
            setDisabledServerIds(data.data.disabledServerIds);
          }
          if (Array.isArray(data.data.servers) && data.data.servers.length > 0) {
            setServers(data.data.servers);
          }
          if (data.data.defaultServerId) {
            setActiveServerId(data.data.defaultServerId);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Filter available servers
  const availableServers = servers.filter((s) => !disabledServerIds.includes(s.id));
  const currentServer = availableServers.find((s) => s.id === activeServerId) || availableServers[0] || STREAM_SERVERS[0];

  const streamUrl = buildStreamUrl(currentServer, movie.id, "movie");
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "";
  const ratingScore = movie.vote_average ? movie.vote_average.toFixed(1) : null;

  // Track activity
  useEffect(() => {
    try {
      fetch("/api/admin/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "movie_play",
          path: `/movie/${movie.id}`,
          contentType: "movie",
          contentId: String(movie.id),
          metadata: { title: movie.title, serverId: currentServer.id },
        }),
      }).catch(() => {});
    } catch {}
  }, [movie.id, currentServer.id, movie.title]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Catalog</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {movie.title}
            </span>
            {releaseYear && (
              <span className="text-xs font-mono text-neutral-400">({releaseYear})</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ratingScore && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{ratingScore}</span>
            </div>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white transition cursor-pointer"
            title="Copy share link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? "Link Copied!" : "Share"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 space-y-6">
        {/* Cinema Video Player Container */}
        <div className="space-y-2">
          <div
            ref={playerContainerRef}
            className="relative w-full aspect-video bg-black border border-white/10 overflow-hidden shadow-2xl"
          >
            <iframe
              key={`${currentServer.id}-${reloadKey}`}
              src={streamUrl}
              className="w-full h-full border-0"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            />
          </div>

          {/* Player Toolbar: Server Selectors & Actions */}
          <div className="bg-[#141414] border border-white/10 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Server Switching Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
              <div className="flex items-center gap-1 text-xs font-mono text-neutral-400 mr-1 shrink-0">
                <Server className="w-3.5 h-3.5 text-[#E50914]" />
                <span className="hidden sm:inline">Stream Server:</span>
              </div>
              {availableServers.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setActiveServerId(s.id)}
                  className={`px-3 py-1.5 text-xs font-semibold transition cursor-pointer shrink-0 ${
                    activeServerId === s.id
                      ? "bg-[#E50914] text-white shadow-md font-bold"
                      : "bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white"
                  }`}
                >
                  Server {idx + 1}: {s.name}
                </button>
              ))}
            </div>

            {/* Quick Actions: Reload & Fullscreen */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white transition cursor-pointer"
                title="Reload stream player"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>
              <button
                onClick={handleFullscreen}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white transition cursor-pointer"
                title="Toggle fullscreen player"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            </div>
          </div>
        </div>

        {/* Movie Info & Synopsis Section */}
        <div className="bg-[#141414] border border-white/10 p-5 grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left: Poster */}
          {movie.poster_path && (
            <div className="relative aspect-[2/3] w-full max-w-[200px] mx-auto md:mx-0 border border-white/10 overflow-hidden shadow-lg">
              <Image
                src={getImageUrl(movie.poster_path, "poster")}
                alt={`Watch ${movie.title}${releaseYear ? ` (${releaseYear})` : ""} Online Free in HD - StreamFlix`}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Right: Details & Synopsis */}
          <div className="md:col-span-3 space-y-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">{movie.title}</h1>
              {movie.tagline && (
                <p className="text-xs italic text-neutral-400 mt-1 font-mono">"{movie.tagline}"</p>
              )}
            </div>

            {/* Metadata Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-300">
              {releaseYear && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 border border-white/10">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{releaseYear}</span>
                </span>
              )}
              {movie.runtime && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
                </span>
              )}
              {movie.vote_average ? (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 border border-white/10 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{movie.vote_average.toFixed(1)} / 10 ({movie.vote_count?.toLocaleString()} votes)</span>
                </span>
              ) : null}
              {movie.status && (
                <span className="px-2.5 py-1 bg-neutral-900 border border-white/10 text-emerald-400 uppercase text-[10px]">
                  {movie.status}
                </span>
              )}
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-2 py-0.5 text-[11px] font-mono bg-neutral-800 text-neutral-300 border border-white/5"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Synopsis */}
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <h3 className="text-xs uppercase font-mono text-neutral-400 tracking-wider">Overview</h3>
              <p className="text-sm text-neutral-300 leading-relaxed font-sans">
                {movie.overview || "No overview available for this title."}
              </p>
            </div>
          </div>
        </div>

        {/* Similar / Recommended Movies */}
        {movie.similar && movie.similar.results && movie.similar.results.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-[#E50914]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                More Movies Like This
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {movie.similar.results.slice(0, 6).map((sim) => (
                <Link
                  key={sim.id}
                  href={`/movie/${sim.id}`}
                  className="group relative aspect-[2/3] bg-neutral-900 border border-white/10 overflow-hidden transition-all hover:scale-105 hover:border-[#E50914] shadow-md"
                >
                  {sim.poster_path ? (
                    <Image
                      src={getImageUrl(sim.poster_path, "poster")}
                      alt={sim.title}
                      fill
                      className="object-cover group-hover:opacity-90"
                      sizes="(max-width: 768px) 50vw, 16vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-neutral-500">
                      {sim.title}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                    <span className="text-xs font-bold text-white truncate">{sim.title}</span>
                    <span className="text-[10px] font-mono text-amber-400">★ {sim.vote_average?.toFixed(1)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

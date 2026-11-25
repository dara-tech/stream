"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Maximize2,
  Server,
  Play,
  Share2,
  ChevronLeft,
  ChevronRight,
  Check,
  Globe,
} from "lucide-react";
import { STREAM_SERVERS, StreamServerOption, buildStreamUrl } from "@/services/streaming.service";
import { MovieDetails, SeasonDetails } from "@/types/tmdb";

interface EpisodePlayerClientProps {
  series: MovieDetails;
  seasonDetails: SeasonDetails | null;
  seasonNumber: number;
  episodeNumber: number;
  defaultServerId: string;
}

export function EpisodePlayerClient({
  series,
  seasonDetails,
  seasonNumber,
  episodeNumber,
  defaultServerId,
}: EpisodePlayerClientProps) {
  const [servers, setServers] = useState<StreamServerOption[]>(STREAM_SERVERS);
  const [disabledServerIds, setDisabledServerIds] = useState<string[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>(defaultServerId || "zxcstream");
  const [reloadKey, setReloadKey] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);

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

  const availableServers = servers.filter((s) => !disabledServerIds.includes(s.id));
  const currentServer = availableServers.find((s) => s.id === activeServerId) || availableServers[0] || STREAM_SERVERS[0];

  const streamUrl = buildStreamUrl(currentServer, series.id, "tv", seasonNumber, episodeNumber);
  const currentEpisode = seasonDetails?.episodes?.find((ep) => ep.episode_number === episodeNumber);
  const totalEpisodes = seasonDetails?.episodes?.length || 24;

  const hasPrev = episodeNumber > 1;
  const hasNext = episodeNumber < totalEpisodes;

  // Track activity
  useEffect(() => {
    try {
      fetch("/api/admin/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "tv_play",
          path: `/series/${series.id}/season/${seasonNumber}/episode/${episodeNumber}`,
          contentType: "tv",
          contentId: String(series.id),
          metadata: {
            title: series.name || series.title,
            season: seasonNumber,
            episode: episodeNumber,
            serverId: currentServer.id,
          },
        }),
      }).catch(() => {});
    } catch {}
  }, [series.id, series.name, series.title, seasonNumber, episodeNumber, currentServer.id]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleFullscreen = () => {
    if (playerContainerRef.current) {
      if (!document.fullscreenElement) {
        playerContainerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const seriesTitle = series.name || series.title || "TV Series";

  return (
    <div className="flex-1 flex flex-col bg-[#0e0e0e] text-white">
      {/* Top Bar */}
      <div className="bg-[#141414] border-b border-white/10 px-4 md:px-12 py-3 flex items-center justify-between">
        <Link
          href={`/series/${series.id}`}
          className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-neutral-300 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Episodes</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
            <span>{copiedLink ? "Copied" : "Share"}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 md:px-12 py-6 space-y-6">
        {/* Episode Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href={`/series/${series.id}`} className="hover:text-white">{seriesTitle}</Link>
            <span>/</span>
            <span className="text-white">Season {seasonNumber} Episode {episodeNumber}</span>
          </div>

          <h1 className="text-xl md:text-3xl font-black text-white">
            {seriesTitle}: S{seasonNumber} E{episodeNumber}
            {currentEpisode?.name ? ` - "${currentEpisode.name}"` : ""}
          </h1>
        </div>

        {/* Video Player Frame */}
        <div
          ref={playerContainerRef}
          className="relative w-full aspect-video bg-black border border-white/10 shadow-2xl overflow-hidden group"
        >
          <iframe
            key={`${streamUrl}-${reloadKey}`}
            src={streamUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            title={`${seriesTitle} S${seasonNumber}E${episodeNumber}`}
          />
        </div>

        {/* Controls Bar: Prev/Next Episode + Server Switcher */}
        <div className="bg-[#141414] border border-white/10 p-4 flex flex-wrap items-center justify-between gap-4">
          {/* Prev / Next Episode Buttons */}
          <div className="flex items-center gap-2">
            {hasPrev ? (
              <Link
                href={`/series/${series.id}/season/${seasonNumber}/episode/${episodeNumber - 1}`}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-xs font-semibold text-white transition flex items-center gap-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev Episode</span>
              </Link>
            ) : (
              <span className="px-3.5 py-2 bg-neutral-900/50 border border-white/5 text-xs text-neutral-600 cursor-not-allowed">
                First Episode
              </span>
            )}

            {hasNext ? (
              <Link
                href={`/series/${series.id}/season/${seasonNumber}/episode/${episodeNumber + 1}`}
                className="px-4 py-2 bg-[#E50914] hover:bg-[#b80710] text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md shadow-red-900/40"
              >
                <span>Next Episode</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="px-3.5 py-2 bg-neutral-900/50 border border-white/5 text-xs text-neutral-600 cursor-not-allowed">
                Latest Episode
              </span>
            )}

            <button
              onClick={() => setReloadKey((k) => k + 1)}
              title="Reload Stream Player"
              className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleFullscreen}
              title="Fullscreen"
              className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white transition cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Server Switcher Strip */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1 shrink-0">
              <Server className="w-3 h-3 text-[#E50914]" />
              <span>Server:</span>
            </span>

            <div className="flex items-center gap-1.5">
              {availableServers.map((s) => {
                const isActive = s.id === currentServer.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveServerId(s.id)}
                    className={`px-2.5 py-1 text-xs font-mono font-medium transition cursor-pointer border ${
                      isActive
                        ? "bg-[#E50914] text-white border-[#E50914] font-bold"
                        : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border-white/10"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Multi-Language Audio & Subtitles Indicator Bar */}
        <div className="bg-[#111] border border-white/5 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-[#E50914]" />
            <span className="font-semibold text-neutral-300">Multi-Language Audio &amp; Subtitles:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <span className="px-2 py-0.5 bg-neutral-900 border border-white/10 text-neutral-300">🇺🇸 EN (Original)</span>
            <span className="px-2 py-0.5 bg-neutral-900 border border-white/10 text-neutral-300">🇪🇸 ES (Latino)</span>
            <span className="px-2 py-0.5 bg-neutral-900 border border-white/10 text-neutral-300">🇫🇷 FR (VF)</span>
            <span className="px-2 py-0.5 bg-neutral-900 border border-white/10 text-neutral-300">🇧🇷 PT (BR)</span>
            <span className="px-2 py-0.5 bg-neutral-900 border border-white/10 text-neutral-300">🇩🇪 DE</span>
            <span className="px-2 py-0.5 bg-neutral-900 border border-white/10 text-neutral-300">🇮🇹 IT</span>
          </div>
        </div>

        {/* Season Episode Picker Grid */}
        <div className="bg-[#141414] border border-white/10 p-5 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-[#E50914]" />
            <span>Season {seasonNumber} Episodes</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {Array.from({ length: totalEpisodes }).map((_, idx) => {
              const epNum = idx + 1;
              const isCurrent = epNum === episodeNumber;
              return (
                <Link
                  key={epNum}
                  href={`/series/${series.id}/season/${seasonNumber}/episode/${epNum}`}
                  className={`p-2 border text-center transition cursor-pointer ${
                    isCurrent
                      ? "bg-[#E50914] border-[#E50914] text-white font-bold shadow-md shadow-red-900/50"
                      : "bg-[#0e0e0e] hover:bg-white/10 border-white/5 text-neutral-300"
                  }`}
                >
                  <span className="block text-[9px] uppercase font-mono opacity-70">
                    Ep {epNum}
                  </span>
                  <span className="block text-xs font-semibold truncate">
                    Episode {epNum}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

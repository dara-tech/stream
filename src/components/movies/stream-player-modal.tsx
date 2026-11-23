"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Maximize,
  Minimize,
  RefreshCw,
  Server,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  ChevronDown,
} from "lucide-react";
import { useMovie } from "@/context/movie-context";
import {
  STREAM_SERVERS,
  StreamServerOption,
  buildStreamUrl,
} from "@/services/streaming.service";

type ShieldMode = "off" | "standard" | "strict";

export function StreamPlayerModal() {
  const {
    isPlayingStream,
    closeStream,
    selectedMovie,
    streamServerId,
    setStreamServerId,
    streamSeason,
    streamEpisode,
    setStreamEpisode,
  } = useMovie();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [shieldMode, setShieldMode] = useState<ShieldMode>("off"); // Default to Off so video player loads instantly without blank screen
  const [servers, setServers] = useState<StreamServerOption[]>(STREAM_SERVERS);
  const [disabledServerIds, setDisabledServerIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const title = selectedMovie?.title || selectedMovie?.name || "Now Streaming";
  const isTv =
    selectedMovie?.media_type === "tv" ||
    Boolean(selectedMovie?.first_air_date) ||
    Boolean(!selectedMovie?.title && selectedMovie?.name);
  const releaseYear = (
    selectedMovie?.release_date ||
    selectedMovie?.first_air_date ||
    ""
  ).slice(0, 4);

  // Fetch dynamic servers (including custom added ones) and disabled/offline state from MongoDB
  useEffect(() => {
    fetch("/api/admin/streaming")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.data?.disabledServerIds) {
            setDisabledServerIds(data.data.disabledServerIds);
          }
          if (data.data?.servers && Array.isArray(data.data.servers) && data.data.servers.length > 0) {
            setServers(data.data.servers);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Filter out offline/disabled servers
  const availableServers = servers.filter(
    (s) => !disabledServerIds.includes(s.id)
  );

  const currentServer =
    availableServers.find((s) => s.id === streamServerId) ||
    availableServers[0] ||
    STREAM_SERVERS[0];

  const streamEmbedUrl = selectedMovie
    ? buildStreamUrl(
        currentServer,
        selectedMovie.id,
        isTv ? "tv" : "movie",
        streamSeason,
        streamEpisode
      )
    : "";

  useEffect(() => {
    if (!isPlayingStream) return;
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(timer);
  }, [isPlayingStream, streamEmbedUrl, reloadKey, shieldMode]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore
    }
  };

  const handleReload = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const cycleShieldMode = () => {
    setShieldMode((prev) => {
      if (prev === "off") return "standard";
      if (prev === "standard") return "strict";
      return "off";
    });
    setReloadKey((prev) => prev + 1);
  };

  // Sandbox calculation:
  // Off: No sandbox attribute (fastest, direct playback, zero blank screen errors)
  // Standard: Anti-redirect with popups allowed for player media controls
  // Strict: Strict sandbox blocking all popups
  const sandboxProps =
    shieldMode === "off"
      ? {}
      : {
          sandbox:
            shieldMode === "standard"
              ? "allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox"
              : "allow-scripts allow-same-origin allow-forms allow-presentation",
        };

  if (!isPlayingStream || !selectedMovie) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] flex flex-col bg-black animate-in fade-in duration-200"
    >
      {/* Top Player Control Bar */}
      <div className="shrink-0 flex items-center justify-between px-3 md:px-5 py-2.5 bg-[#111111]/95 backdrop-blur-md border-b border-neutral-800 z-30 select-none">
        {/* Left: Netflix Brand & Movie Title */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[#E50914] font-black text-2xl tracking-tighter">
            N
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-sm md:text-base truncate max-w-[180px] sm:max-w-md">
                {title}
              </h2>
              {releaseYear && (
                <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
                  ({releaseYear})
                </span>
              )}
            </div>
            {isTv && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-cyan-400 font-mono">
                  Season {streamSeason} · Episode {streamEpisode}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={streamEpisode <= 1}
                    onClick={() => setStreamEpisode(Math.max(1, streamEpisode - 1))}
                    className="text-[10px] px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition cursor-pointer"
                    title="Previous Episode"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setStreamEpisode(streamEpisode + 1)}
                    className="text-[10px] px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition cursor-pointer"
                    title="Next Episode"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center / Right: Server Switcher & Controls (Icon-Only, Clean, Compact) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Server Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setServerMenuOpen(!serverMenuOpen)}
              className="w-9 h-9 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-cyan-400 hover:text-white transition cursor-pointer"
              title={`Server: ${currentServer.name} (Click to switch)`}
              aria-label="Change Streaming Server"
            >
              <Server className="w-4 h-4" />
            </button>

            {serverMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#141414] border border-neutral-700 shadow-2xl py-1 z-50">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-800 flex items-center justify-between">
                  <span>Online Servers ({availableServers.length})</span>
                  <span className="text-[9px] text-emerald-400 font-mono">Scanned Live</span>
                </div>
                {availableServers.map((server) => {
                  const isSelected = server.id === currentServer.id;
                  return (
                    <button
                      key={server.id}
                      onClick={() => {
                        setStreamServerId(server.id);
                        setServerMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? "bg-red-950/80 text-white font-bold"
                          : "text-neutral-300 hover:bg-neutral-800"
                      }`}
                    >
                      <span className="truncate">{server.name}</span>
                      <span className="text-[10px] text-neutral-500 font-mono ml-2">
                        {server.quality}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ad Shield Toggle Button (Icon Only: Off / Standard / Strict) */}
          <button
            onClick={cycleShieldMode}
            className={`w-9 h-9 flex items-center justify-center border transition cursor-pointer ${
              shieldMode === "off"
                ? "bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white"
                : shieldMode === "standard"
                ? "bg-blue-950/90 border-blue-500/80 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.25)]"
                : "bg-emerald-950/90 border-emerald-500/80 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
            }`}
            title={`Ad Shield: ${
              shieldMode === "off"
                ? "Off (Direct Play, No Ad Blocker)"
                : shieldMode === "standard"
                ? "Standard (Anti-Redirect)"
                : "Strict (Block All Popups)"
            } - Click to cycle`}
            aria-label="Ad Shield Mode"
          >
            {shieldMode === "off" ? (
              <ShieldOff className="w-4 h-4" />
            ) : shieldMode === "standard" ? (
              <ShieldAlert className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
          </button>

          {/* Reload Stream Button */}
          <button
            onClick={handleReload}
            className="w-9 h-9 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 transition cursor-pointer"
            title="Reload Video Stream"
            aria-label="Reload"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`}
            />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 transition cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label="Fullscreen"
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>

          {/* Close Player */}
          <button
            onClick={closeStream}
            className="w-9 h-9 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white transition cursor-pointer"
            title="Close Stream"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Stream Iframe Container */}
      <div className="flex-1 w-full h-full relative bg-black flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 space-y-3 pointer-events-none">
            <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-neutral-400 font-mono">
              Connecting to {currentServer.name}...
            </p>
          </div>
        )}

        <iframe
          key={`${reloadKey}-${shieldMode}-${currentServer.id}`}
          src={streamEmbedUrl}
          title={title}
          allowFullScreen
          allow="autoplay; fullscreen *; picture-in-picture *; encrypted-media *; accelerometer *; gyroscope *"
          referrerPolicy="origin"
          className="w-full h-full border-0 bg-black"
          onLoad={() => setLoading(false)}
          {...sandboxProps}
        />
      </div>
    </div>
  );
}

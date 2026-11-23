"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Play, Plus, Check, Star, ThumbsUp, ChevronDown } from "lucide-react";
import { useMovie } from "@/context/movie-context";
import { getImageUrl } from "@/config/tmdb";
import { Button } from "@/components/ui/button";
import { Episode } from "@/types/tmdb";
import { tmdbService } from "@/services/tmdb.service";

export function MovieModal() {
  const {
    isModalOpen,
    closeModal,
    selectedMovie,
    movieDetails,
    playTrailer,
    playStream,
    toggleMyList,
    isInMyList,
    toggleLike,
    isLiked,
    openModal,
  } = useMovie();

  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState<boolean>(false);

  const isTv =
    selectedMovie?.media_type === "tv" ||
    Boolean(movieDetails?.number_of_seasons) ||
    Boolean(movieDetails?.seasons?.length) ||
    Boolean(selectedMovie?.first_air_date) ||
    Boolean(!selectedMovie?.title && selectedMovie?.name);

  const availableSeasons = (movieDetails?.seasons || []).filter(
    (s) => s.episode_count > 0 || s.season_number > 0
  );

  // Set default season on modal load or when movieDetails arrives
  useEffect(() => {
    if (isTv && movieDetails?.seasons?.length) {
      const defaultSeason =
        movieDetails.seasons.find((s) => s.season_number > 0)?.season_number ??
        movieDetails.seasons[0]?.season_number ??
        1;
      setSelectedSeason(defaultSeason);
    }
  }, [isTv, movieDetails?.id, movieDetails?.seasons]);

  // Fetch episodes for selected season
  useEffect(() => {
    if (!isTv || !selectedMovie?.id) return;
    let isMounted = true;
    setLoadingEpisodes(true);

    tmdbService
      .getSeasonDetails(selectedMovie.id, selectedSeason)
      .then((data) => {
        if (isMounted) {
          setEpisodes(data?.episodes || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEpisodes([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingEpisodes(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isTv, selectedMovie?.id, selectedSeason]);

  if (!isModalOpen || !selectedMovie) return null;

  const inList = isInMyList(selectedMovie.id);
  const liked = isLiked(selectedMovie.id);
  const title = selectedMovie.title || selectedMovie.name || "Untitled";
  const backdropUrl = getImageUrl(selectedMovie.backdrop_path || selectedMovie.poster_path, "backdrop");
  const releaseYear = (selectedMovie.release_date || selectedMovie.first_air_date || "").slice(0, 4);
  const rating = selectedMovie.vote_average ? selectedMovie.vote_average.toFixed(1) : "N/A";
  const matchScore = selectedMovie.vote_average ? Math.min(99, Math.round(selectedMovie.vote_average * 10 + 10)) : 98;
  const castList = movieDetails?.credits?.cast?.slice(0, 6) || [];
  const similarList = movieDetails?.similar?.results?.filter((m) => m.poster_path || m.backdrop_path)?.slice(0, 6) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={closeModal} />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-4xl bg-[#181818] rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-neutral-800 z-10 max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/70 hover:bg-neutral-800 text-white flex items-center justify-center transition border border-white/20 cursor-pointer shadow-lg"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto custom-scrollbar flex-1">
          {/* Header Banner */}
          <div className="relative w-full aspect-[16/9] min-h-[280px] sm:min-h-[380px] bg-neutral-900">
            <Image
              src={backdropUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 900px) 100vw, 900px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-black/30" />

            {/* Banner Actions */}
            <div className="absolute bottom-6 left-6 right-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[#E50914] font-black text-2xl tracking-tighter">N</span>
                <span className="text-xs uppercase tracking-widest text-neutral-300 font-bold">
                  {isTv ? "SERIES" : "FILM"}
                </span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-extrabold text-white drop-shadow-xl">
                {title}
              </h2>

              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={() => {
                    closeModal();
                    playStream(selectedMovie, isTv ? selectedSeason : 1, 1);
                  }}
                  variant="default"
                  size="md"
                  className="gap-2 font-bold px-7 py-2.5 shadow-xl hover:scale-105 active:scale-95 bg-white text-black hover:bg-neutral-200 cursor-pointer rounded-none uppercase tracking-wide"
                >
                  <Play className="w-4 h-4 fill-black stroke-black" />
                  <span>{isTv ? `Play S${selectedSeason}:E1` : "Play"}</span>
                </Button>

                <button
                  onClick={() => playTrailer(selectedMovie)}
                  className="px-4 py-2 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/15 text-xs font-semibold tracking-wider uppercase transition cursor-pointer"
                  title="Watch Official Trailer"
                >
                  Trailer
                </button>

                <button
                  onClick={() => toggleMyList(selectedMovie)}
                  className="w-10 h-10 rounded-full bg-[#2a2a2a]/90 hover:bg-[#3a3a3a] border border-white/20 text-white flex items-center justify-center transition hover:scale-105 cursor-pointer"
                  title={inList ? "In My List" : "Add to My List"}
                >
                  {inList ? <Check className="w-5 h-5 text-emerald-400" /> : <Plus className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => toggleLike(selectedMovie.id)}
                  className={`w-10 h-10 rounded-full bg-[#2a2a2a]/90 hover:bg-[#3a3a3a] border border-white/20 flex items-center justify-center transition hover:scale-105 cursor-pointer ${
                    liked ? "text-red-500 border-red-500/50" : "text-white"
                  }`}
                  title={liked ? "Liked" : "Like"}
                >
                  <ThumbsUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Details Content */}
          <div className="p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Column: Synopsis & Meta */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-300">
                  <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md text-xs">
                    {matchScore}% Match
                  </span>
                  <span className="text-white font-medium flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {rating} / 10
                  </span>
                  <span>{releaseYear}</span>
                  {isTv ? (
                    <span>
                      {movieDetails?.number_of_seasons
                        ? `${movieDetails.number_of_seasons} Season${movieDetails.number_of_seasons > 1 ? "s" : ""}`
                        : "Series"}
                    </span>
                  ) : movieDetails?.runtime ? (
                    <span>{Math.floor(movieDetails.runtime / 60)}h {movieDetails.runtime % 60}m</span>
                  ) : null}
                  <span className="border border-neutral-600 px-1.5 py-0.5 text-xs rounded text-neutral-300 font-medium">
                    Ultra HD 4K
                  </span>
                </div>

                <p className="text-sm md:text-base text-neutral-200 leading-relaxed font-normal">
                  {selectedMovie.overview || "No overview available for this title."}
                </p>
              </div>

              {/* Right Column: Cast & Genres */}
              <div className="space-y-4 text-xs md:text-sm text-neutral-400 border-t md:border-t-0 md:border-l border-neutral-800 md:pl-6 pt-4 md:pt-0">
                <div>
                  <span className="text-neutral-500 font-medium block mb-1">Genres:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(movieDetails?.genres || []).map((g) => (
                      <span
                        key={g.id}
                        className="bg-neutral-800 text-neutral-200 text-xs px-2.5 py-1 rounded-full border border-white/5"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>

                {castList.length > 0 && (
                  <div>
                    <span className="text-neutral-500 font-medium block mb-2">Cast:</span>
                    <div className="grid grid-cols-3 gap-2">
                      {castList.map((c) => (
                        <div key={c.id} className="text-center group">
                          <div className="relative w-12 h-12 mx-auto rounded-full overflow-hidden bg-neutral-800 mb-1 border border-white/10 group-hover:border-white/30 transition">
                            {c.profile_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                                alt={c.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                                👤
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-200 truncate">{c.name}</p>
                          <p className="text-[10px] text-neutral-500 truncate">{c.character}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Episodes & Seasons Section for TV Series */}
            {isTv && (
              <div className="pt-6 border-t border-neutral-800 space-y-4">
                {/* Section Header: Title & Season Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">Episodes</h3>
                    <span className="text-xs text-neutral-400 bg-neutral-800/90 border border-white/10 px-2 py-0.5">
                      {movieDetails?.number_of_seasons
                        ? `${movieDetails.number_of_seasons} Season${movieDetails.number_of_seasons > 1 ? "s" : ""}`
                        : "Series"}
                    </span>
                  </div>

                  {/* Season Selector Dropdown */}
                  {availableSeasons.length > 0 && (
                    <div className="relative inline-block">
                      <select
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(Number(e.target.value))}
                        className="appearance-none bg-[#242424] hover:bg-[#2d2d2d] text-white text-xs sm:text-sm font-semibold pl-3.5 pr-9 py-2 border border-white/15 focus:outline-none focus:border-white/40 cursor-pointer shadow-md rounded-none transition"
                      >
                        {availableSeasons.map((s) => (
                          <option key={s.id || s.season_number} value={s.season_number} className="bg-[#181818] text-white">
                            {s.name || `Season ${s.season_number}`} {s.episode_count ? `(${s.episode_count} Episodes)` : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}
                </div>

                {/* Episodes List */}
                {loadingEpisodes ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-neutral-400 bg-neutral-900/30 border border-neutral-800/50">
                    <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs tracking-wider font-mono text-neutral-500">Loading episodes...</span>
                  </div>
                ) : episodes.length > 0 ? (
                  <div className="divide-y divide-white/5 border border-white/10 bg-[#121212]">
                    {episodes.map((ep) => {
                      const stillUrl = getImageUrl(ep.still_path || selectedMovie.backdrop_path, "backdropMedium");
                      const epTitle = ep.name || `Episode ${ep.episode_number}`;
                      const duration = ep.runtime ? `${ep.runtime}m` : null;

                      return (
                        <div
                          key={`${ep.id || ep.episode_number}-${ep.season_number}`}
                          onClick={() => {
                            closeModal();
                            playStream(selectedMovie, selectedSeason, ep.episode_number);
                          }}
                          className="p-3.5 sm:p-4 hover:bg-white/[0.04] transition-colors flex flex-col sm:flex-row items-start sm:items-center gap-4 cursor-pointer group select-none"
                        >
                          {/* Ep Number */}
                          <div className="text-neutral-400 group-hover:text-white font-bold text-base sm:text-lg w-6 shrink-0 text-center">
                            {ep.episode_number}
                          </div>

                          {/* Still Thumbnail */}
                          <div className="relative w-full sm:w-36 md:w-44 aspect-[16/9] bg-neutral-900 border border-white/10 shrink-0 overflow-hidden">
                            <Image
                              src={stillUrl}
                              alt={epTitle}
                              fill
                              sizes="(max-width: 640px) 100vw, 176px"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Center Play Button Overlay */}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-all">
                              <div className="w-8 h-8 rounded-full bg-black/70 border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#E50914] group-hover:border-transparent transition-all shadow-lg">
                                <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                              </div>
                            </div>

                            {/* Duration chip */}
                            {duration && (
                              <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-neutral-300 px-1 py-0.5 border border-white/10 font-mono">
                                {duration}
                              </div>
                            )}
                          </div>

                          {/* Episode Info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm sm:text-base font-semibold text-white group-hover:text-red-500 transition-colors truncate">
                                {epTitle}
                              </h4>
                              {ep.vote_average ? (
                                <span className="text-[11px] text-amber-400 shrink-0 font-medium">
                                  ★ {ep.vote_average.toFixed(1)}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                              {ep.overview || "No episode description provided."}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-neutral-500 bg-neutral-900/50 border border-neutral-800">
                    No episode information found for this season.
                  </div>
                )}
              </div>
            )}

            {/* Similar Titles as Minimal Posters (No Title, Only Rate & Year) */}
            {similarList.length > 0 && (
              <div className="pt-6 border-t border-neutral-800">
                <h3 className="text-lg font-bold text-white mb-4">
                  More Like This
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {similarList.map((item) => {
                    const poster = getImageUrl(item.poster_path || item.backdrop_path, "poster");
                    const year = (item.release_date || item.first_air_date || "").slice(0, 4) || "2026";
                    const rating = item.vote_average ? item.vote_average.toFixed(1) : "7.0";

                    return (
                      <div
                        key={item.id}
                        onClick={() => openModal(item)}
                        className="group cursor-pointer rounded-none overflow-hidden bg-neutral-900 border border-white/10 hover:border-white/30 shadow-md transition-all duration-200 select-none"
                      >
                        {/* Vertical Poster Aspect Ratio */}
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-950">
                          <Image
                            src={poster}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 120px, 160px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                          />
                          {/* Year at Top-Right of Card */}
                          <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
                            <span className="text-[10px] font-semibold text-neutral-200 bg-black/80 px-1.5 py-0.5 border border-white/10">
                              {year}
                            </span>
                          </div>
                        </div>

                        {/* Minimal Rating Bottom */}
                        <div className="px-2 py-1.5 flex items-center justify-between text-xs bg-neutral-900/95 border-t border-white/5">
                          <span className="text-emerald-400 font-bold tracking-tight text-[11px]">
                            ★ {rating}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

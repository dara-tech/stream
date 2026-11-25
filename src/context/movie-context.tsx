"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Movie, MovieDetails } from "@/types/tmdb";
import { tmdbService } from "@/services/tmdb.service";
import { trackActivity } from "@/utils/activityTracker";

interface MovieContextType {
  selectedMovie: Movie | null;
  movieDetails: MovieDetails | null;
  isModalOpen: boolean;
  isPlayingTrailer: boolean;
  isPlayingStream: boolean;
  streamServerId: string;
  streamSeason: number;
  streamEpisode: number;
  isMiniPlayer: boolean;
  trailerKey: string | null;
  isMuted: boolean;
  myList: Movie[];
  likedMovies: number[];
  isSearchOpen: boolean;
  searchQuery: string;
  searchResults: Movie[];
  isSearching: boolean;
  activeTab: string;
  activeGenre: number | null;
  heroIndex: number;
  openModal: (movie: Movie) => void;
  closeModal: () => void;
  playTrailer: (movie: Movie) => void;
  closeTrailer: () => void;
  playStream: (movie: Movie, season?: number, episode?: number) => void;
  closeStream: () => void;
  setStreamServerId: (id: string) => void;
  setStreamSeason: (season: number) => void;
  setStreamEpisode: (episode: number) => void;
  minimizeTrailer: () => void;
  maximizeTrailer: () => void;
  toggleMute: () => void;
  toggleMyList: (movie: Movie) => void;
  toggleLike: (id: number) => void;
  isInMyList: (id: number) => boolean;
  isLiked: (id: number) => boolean;
  setIsSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: string) => void;
  setActiveGenre: (genreId: number | null) => void;
  setHeroIndex: (index: number) => void;
}

const MovieContext = createContext<MovieContextType | undefined>(undefined);

export function MovieProvider({ children }: { children: React.ReactNode }) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isPlayingStream, setIsPlayingStream] = useState(false);
  const [streamServerId, setStreamServerId] = useState("moviepire");
  const [streamSeason, setStreamSeason] = useState(1);
  const [streamEpisode, setStreamEpisode] = useState(1);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [myList, setMyList] = useState<Movie[]>([]);
  const [likedMovies, setLikedMovies] = useState<number[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");
  const [activeGenre, setActiveGenre] = useState<number | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  // Load My List & Liked from localStorage
  useEffect(() => {
    try {
      const savedList = localStorage.getItem("stream_my_list");
      if (savedList) setMyList(JSON.parse(savedList));
      const savedLikes = localStorage.getItem("stream_liked");
      if (savedLikes) setLikedMovies(JSON.parse(savedLikes));
    } catch {
      // Ignore
    }
  }, []);

  const toggleMyList = (movie: Movie) => {
    setMyList((prev) => {
      const exists = prev.some((item) => item.id === movie.id);
      const updated = exists ? prev.filter((item) => item.id !== movie.id) : [...prev, movie];
      try {
        localStorage.setItem("stream_my_list", JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const toggleLike = (id: number) => {
    setLikedMovies((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((i) => i !== id) : [...prev, id];
      try {
        localStorage.setItem("stream_liked", JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const isInMyList = (id: number) => myList.some((item) => item.id === id);
  const isLiked = (id: number) => likedMovies.includes(id);

  const isTvShow = (movie: Movie) => {
    return (
      movie.media_type === "tv" ||
      Boolean(movie.first_air_date) ||
      (!movie.title && Boolean(movie.name)) ||
      activeTab === "Series"
    );
  };

  const openModal = async (movie: Movie) => {
    setIsSearchOpen(false);
    const isTv = isTvShow(movie);
    const initialType: "movie" | "tv" = isTv ? "tv" : "movie";
    const movieWithMedia = { ...movie, media_type: initialType };

    setSelectedMovie(movieWithMedia);
    setIsModalOpen(true);

    let details = await tmdbService.getDetails(movie.id, initialType);
    if (!details) {
      const fallbackType: "movie" | "tv" = initialType === "tv" ? "movie" : "tv";
      details = await tmdbService.getDetails(movie.id, fallbackType);
      if (details) {
        setSelectedMovie({ ...movie, media_type: fallbackType });
      }
    }
    setMovieDetails(details);

    const trailer = details?.videos?.results?.find(
      (v) => (v.type === "Trailer" || v.type === "Teaser") && v.site === "YouTube"
    );
    setTrailerKey(trailer?.key || null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMovie(null);
    setMovieDetails(null);
  };

  const playTrailer = async (movie: Movie) => {
    const isTv = isTvShow(movie);
    const initialType: "movie" | "tv" = isTv ? "tv" : "movie";
    setSelectedMovie({ ...movie, media_type: initialType });
    setIsMiniPlayer(false);
    setIsPlayingTrailer(true);

    let details = await tmdbService.getDetails(movie.id, initialType);
    if (!details) {
      const fallbackType: "movie" | "tv" = initialType === "tv" ? "movie" : "tv";
      details = await tmdbService.getDetails(movie.id, fallbackType);
    }
    const trailer = details?.videos?.results?.find(
      (v) => (v.type === "Trailer" || v.type === "Teaser") && v.site === "YouTube"
    );
    setTrailerKey(trailer?.key || "dQw4w9WgXcQ");
  };

  const closeTrailer = () => {
    setIsPlayingTrailer(false);
    setIsMiniPlayer(false);
    setTrailerKey(null);
  };

  const playStream = (movie: Movie, season = 1, episode = 1) => {
    const isTv = isTvShow(movie);
    const resolvedMovie = { ...movie, media_type: (isTv ? "tv" : "movie") as "tv" | "movie" };
    setSelectedMovie(resolvedMovie);
    setStreamSeason(season);
    setStreamEpisode(episode);
    setIsPlayingStream(true);
    setIsPlayingTrailer(false);

    // Track play event in MongoDB Atlas
    trackActivity({
      eventType: movie.media_type === "tv" ? "tv_play" : "movie_play",
      contentType: movie.media_type === "tv" ? "tvshow" : "movie",
      contentId: movie.id,
      path: `/${movie.media_type === "tv" ? "tv" : "movie"}/${movie.id}`,
      metadata: {
        title: movie.title || movie.name,
        season,
        episode,
      },
    });
  };

  const closeStream = () => {
    setIsPlayingStream(false);
  };

  const minimizeTrailer = () => setIsMiniPlayer(true);
  const maximizeTrailer = () => setIsMiniPlayer(false);
  const toggleMute = () => setIsMuted((prev) => !prev);

  // Keyboard shortcut: Cmd+K or Ctrl+K opens search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        if (isPlayingStream) closeStream();
        else if (isPlayingTrailer && !isMiniPlayer) closeTrailer();
        else if (isModalOpen) closeModal();
        else if (isSearchOpen) setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlayingStream, isPlayingTrailer, isMiniPlayer, isModalOpen, isSearchOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await tmdbService.search(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <MovieContext.Provider
      value={{
        selectedMovie,
        movieDetails,
        isModalOpen,
        isPlayingTrailer,
        isPlayingStream,
        streamServerId,
        streamSeason,
        streamEpisode,
        isMiniPlayer,
        trailerKey,
        isMuted,
        myList,
        likedMovies,
        isSearchOpen,
        searchQuery,
        searchResults,
        isSearching,
        activeTab,
        activeGenre,
        heroIndex,
        openModal,
        closeModal,
        playTrailer,
        closeTrailer,
        playStream,
        closeStream,
        setStreamServerId,
        setStreamSeason,
        setStreamEpisode,
        minimizeTrailer,
        maximizeTrailer,
        toggleMute,
        toggleMyList,
        toggleLike,
        isInMyList,
        isLiked,
        setIsSearchOpen,
        setSearchQuery,
        setActiveTab,
        setActiveGenre,
        setHeroIndex,
      }}
    >
      {children}
    </MovieContext.Provider>
  );
}

export function useMovie() {
  const context = useContext(MovieContext);
  if (!context) throw new Error("useMovie must be used within MovieProvider");
  return context;
}

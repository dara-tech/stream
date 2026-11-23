export interface Movie {
  id: number;
  title: string;
  name?: string;
  original_title?: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  media_type?: "movie" | "tv";
  genre_ids: number[];
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult?: boolean;
}

export interface Season {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episode_count: number;
  air_date?: string;
  vote_average?: number;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  episode_number: number;
  season_number: number;
  runtime?: number;
  vote_average?: number;
  air_date?: string;
}

export interface SeasonDetails {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episodes: Episode[];
  air_date?: string;
  poster_path?: string | null;
}

export interface MovieDetails extends Movie {
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: Season[];
  status?: string;
  tagline?: string;
  genres: { id: number; name: string }[];
  videos?: {
    results: Video[];
  };
  credits?: {
    cast: Cast[];
    crew: Crew[];
  };
  similar?: {
    results: Movie[];
  };
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface Crew {
  id: number;
  name: string;
  job: string;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export type CategoryKey = 
  | "trending"
  | "topRated"
  | "popularFilms"
  | "tvSeries"
  | "action"
  | "romance"
  | "comedy"
  | "horror";

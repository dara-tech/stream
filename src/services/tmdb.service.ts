import { TMDB_CONFIG } from "@/config/tmdb";
import { Movie, MovieDetails, TMDBResponse, SeasonDetails } from "@/types/tmdb";

const apiKey = TMDB_CONFIG.API_KEY;
const baseUrl = TMDB_CONFIG.BASE_URL;

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const queryParams = new URLSearchParams({
    api_key: apiKey,
    language: "en-US",
    ...params,
  });

  const url = `${baseUrl}${endpoint}?${queryParams.toString()}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 1800 }, // Fresh cache every 30 minutes
    });

    if (!res.ok) {
      throw new Error(`TMDB error: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`Failed to fetch TMDB endpoint ${endpoint}:`, error);
    throw error;
  }
}

export const tmdbService = {
  // Latest in-theaters & newly released Movies
  async getLatestMovies(): Promise<Movie[]> {
    try {
      const data = await fetchTMDB<TMDBResponse<Movie>>("/movie/now_playing", { page: "1" });
      return data.results.filter((item) => item.backdrop_path && item.title);
    } catch {
      return this.getPopularMovies();
    }
  },

  // Latest on-the-air & newly airing TV Series
  async getLatestSeries(): Promise<Movie[]> {
    try {
      const data = await fetchTMDB<TMDBResponse<Movie>>("/tv/on_the_air", { page: "1" });
      return data.results
        .map((item) => ({ ...item, media_type: "tv" as const }))
        .filter((item) => item.backdrop_path && (item.name || item.title));
    } catch {
      return this.getPopularTV();
    }
  },

  // Trending movies & shows
  async getTrending(timeWindow: "day" | "week" = "day"): Promise<Movie[]> {
    const data = await fetchTMDB<TMDBResponse<Movie>>(`/trending/all/${timeWindow}`);
    return data.results.filter((item) => item.backdrop_path && (item.title || item.name));
  },

  // Popular Movies
  async getPopularMovies(): Promise<Movie[]> {
    const data = await fetchTMDB<TMDBResponse<Movie>>("/movie/popular");
    return data.results.filter((item) => item.backdrop_path);
  },

  // Top Rated Movies
  async getTopRatedMovies(): Promise<Movie[]> {
    const data = await fetchTMDB<TMDBResponse<Movie>>("/movie/top_rated");
    return data.results.filter((item) => item.backdrop_path);
  },

  // Popular TV Series
  async getPopularTV(): Promise<Movie[]> {
    const data = await fetchTMDB<TMDBResponse<Movie>>("/tv/popular");
    return data.results
      .map((item) => ({ ...item, media_type: "tv" as const }))
      .filter((item) => item.backdrop_path);
  },

  // Movies by genre
  async getMoviesByGenre(genreId: number): Promise<Movie[]> {
    const data = await fetchTMDB<TMDBResponse<Movie>>("/discover/movie", {
      with_genres: genreId.toString(),
      sort_by: "popularity.desc",
    });
    return data.results.filter((item) => item.backdrop_path);
  },

  // Full Details including videos, credits, similar
  async getDetails(id: number, type: "movie" | "tv" = "movie"): Promise<MovieDetails | null> {
    try {
      return await fetchTMDB<MovieDetails>(`/${type}/${id}`, {
        append_to_response: "videos,credits,similar",
      });
    } catch {
      return null;
    }
  },

  // Season details including episodes list
  async getSeasonDetails(tvId: number, seasonNumber: number): Promise<SeasonDetails | null> {
    try {
      return await fetchTMDB<SeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
    } catch {
      return null;
    }
  },

  // Search
  async search(query: string): Promise<Movie[]> {
    if (!query.trim()) return [];
    try {
      const data = await fetchTMDB<TMDBResponse<Movie>>("/search/multi", {
        query: encodeURIComponent(query),
      });
      return data.results.filter((item) => item.backdrop_path || item.poster_path);
    } catch {
      return [];
    }
  },
};

export const TMDB_CONFIG = {
  API_KEY: process.env.NEXT_PUBLIC_TMDB_API_KEY || "7d9244188acb73db0a7d510e90224756",
  BASE_URL: "https://api.themoviedb.org/3",
  IMAGE_BASE_URL: "https://image.tmdb.org/t/p",
  IMAGE_SIZES: {
    backdrop: "original",
    backdropMedium: "w1280",
    poster: "w500",
    posterSmall: "w342",
    profile: "w185",
  },
} as const;

export const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10765: "Sci-Fi & Fantasy",
};

export function getImageUrl(path: string | null | undefined, size: "backdrop" | "backdropMedium" | "poster" | "posterSmall" = "backdrop") {
  if (!path) return "/placeholder-media.jpg";
  return `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.IMAGE_SIZES[size]}${path}`;
}

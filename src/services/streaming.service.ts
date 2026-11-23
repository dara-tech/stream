export interface StreamServerOption {
  id: string;
  name: string;
  baseUrl: string;
  quality: string;
  description: string;
  moviePattern?: string;
  tvPattern?: string;
  isCustom?: boolean;
}

export const STREAM_SERVERS: StreamServerOption[] = [
  {
    id: "zxcstream",
    name: "ZXCStream (Fast)",
    baseUrl: "https://zxcstream.xyz",
    quality: "1080p",
    description: "Fast modern embed player with instant autoplay",
    moviePattern: "https://zxcstream.xyz/player/movie/{id}?autoplay=1",
    tvPattern: "https://zxcstream.xyz/player/tv/{id}/{season}/{episode}?autoplay=1",
  },
  {
    id: "vidlink",
    name: "VidLink (Clean)",
    baseUrl: "https://vidlink.pro",
    quality: "1080p",
    description: "Clean UI, minimal ads player",
    moviePattern: "https://vidlink.pro/movie/{id}?autoplay=true",
    tvPattern: "https://vidlink.pro/tv/{id}/{season}/{episode}?autoplay=true",
  },
  {
    id: "moviepire",
    name: "MoviePire (HD)",
    baseUrl: "https://video.moviepire.co",
    quality: "1080p / 4K",
    description: "High-definition multi-source stream player",
    moviePattern: "https://video.moviepire.co/embed/movie/{id}?autoplay=1",
    tvPattern: "https://video.moviepire.co/embed/tv/{id}/{season}/{episode}?autoplay=1",
  },
  {
    id: "multiembed",
    name: "SuperEmbed",
    baseUrl: "https://multiembed.mov",
    quality: "1080p",
    description: "Fast stream aggregation player",
    moviePattern: "https://multiembed.mov/?video_id={id}&tmdb=1",
    tvPattern: "https://multiembed.mov/?video_id={id}&tmdb=1&s={season}&e={episode}",
  },
  {
    id: "autoembed",
    name: "AutoEmbed",
    baseUrl: "https://player.autoembed.cc",
    quality: "1080p",
    description: "Reliable multi-language stream",
    moviePattern: "https://player.autoembed.cc/embed/movie/{id}",
    tvPattern: "https://player.autoembed.cc/embed/tv/{id}/{season}/{episode}",
  },
  {
    id: "vidsrcme.ru",
    name: "VidSrc.me",
    baseUrl: "https://vidsrcme.ru",
    quality: "1080p",
    description: "Direct low-latency embed mirror",
    moviePattern: "https://vidsrcme.ru/embed/movie/{id}",
    tvPattern: "https://vidsrcme.ru/embed/tv/{id}/{season}/{episode}",
  },
  {
    id: "vsrc.su",
    name: "VSRC Node",
    baseUrl: "https://vsrc.su",
    quality: "1080p",
    description: "Ultra fast streaming node mirror",
    moviePattern: "https://vsrc.su/embed/movie/{id}",
    tvPattern: "https://vsrc.su/embed/tv/{id}/{season}/{episode}",
  },
  {
    id: "vidsrc-embed.ru",
    name: "VidSrc Embed RU",
    baseUrl: "https://vidsrc-embed.ru",
    quality: "1080p",
    description: "High-definition backup embed mirror",
    moviePattern: "https://vidsrc-embed.ru/embed/movie/{id}",
    tvPattern: "https://vidsrc-embed.ru/embed/tv/{id}/{season}/{episode}",
  },
];

export function buildStreamUrl(
  server: StreamServerOption,
  tmdbId: number,
  mediaType: "movie" | "tv" = "movie",
  season = 1,
  episode = 1
): string {
  const isTv = mediaType === "tv";

  if (isTv && server.tvPattern) {
    return server.tvPattern
      .replace(/{id}|{tmdb}/gi, String(tmdbId))
      .replace(/{season}|{s}/gi, String(season))
      .replace(/{episode}|{e}/gi, String(episode));
  }

  if (!isTv && server.moviePattern) {
    return server.moviePattern.replace(/{id}|{tmdb}/gi, String(tmdbId));
  }

  return getStreamUrl(server.id, tmdbId, mediaType, season, episode, server.baseUrl);
}

export function getStreamUrl(
  serverId: string,
  tmdbId: number,
  mediaType: "movie" | "tv" = "movie",
  season = 1,
  episode = 1,
  fallbackBaseUrl?: string
): string {
  const isTv = mediaType === "tv";

  switch (serverId) {
    case "zxcstream":
      return isTv
        ? `https://zxcstream.xyz/player/tv/${tmdbId}/${season}/${episode}?autoplay=1`
        : `https://zxcstream.xyz/player/movie/${tmdbId}?autoplay=1`;

    case "moviepire":
      return isTv
        ? `https://video.moviepire.co/embed/tv/${tmdbId}/${season}/${episode}?autoplay=1`
        : `https://video.moviepire.co/embed/movie/${tmdbId}?autoplay=1`;

    case "vidlink":
      return isTv
        ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?autoplay=true`
        : `https://vidlink.pro/movie/${tmdbId}?autoplay=true`;

    case "multiembed":
      return isTv
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`;

    case "autoembed":
      return isTv
        ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://player.autoembed.cc/embed/movie/${tmdbId}`;

    case "vidsrcme.ru":
      return isTv
        ? `https://vidsrcme.ru/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrcme.ru/embed/movie/${tmdbId}`;

    case "vsrc.su":
      return isTv
        ? `https://vsrc.su/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vsrc.su/embed/movie/${tmdbId}`;

    case "vidsrc-embed.ru":
      return isTv
        ? `https://vidsrc-embed.ru/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc-embed.ru/embed/movie/${tmdbId}`;

    default:
      if (fallbackBaseUrl) {
        const cleanBase = fallbackBaseUrl.replace(/\/+$/, "");
        return isTv
          ? `${cleanBase}/embed/tv/${tmdbId}/${season}/${episode}`
          : `${cleanBase}/embed/movie/${tmdbId}`;
      }
      return isTv
        ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?autoplay=true`
        : `https://vidlink.pro/movie/${tmdbId}?autoplay=true`;
  }
}

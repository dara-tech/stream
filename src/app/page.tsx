import { tmdbService } from "@/services/tmdb.service";
import { HomeView } from "@/components/movies/home-view";

export const revalidate = 1800; // 30-minute ISR revalidation for latest releases

export default async function HomePage() {
  // Fetch latest movies, latest series, trending, and categories in parallel
  const [
    latestMovies,
    latestSeries,
    trending,
    topRated,
    popularFilms,
    tvSeries,
    action,
    romance,
  ] = await Promise.all([
    tmdbService.getLatestMovies().catch(() => []),
    tmdbService.getLatestSeries().catch(() => []),
    tmdbService.getTrending().catch(() => []),
    tmdbService.getTopRatedMovies().catch(() => []),
    tmdbService.getPopularMovies().catch(() => []),
    tmdbService.getPopularTV().catch(() => []),
    tmdbService.getMoviesByGenre(28).catch(() => []),
    tmdbService.getMoviesByGenre(10749).catch(() => []),
  ]);

  // Combine top titles for hero carousel without duplicates
  const heroMovies = Array.from(
    new Map(
      [...latestMovies.slice(0, 5), ...trending.slice(0, 5)].map((m) => [m.id, m])
    ).values()
  ).slice(0, 5);

  return (
    <HomeView
      heroMovies={heroMovies}
      latestMovies={latestMovies}
      latestSeries={latestSeries}
      trending={trending}
      topRated={topRated}
      popularFilms={popularFilms}
      tvSeries={tvSeries}
      action={action}
      romance={romance}
    />
  );
}

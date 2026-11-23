"use client";

import React, { useEffect } from "react";
import { Movie } from "@/types/tmdb";
import { Navbar } from "@/components/layout/navbar";
import { HeroBanner } from "@/components/movies/hero-banner";
import { MovieRow } from "@/components/movies/movie-row";
import { Top10Row } from "@/components/movies/top-10-row";
import { useMovie } from "@/context/movie-context";
import { trackActivity } from "@/utils/activityTracker";

interface HomeViewProps {
  heroMovies: Movie[];
  latestMovies: Movie[];
  latestSeries: Movie[];
  trending: Movie[];
  topRated: Movie[];
  popularFilms: Movie[];
  tvSeries: Movie[];
  action: Movie[];
  romance: Movie[];
}

export function HomeView({
  heroMovies,
  latestMovies,
  latestSeries,
  trending,
  topRated,
  popularFilms,
  tvSeries,
  action,
  romance,
}: HomeViewProps) {
  const { activeTab } = useMovie();

  useEffect(() => {
    trackActivity({
      eventType: "page_view",
      path: `/${activeTab.toLowerCase().replace(/\s+/g, "-")}`,
      metadata: { tab: activeTab },
    });
  }, [activeTab]);

  let content = null;

  // If "Series" tab is selected
  if (activeTab === "Series") {
    content = (
      <div className="space-y-6 bg-[#0e0e0e] pb-16">
        <HeroBanner movies={latestSeries.length > 0 ? latestSeries : tvSeries} />
        <div className="relative -mt-10 md:-mt-16 z-20 space-y-8">
          <Top10Row title="Top 10 Shows Now" movies={tvSeries} />
          <MovieRow title="Latest TV Series" movies={latestSeries} />
          <MovieRow title="Popular TV Shows" movies={tvSeries} />
          <MovieRow title="Critically Acclaimed Series" movies={trending} />
        </div>
      </div>
    );
  } else if (activeTab === "Films") {
    content = (
      <div className="space-y-6 bg-[#0e0e0e] pb-16">
        <HeroBanner movies={latestMovies.length > 0 ? latestMovies : popularFilms} />
        <div className="relative -mt-10 md:-mt-16 z-20 space-y-8">
          <Top10Row title="Top 10 Movies Now" movies={topRated} />
          <MovieRow title="Latest Movies" movies={latestMovies} />
          <MovieRow title="Popular Movies" movies={popularFilms} />
          <MovieRow title="Action Blockbusters" movies={action} />
          <MovieRow title="Romance &amp; Drama" movies={romance} />
        </div>
      </div>
    );
  } else {
    // Default "Home" or "New & Popular"
    content = (
      <div className="space-y-6 pb-16 bg-[#0e0e0e]">
        {/* Edge-to-Edge Hero Banner */}
        <HeroBanner movies={heroMovies} />

        {/* Rows with Minimal Clean Vertical Posters */}
        <div className="relative -mt-10 md:-mt-16 z-20 space-y-8">
          <MovieRow title="Latest Movies" movies={latestMovies} />
          <Top10Row title="Top 10 Movies Now" movies={topRated} />
          <MovieRow title="Latest TV Series" movies={latestSeries} />
          <Top10Row title="Top 10 Shows Now" movies={tvSeries} />
          <MovieRow title="Popular Movies" movies={popularFilms} />
          <MovieRow title="Trending Now" movies={trending} />
          <MovieRow title="Action &amp; Adventure" movies={action} />
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="sr-only">StreamFlix - Watch Movies &amp; TV Shows Online Free in Full HD</h1>
      <Navbar />
      {content}
    </>
  );
}

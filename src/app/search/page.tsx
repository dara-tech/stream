import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { MovieCard } from "@/components/movies/movie-card";
import { tmdbService } from "@/services/tmdb.service";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "https://moviestream.cc"
).replace(/\/+$/, "");

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  const title = query
    ? `Watch "${query}" Movies & TV Series Online Free | StreamFlix`
    : "Search Movies & TV Shows Online Free | StreamFlix";
  const description = query
    ? `Stream results for "${query}" online free in HD and 4K on StreamFlix. Multiple streaming servers and no sign up required.`
    : "Search thousands of movies and TV series online for free in Ultra HD on StreamFlix.";

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/search${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/search${query ? `?q=${encodeURIComponent(query)}` : ""}`,
      siteName: "StreamFlix",
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() || "";
  const results = query ? await tmdbService.search(query).catch(() => []) : [];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: query ? `Search: ${query}` : "Search",
        item: `${siteUrl}/search${query ? `?q=${encodeURIComponent(query)}` : ""}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white flex flex-col pt-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-12 py-8 space-y-6">
        {/* Search Header */}
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {query ? `Search Results for "${query}"` : "Search Movies & TV Shows"}
          </h1>
          <form action="/search" method="GET" className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by title, director, actor or genre..."
              className="w-full bg-neutral-900 border border-neutral-700 pl-12 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-[#E50914] transition text-sm sm:text-base"
            />
          </form>
        </div>

        {/* Results */}
        {query && results.length === 0 && (
          <div className="py-16 text-center text-neutral-400">
            <p className="text-lg">No streaming titles found for &quot;{query}&quot;</p>
            <p className="text-xs text-neutral-500 mt-2">
              Try checking your spelling or searching for another movie title.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
              Found {results.length} results
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {results.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

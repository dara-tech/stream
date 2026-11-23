import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Star, Calendar, ArrowLeft } from "lucide-react";
import { tmdbService } from "@/services/tmdb.service";
import { getImageUrl } from "@/config/tmdb";
import { Navbar } from "@/components/layout/navbar";

interface YearPageProps {
  params: Promise<{ year: string }>;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://moviestream.cc"
  ).replace(/\/+$/, "");
}

const POPULAR_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2015, 2010, 2000, 1999];

export async function generateMetadata({ params }: YearPageProps): Promise<Metadata> {
  const { year: yearStr } = await params;
  const yearNum = parseInt(yearStr, 10);
  const siteUrl = getSiteUrl();

  if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2035) {
    return { title: "Year Not Found | StreamFlix" };
  }

  const title = `Best ${yearNum} Movies Watch Online Free in HD | StreamFlix`;
  const description = `Stream the highest-grossing and best ${yearNum} movie releases online for free in Ultra HD 1080p and 4K with English subtitles. No sign-up required on StreamFlix.`;
  const canonicalUrl = `${siteUrl}/year/${yearNum}`;

  return {
    title,
    description,
    keywords: [
      `best movies of ${yearNum}`,
      `watch ${yearNum} movies online free`,
      `${yearNum} full movie streaming hd`,
      `new movies ${yearNum} online free`,
      "streamflix year",
    ].join(", "),
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "StreamFlix",
      type: "website",
      images: [`${siteUrl}/og-image.jpg`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function YearPage({ params }: YearPageProps) {
  const { year: yearStr } = await params;
  const yearNum = parseInt(yearStr, 10);

  if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2035) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const movies = await tmdbService.getMoviesByYear(yearNum);

  // Schema.org Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}/year/${yearNum}#page`,
        url: `${siteUrl}/year/${yearNum}`,
        name: `Best Movies of ${yearNum}`,
        description: `Stream the top ${yearNum} movies online free in HD on StreamFlix.`,
      },
      {
        "@type": "ItemList",
        itemListElement: movies.slice(0, 20).map((m, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: m.title || m.name,
          url: `${siteUrl}/movie/${m.id}-${toSlug(m.title || m.name || "")}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Release Year", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 3, name: String(yearNum), item: `${siteUrl}/year/${yearNum}` },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white flex flex-col">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-12 pt-24 pb-16 space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-black text-white flex items-center gap-3">
                <Calendar className="w-7 h-7 text-[#E50914]" />
                <span>Best Movies of {yearNum}</span>
              </h1>
              <p className="text-xs md:text-sm text-neutral-400 mt-1">
                Top-rated and trending movies released in {yearNum}, available to stream in Full HD.
              </p>
            </div>

            <span className="text-xs font-mono text-neutral-400 bg-white/5 px-3 py-1.5 border border-white/10">
              {movies.length} Movies Available
            </span>
          </div>
        </div>

        {/* Year Fast Switcher Bar for Internal SEO Links */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {POPULAR_YEARS.map((yr) => {
            const isActive = yr === yearNum;
            return (
              <Link
                key={yr}
                href={`/year/${yr}`}
                className={`px-3.5 py-1 text-xs font-mono font-bold whitespace-nowrap border transition ${
                  isActive
                    ? "bg-[#E50914] text-white border-[#E50914]"
                    : "bg-[#141414] text-neutral-400 hover:text-white hover:bg-white/10 border-white/10"
                }`}
              >
                {yr}
              </Link>
            );
          })}
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {movies.map((m) => {
            const title = m.title || m.name || "Movie";
            const movieSlug = toSlug(title);
            const targetHref = `/movie/${m.id}${movieSlug ? `-${movieSlug}` : ""}`;

            return (
              <Link
                key={m.id}
                href={targetHref}
                className="group relative bg-[#141414] border border-white/5 hover:border-[#E50914] transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
              >
                <div className="relative aspect-[2/3] w-full bg-neutral-900 overflow-hidden">
                  <Image
                    src={getImageUrl(m.poster_path, "poster")}
                    alt={`Watch ${title} (${yearNum}) Online Free`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {m.vote_average ? (
                    <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-bold text-amber-400 flex items-center gap-1 border border-white/10">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      <span>{m.vote_average.toFixed(1)}</span>
                    </div>
                  ) : null}
                  <div className="absolute top-2 left-2 bg-[#E50914] px-1.5 py-0.5 text-[9px] font-black uppercase text-white tracking-wider">
                    {yearNum}
                  </div>
                </div>

                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <h3 className="text-xs font-semibold text-white group-hover:text-[#E50914] transition-colors line-clamp-1">
                    {title}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono mt-1">
                    <span>{yearNum}</span>
                    <span className="text-[#E50914] font-semibold">1080p</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

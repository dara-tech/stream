import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Star, Calendar, Play, Film, ArrowLeft } from "lucide-react";
import { tmdbService } from "@/services/tmdb.service";
import { getImageUrl } from "@/config/tmdb";
import { Navbar } from "@/components/layout/navbar";

interface SeriesPageProps {
  params: Promise<{ id: string }>;
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://moviestream.cc"
  ).replace(/\/+$/, "");
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractTmdbId(idOrSlug: string): number | null {
  const match = idOrSlug.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
  const { id } = await params;
  const tmdbId = extractTmdbId(id);
  const siteUrl = getSiteUrl();

  if (!tmdbId) {
    return { title: "Series Not Found | StreamFlix" };
  }

  const series = await tmdbService.getDetails(tmdbId, "tv");
  if (!series) {
    return { title: "Series Not Found | StreamFlix" };
  }

  const title = series.name || series.title || "Watch TV Series";
  const year = series.first_air_date ? new Date(series.first_air_date).getFullYear() : "";
  const slug = toSlug(title);
  const canonicalUrl = `${siteUrl}/series/${tmdbId}${slug ? `-${slug}` : ""}`;

  const pageTitle = `Watch ${title} ${year ? `(${year})` : ""} Full Episodes Online Free in HD | StreamFlix`;
  const description =
    series.overview?.slice(0, 200) ||
    `Stream all seasons and episodes of ${title} online for free in Ultra HD with English subtitles. No sign up required on StreamFlix.`;

  const image = series.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${series.backdrop_path}`
    : series.poster_path
    ? `https://image.tmdb.org/t/p/w780${series.poster_path}`
    : `${siteUrl}/og-image.jpg`;

  const multiLangKeywords = [
    // English
    `watch ${title} online free`,
    `stream ${title} all episodes`,
    `${title} season 1`,
    `${title} full series free`,
    `${title} english subtitles`,
    // Spanish
    `ver serie ${title} online gratis`,
    `ver ${title} temporadas completas español latino`,
    `${title} serie completa hd`,
    // French
    `regarder serie ${title} streaming vf gratuit`,
    `${title} tous les episodes streaming`,
    // Portuguese
    `assistir ${title} todas as temporadas dublado gratis`,
    "streamflix series",
  ];

  return {
    title: pageTitle,
    description,
    keywords: multiLangKeywords.join(", "),
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      siteName: "StreamFlix",
      type: "video.tv_show",
      images: [{ url: image, width: 1280, height: 720, alt: title }],
      locale: "en_US",
      alternateLocale: ["es_ES", "es_MX", "fr_FR", "pt_BR", "de_DE"],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [image],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { id } = await params;
  const tmdbId = extractTmdbId(id);
  if (!tmdbId) notFound();

  const series = await tmdbService.getDetails(tmdbId, "tv");
  if (!series) notFound();

  const siteUrl = getSiteUrl();
  const title = series.name || series.title || "TV Series";
  const slug = toSlug(title);
  const year = series.first_air_date ? new Date(series.first_air_date).getFullYear() : "";
  const seasons = (series as any).seasons || [];

  // Schema.org Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TVSeries",
        "@id": `${siteUrl}/series/${tmdbId}#series`,
        url: `${siteUrl}/series/${tmdbId}${slug ? `-${slug}` : ""}`,
        name: title,
        alternateName: [
          `Ver Serie ${title} Online Gratis en Español Latino`,
          `Regarder Série ${title} Streaming VF Gratuit`,
          `Assistir ${title} Série Completa Dublado Grátis`,
        ],
        inLanguage: ["en", "es", "fr", "pt", "de"],
        description: series.overview || `Watch ${title} full series online free on StreamFlix.`,
        image: series.poster_path ? `https://image.tmdb.org/t/p/w780${series.poster_path}` : `${siteUrl}/og-image.jpg`,
        startDate: series.first_air_date || undefined,
        numberOfSeasons: seasons.length || undefined,
        genre: series.genres?.map((g) => g.name) || [],
        aggregateRating: series.vote_average
          ? {
              "@type": "AggregateRating",
              ratingValue: series.vote_average.toFixed(1),
              ratingCount: series.vote_count || 1,
              bestRating: "10",
              worstRating: "1",
            }
          : undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "TV Series", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 3, name: title, item: `${siteUrl}/series/${tmdbId}${slug ? `-${slug}` : ""}` },
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

      {/* Hero Backdrop */}
      <div className="relative w-full h-[45vh] md:h-[60vh] overflow-hidden">
        {series.backdrop_path && (
          <Image
            src={getImageUrl(series.backdrop_path, "backdrop")}
            alt={title}
            fill
            priority
            className="object-cover object-center opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e] via-transparent to-transparent" />

        <div className="absolute bottom-6 md:bottom-12 left-4 md:left-12 max-w-2xl space-y-3 z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>

          <h1 className="text-2xl md:text-5xl font-black tracking-tight">{title}</h1>

          <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-neutral-300 font-medium">
            {year && (
              <span className="flex items-center gap-1 text-neutral-400">
                <Calendar className="w-3.5 h-3.5" />
                {year}
              </span>
            )}
            {series.vote_average && (
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {series.vote_average.toFixed(1)}
              </span>
            )}
            {seasons.length > 0 && (
              <span className="px-2 py-0.5 bg-white/10 text-neutral-300 text-xs font-mono">
                {seasons.length} {seasons.length === 1 ? "Season" : "Seasons"}
              </span>
            )}
            <span className="px-2 py-0.5 bg-[#E50914]/20 text-[#E50914] text-xs font-bold uppercase">
              Full HD
            </span>
          </div>

          <p className="text-xs md:text-sm text-neutral-300 line-clamp-3 leading-relaxed">
            {series.overview}
          </p>

          <div className="pt-2 flex items-center gap-3">
            <Link
              href={`/series/${tmdbId}/season/1/episode/1`}
              className="px-6 py-2.5 bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-xs md:text-sm transition flex items-center gap-2 shadow-lg shadow-red-900/40"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Watch Season 1 Episode 1</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content: Seasons & Episodes Listing */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-12 py-8 space-y-8">
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <Film className="w-5 h-5 text-[#E50914]" />
            <span>All Seasons & Episodes</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Select a season and episode to stream immediately in high definition.
          </p>
        </div>

        <div className="space-y-6">
          {seasons
            .filter((s: any) => s.season_number > 0)
            .map((s: any) => (
              <div key={s.id || s.season_number} className="bg-[#141414] border border-white/10 p-4 md:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{s.name || `Season ${s.season_number}`}</h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      {s.episode_count} Episodes {s.air_date ? `• Released ${s.air_date.slice(0, 4)}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/series/${tmdbId}/season/${s.season_number}/episode/1`}
                    className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 border border-white/10 transition flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-neutral-200" />
                    <span>Start Season {s.season_number}</span>
                  </Link>
                </div>

                {/* Episode Quick Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {Array.from({ length: s.episode_count || 1 }).map((_, idx) => {
                    const epNum = idx + 1;
                    return (
                      <Link
                        key={epNum}
                        href={`/series/${tmdbId}/season/${s.season_number}/episode/${epNum}`}
                        className="p-2.5 bg-[#0e0e0e] hover:bg-[#E50914] border border-white/5 hover:border-[#E50914] text-center transition group cursor-pointer"
                      >
                        <span className="block text-[10px] text-neutral-500 group-hover:text-white/80 font-mono uppercase">
                          Episode
                        </span>
                        <span className="block text-sm font-bold text-white group-hover:scale-105 transition-transform">
                          {epNum}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </main>
    </div>
  );
}

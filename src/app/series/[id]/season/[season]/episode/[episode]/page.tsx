import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { tmdbService } from "@/services/tmdb.service";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteSettings } from "@/models/SiteSettings";
import { STREAM_SERVERS, buildStreamUrl } from "@/services/streaming.service";
import { EpisodePlayerClient } from "./episode-player-client";
import { Navbar } from "@/components/layout/navbar";

interface EpisodePageProps {
  params: Promise<{
    id: string;
    season: string;
    episode: string;
  }>;
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://moviestream.cc"
  ).replace(/\/+$/, "");
}

function extractTmdbId(idOrSlug: string): number | null {
  const match = idOrSlug.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
  const { id, season, episode } = await params;
  const tmdbId = extractTmdbId(id);
  const seasonNum = parseInt(season, 10) || 1;
  const episodeNum = parseInt(episode, 10) || 1;
  const siteUrl = getSiteUrl();

  if (!tmdbId) {
    return { title: "Episode Not Found | StreamFlix" };
  }

  const [series, seasonDetails] = await Promise.all([
    tmdbService.getDetails(tmdbId, "tv"),
    tmdbService.getSeasonDetails(tmdbId, seasonNum),
  ]);

  if (!series) {
    return { title: "Episode Not Found | StreamFlix" };
  }

  const seriesTitle = series.name || series.title || "TV Show";
  const epInfo = seasonDetails?.episodes?.find((ep) => ep.episode_number === episodeNum);
  const epName = epInfo?.name ? ` - "${epInfo.name}"` : "";

  const pageTitle = `Watch ${seriesTitle} Season ${seasonNum} Episode ${episodeNum}${epName} Online Free in HD | StreamFlix`;
  const description =
    epInfo?.overview?.slice(0, 200) ||
    `Stream ${seriesTitle} S${seasonNum}E${episodeNum}${epName} online for free in 1080p Full HD with English subtitles. Fast servers, no sign up required on StreamFlix.`;

  const canonicalUrl = `${siteUrl}/series/${tmdbId}/season/${seasonNum}/episode/${episodeNum}`;
  const image = epInfo?.still_path
    ? `https://image.tmdb.org/t/p/w780${epInfo.still_path}`
    : series.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${series.backdrop_path}`
    : `${siteUrl}/og-image.jpg`;

  return {
    title: pageTitle,
    description,
    keywords: [
      `watch ${seriesTitle} season ${seasonNum} episode ${episodeNum}`,
      `stream ${seriesTitle} s${seasonNum}e${episodeNum} free`,
      `${seriesTitle} online free english subtitles`,
      `${seriesTitle} full episode 1080p`,
      "streamflix",
    ].join(", "),
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      siteName: "StreamFlix",
      type: "video.episode",
      images: [{ url: image, width: 1280, height: 720, alt: pageTitle }],
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

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id, season, episode } = await params;
  const tmdbId = extractTmdbId(id);
  const seasonNum = parseInt(season, 10) || 1;
  const episodeNum = parseInt(episode, 10) || 1;

  if (!tmdbId) notFound();

  const [series, seasonDetails] = await Promise.all([
    tmdbService.getDetails(tmdbId, "tv"),
    tmdbService.getSeasonDetails(tmdbId, seasonNum),
  ]);

  if (!series) notFound();

  let defaultServerId = "zxcstream";
  try {
    await connectToDatabase();
    const settings = await SiteSettings.findOne().lean();
    if (settings?.streaming?.defaultServerId) {
      defaultServerId = settings.streaming.defaultServerId;
    }
  } catch {}

  const siteUrl = getSiteUrl();
  const seriesTitle = series.name || series.title || "TV Show";
  const epInfo = seasonDetails?.episodes?.find((ep) => ep.episode_number === episodeNum);
  const epTitle = epInfo?.name || `Episode ${episodeNum}`;
  const canonicalUrl = `${siteUrl}/series/${tmdbId}/season/${seasonNum}/episode/${episodeNum}`;

  const defaultServer = STREAM_SERVERS.find((s) => s.id === defaultServerId) || STREAM_SERVERS[0];
  const embedStreamUrl = buildStreamUrl(defaultServer, tmdbId, "tv", seasonNum, episodeNum);

  // Schema.org Structured Data: TVEpisode + VideoObject + BreadcrumbList
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TVEpisode",
        "@id": `${canonicalUrl}#episode`,
        url: canonicalUrl,
        name: `${seriesTitle} S${seasonNum}E${episodeNum} - ${epTitle}`,
        description: epInfo?.overview || `Watch ${seriesTitle} season ${seasonNum} episode ${episodeNum} online free on StreamFlix.`,
        episodeNumber: episodeNum,
        seasonNumber: seasonNum,
        datePublished: epInfo?.air_date || undefined,
        partOfSeries: {
          "@type": "TVSeries",
          name: seriesTitle,
          url: `${siteUrl}/series/${tmdbId}`,
        },
        partOfSeason: {
          "@type": "TVSeason",
          seasonNumber: seasonNum,
        },
      },
      {
        "@type": "VideoObject",
        "@id": `${canonicalUrl}#video`,
        name: `Watch ${seriesTitle} Season ${seasonNum} Episode ${episodeNum}`,
        description: epInfo?.overview || `Stream ${seriesTitle} S${seasonNum}E${episodeNum} online free in HD.`,
        thumbnailUrl: epInfo?.still_path
          ? `https://image.tmdb.org/t/p/w780${epInfo.still_path}`
          : `${siteUrl}/og-image.jpg`,
        uploadDate: epInfo?.air_date ? new Date(epInfo.air_date).toISOString() : new Date().toISOString(),
        embedUrl: embedStreamUrl,
        potentialAction: {
          "@type": "WatchAction",
          target: canonicalUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: seriesTitle, item: `${siteUrl}/series/${tmdbId}` },
          { "@type": "ListItem", position: 3, name: `Season ${seasonNum}`, item: `${siteUrl}/series/${tmdbId}` },
          { "@type": "ListItem", position: 4, name: `Episode ${episodeNum}`, item: canonicalUrl },
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
      <div className="pt-16 flex-1 flex flex-col">
        <EpisodePlayerClient
          series={series}
          seasonDetails={seasonDetails}
          seasonNumber={seasonNum}
          episodeNumber={episodeNum}
          defaultServerId={defaultServerId}
        />
      </div>
    </div>
  );
}

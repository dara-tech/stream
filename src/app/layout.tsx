import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { MovieProvider } from "@/context/movie-context";
import { MovieModal } from "@/components/movies/movie-modal";
import { VideoPlayerModal } from "@/components/movies/video-player-modal";
import { StreamPlayerModal } from "@/components/movies/stream-player-modal";
import { SearchOverlay } from "@/components/movies/search-overlay";
import { AdInjector } from "@/components/ads/ad-injector";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "https://streamhd.to"
).replace(/\/+$/, "");

export const viewport: Viewport = {
  themeColor: "#E50914",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "StreamFlix - Watch TV Shows & Movies Online Free in HD",
    template: "%s | StreamFlix",
  },
  description:
    "Stream the latest movies and TV series online in HD and 4K without ads. Explore thousands of titles, stream trailers, and watch with ultra-fast servers.",
  keywords: [
    "watch movies online",
    "free streaming",
    "stream movies free",
    "watch tv shows online",
    "hd movies",
    "4k movies",
    "netflix clone",
    "streamflix",
  ],
  authors: [{ name: "StreamFlix Team" }],
  creator: "StreamFlix",
  publisher: "StreamFlix",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "StreamHD - Watch TV Shows & Movies Online Free in HD",
    description:
      "Stream the latest movies and TV series online in HD and 4K. Instant playback with multiple high-speed servers.",
    url: siteUrl,
    siteName: "StreamHD",
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "StreamFlix - Online Movie & TV Streaming",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StreamHD - Watch TV Shows & Movies Online Free in HD",
    description:
      "Stream the latest movies and TV series online in HD and 4K with multiple high-speed servers.",
    creator: "@StreamFlix",
    images: [`${siteUrl}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "StreamFlix",
    url: siteUrl,
    description: "Stream the latest movies and TV series online in HD and 4K.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0e0e0e] text-white">
        <MovieProvider>
          <main className="flex-1 w-full">{children}</main>
          <MovieModal />
          <StreamPlayerModal />
          <VideoPlayerModal />
          <SearchOverlay />
        </MovieProvider>
        <AdInjector />
      </body>
    </html>
  );
}

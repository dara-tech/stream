import React from "react";
import Link from "next/link";
import { Globe } from "lucide-react";

export function Footer() {
  const genres = [
    { name: "Action", href: "/genre/action" },
    { name: "Animation", href: "/genre/animation" },
    { name: "Comedy", href: "/genre/comedy" },
    { name: "Crime", href: "/genre/crime" },
    { name: "Horror", href: "/genre/horror" },
    { name: "Sci-Fi", href: "/genre/sci-fi" },
    { name: "Thriller", href: "/genre/thriller" },
    { name: "Romance", href: "/genre/romance" },
  ];

  const years = [2026, 2025, 2024, 2023, 2022, 2020];

  return (
    <footer className="w-full bg-[#141414] border-t border-neutral-900 text-neutral-400 text-xs px-6 md:px-16 py-12 mt-16">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* SEO Internal Link Hubs */}
        <div className="border-b border-white/5 pb-6 space-y-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-300 font-semibold block mb-2">
              Browse Movies by Genre
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {genres.map((g) => (
                <Link
                  key={g.name}
                  href={g.href}
                  className="hover:underline hover:text-white transition text-xs"
                >
                  {g.name} Movies
                </Link>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-300 font-semibold block mb-2">
              Browse by Release Year
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {years.map((yr) => (
                <Link
                  key={yr}
                  href={`/year/${yr}`}
                  className="hover:underline hover:text-white transition text-xs font-mono"
                >
                  {yr} Movies
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Language selector & Copyright */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 border border-neutral-700 px-3 py-1 text-neutral-300 text-xs">
            <Globe className="w-3.5 h-3.5" />
            <span>English (US)</span>
          </div>

          <p className="text-[11px] text-neutral-500">
            © 2026 StreamFlix, Inc. Watch Movies &amp; TV Series Online Free in Full HD.
          </p>
        </div>
      </div>
    </footer>
  );
}

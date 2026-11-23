import React from "react";
import Link from "next/link";
import { Globe } from "lucide-react";

export function Footer() {
  const links = [
    ["FAQ", "Investor Relations", "Ways to Watch", "Corporate Information", "Netflix Originals"],
    ["Help Center", "Jobs", "Terms of Use", "Contact Us"],
    ["Account", "Redeem Gift Cards", "Privacy", "Speed Test"],
    ["Media Center", "Buy Gift Cards", "Cookie Preferences", "Legal Notices"],
  ];

  return (
    <footer className="w-full bg-[#141414] border-t border-neutral-900 text-neutral-400 text-xs px-6 md:px-16 py-12 mt-16">
      <div className="max-w-6xl mx-auto space-y-6">
        <p className="hover:underline cursor-pointer">Questions? Contact us.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {links.map((col, idx) => (
            <ul key={idx} className="space-y-3">
              {col.map((item) => (
                <li key={item}>
                  <Link href="#" className="hover:underline hover:text-neutral-200 transition">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>

        {/* Language selector */}
        <div className="pt-4">
          <button className="flex items-center gap-2 border border-neutral-700 px-4 py-1.5 rounded text-neutral-300 hover:border-neutral-500 transition text-xs">
            <Globe className="w-3.5 h-3.5" />
            <span>English</span>
          </button>
        </div>

        <p className="text-[11px] text-neutral-500 pt-2">
          © 2026 StreamFlix, Inc. Powered by TMDB API. Built with Next.js &amp; Tailwind CSS.
        </p>
      </div>
    </footer>
  );
}

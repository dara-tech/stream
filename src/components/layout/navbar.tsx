"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Menu, X } from "lucide-react";
import { useMovie } from "@/context/movie-context";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", id: "Home" },
  { label: "Series", id: "Series" },
  { label: "Films", id: "Films" },
  // { label: "New & Popular", id: "New & Popular" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { activeTab, setActiveTab, setIsSearchOpen } = useMovie();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 transition-all duration-300 px-4 md:px-12 py-3.5 flex items-center justify-between",
        isScrolled
          ? "bg-[#0e0e0e]/95 backdrop-blur-md shadow-lg"
          : "bg-gradient-to-b from-black/85 via-black/40 to-transparent"
      )}
    >
      {/* Left: Netflix Logo & Nav Links */}
      <div className="flex items-center gap-6 lg:gap-8">
        <Link href="/" className="flex items-center">
          <span className="text-[#E50914] text-2xl md:text-3xl font-black tracking-tight uppercase select-none drop-shadow">
            NETFLIX
          </span>
        </Link>

        {/* Desktop Nav Items (No 'My Netflix') */}
        <nav className="hidden lg:flex items-center gap-1.5 text-sm">
          {NAV_LINKS.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full transition-all duration-200 text-[13px] font-medium whitespace-nowrap cursor-pointer",
                  isActive
                    ? "bg-[#2a2a2a] text-white shadow-sm font-semibold"
                    : "text-neutral-300 hover:text-white hover:bg-white/5"
                )}
              >
                {link.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right: Search & Admin */}
      <div className="flex items-center gap-3 md:gap-4 text-neutral-200">
        {/* Search Icon */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="p-1.5 hover:text-white transition-colors cursor-pointer"
          title="Search movies and series (Cmd+K)"
          aria-label="Search"
        >
          <Search className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Admin Link */}
        <Link
          href="/admin"
          className="text-xs bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white px-2.5 py-1 border border-white/10 transition uppercase tracking-wider font-semibold"
          title="Admin Control Panel"
        >
          Admin
        </Link>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-1.5 text-neutral-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-[#0e0e0e] border-b border-neutral-800 p-4 space-y-2">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setActiveTab(link.id);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "block w-full text-left px-4 py-2.5 rounded-none text-sm transition",
                activeTab === link.id
                  ? "bg-[#2a2a2a] text-white font-semibold"
                  : "text-neutral-300 hover:bg-white/5"
              )}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

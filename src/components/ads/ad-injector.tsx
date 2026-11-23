"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface AdsConfig {
  enabled: boolean;
  zoneId?: string;
  scriptUrl?: string;
  headerScript?: string;
}

export function AdInjector() {
  const pathname = usePathname();
  const injectedRef = useRef(false);

  const isAdminPage = Boolean(
    pathname && (pathname === "/admin" || pathname.startsWith("/admin/"))
  );

  useEffect(() => {
    // Strictly prevent running ads on any admin routes
    if (isAdminPage) return;
    if (injectedRef.current) return;

    async function initAds() {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        const ads: AdsConfig | undefined = json?.ads;

        if (!ads || ads.enabled === false) {
          return;
        }

        injectedRef.current = true;

        // 1. If custom script snippet is provided by admin
        if (ads.headerScript && ads.headerScript.trim()) {
          const wrapper = document.createElement("div");
          wrapper.innerHTML = ads.headerScript;
          const scripts = wrapper.querySelectorAll("script");

          scripts.forEach((oldScript) => {
            const newScript = document.createElement("script");
            Array.from(oldScript.attributes).forEach((attr) => {
              newScript.setAttribute(attr.name, attr.value);
            });
            newScript.textContent = oldScript.textContent;
            document.body.appendChild(newScript);
          });
          return;
        }

        // 2. Default tag script (e.g. Monetag / PropellerAds tag)
        if (ads.scriptUrl && ads.zoneId) {
          const s = document.createElement("script");
          s.dataset.zone = String(ads.zoneId);
          s.src = ads.scriptUrl;
          (document.body || document.documentElement).appendChild(s);
        }
      } catch (err) {
        console.warn("AdInjector initialization error:", err);
      }
    }

    // Delay slightly to give priority to main content hydration
    const timer = setTimeout(initAds, 500);
    return () => clearTimeout(timer);
  }, [isAdminPage]);

  if (isAdminPage) {
    return null;
  }

  return null;
}

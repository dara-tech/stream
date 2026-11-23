import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteSettings } from "@/models/SiteSettings";
import { checkAndRunAutoPost } from "@/lib/server-scheduler";

export async function GET() {
  try {
    // Traffic-driven background auto-post check (ensures serverless Vercel auto-posts fire on time)
    checkAndRunAutoPost().catch(() => {});

    await connectToDatabase();
    const settings = await SiteSettings.findOne().lean();
    return NextResponse.json(
      {
        success: true,
        logo: settings?.logo || {
          text: "STREAMFLIX",
          imageUrl: "",
          subtitle: "Ultra HD & 4K Streaming Platform",
          color: "#E50914",
        },
        ads: settings?.ads || {
          enabled: true,
          zoneId: "12330101",
          scriptUrl: "https://al5sm.com/tag.min.js",
          headerScript: "",
        },
        siteName: settings?.siteName || "StreamFlix",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch {
    return NextResponse.json({
      success: true,
      logo: {
        text: "STREAMFLIX",
        imageUrl: "",
        subtitle: "Ultra HD & 4K Streaming Platform",
        color: "#E50914",
      },
      ads: {
        enabled: true,
        zoneId: "12330101",
        scriptUrl: "https://al5sm.com/tag.min.js",
        headerScript: "",
      },
      siteName: "StreamFlix",
    });
  }
}

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteSettings } from "@/models/SiteSettings";

export async function GET() {
  try {
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
      siteName: "StreamFlix",
    });
  }
}

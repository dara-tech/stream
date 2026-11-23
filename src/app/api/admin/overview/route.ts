import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MovieModel } from "@/models/Movie";
import { UserActivity } from "@/models/UserActivity";
import { SiteSettings } from "@/models/SiteSettings";
import mongoose from "mongoose";

export async function GET() {
  try {
    await connectToDatabase();

    const db = mongoose.connection.db;
    const tvShowsCollection = db ? db.collection("tvshows") : null;

    const [
      totalMovies,
      totalTvShows,
      totalActivities,
      settings,
      recentActivities,
      eventBreakdown,
      unpostedCount,
      postedCount,
    ] = await Promise.all([
      MovieModel.countDocuments(),
      tvShowsCollection ? tvShowsCollection.countDocuments() : Promise.resolve(3475),
      UserActivity.countDocuments(),
      SiteSettings.findOne().lean(),
      UserActivity.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      UserActivity.aggregate([
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      MovieModel.countDocuments({
        $or: [{ telegramPostedAt: null }, { telegramPostedAt: { $exists: false } }],
      }),
      MovieModel.countDocuments({ telegramPostedAt: { $ne: null } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          movies: totalMovies,
          tvShows: totalTvShows,
          activities: totalActivities,
          unpostedMovies: unpostedCount,
          postedMovies: postedCount,
        },
        settings: {
          siteName: settings?.siteName || "StreamFlix",
          defaultStreamServer: settings?.streaming?.defaultServerId || "moviepire",
          telegramEnabled: Boolean(settings?.telegram?.enabled && settings?.telegram?.botToken),
          telegramChatId: settings?.telegram?.chatId || "",
        },
        eventBreakdown: eventBreakdown.map((item) => ({
          type: item._id || "unknown",
          count: item.count,
        })),
        recentActivities: recentActivities.map((act) => ({
          id: act._id,
          eventType: act.eventType,
          path: act.path || "/",
          searchTerm: act.searchTerm || null,
          device: act.device || "Unknown",
          browser: act.browser || "Unknown",
          createdAt: act.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Overview API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch overview metrics" },
      { status: 500 }
    );
  }
}

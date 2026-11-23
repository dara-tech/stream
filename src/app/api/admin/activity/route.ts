import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserActivity } from "@/models/UserActivity";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const eventType = searchParams.get("eventType");
    const userType = searchParams.get("userType");
    const timeframe = searchParams.get("timeframe") || "all";
    const search = searchParams.get("search");

    const query: Record<string, any> = {};

    // 1. Timeframe / Date Filter
    if (timeframe && timeframe !== "all") {
      let durationMs = 0;
      if (timeframe === "1h") durationMs = 60 * 60 * 1000;
      else if (timeframe === "24h") durationMs = 24 * 60 * 60 * 1000;
      else if (timeframe === "7d") durationMs = 7 * 24 * 60 * 60 * 1000;
      else if (timeframe === "30d") durationMs = 30 * 24 * 60 * 60 * 1000;

      if (durationMs > 0) {
        query.createdAt = { $gte: new Date(Date.now() - durationMs) };
      }
    }

    // 2. Event Type Filter
    if (eventType && eventType !== "all") {
      query.eventType = eventType;
    }

    // 3. Type of Viewer (User Type Filter)
    if (userType && userType !== "all") {
      if (userType === "authenticated") {
        query.userType = "authenticated";
      } else if (userType === "anonymous") {
        query.$or = [{ userType: "anonymous" }, { userType: { $exists: false } }, { userType: null }];
      }
    }

    // 4. Search Filter
    if (search && search.trim()) {
      const term = search.trim();
      const searchConditions = [
        { path: { $regex: term, $options: "i" } },
        { searchTerm: { $regex: term, $options: "i" } },
        { ipAddress: { $regex: term, $options: "i" } },
        { device: { $regex: term, $options: "i" } },
        { browser: { $regex: term, $options: "i" } },
        { sessionId: { $regex: term, $options: "i" } },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Base timeframe query for telemetry strip cards
    const timeframeOnlyQuery: Record<string, any> = {};
    if (query.createdAt) {
      timeframeOnlyQuery.createdAt = query.createdAt;
    }

    const [activities, totalCount, eventStats, authCount, anonCount] = await Promise.all([
      UserActivity.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserActivity.countDocuments(query),
      UserActivity.aggregate([
        { $match: timeframeOnlyQuery },
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
      UserActivity.countDocuments({
        ...timeframeOnlyQuery,
        userType: "authenticated",
      }),
      UserActivity.countDocuments({
        ...timeframeOnlyQuery,
        $or: [{ userType: "anonymous" }, { userType: { $exists: false } }, { userType: null }],
      }),
    ]);

    const topEvent = eventStats.length > 0 ? eventStats[0] : null;

    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      telemetry: {
        totalEvents: totalCount,
        authenticatedCount: authCount,
        anonymousCount: anonCount,
        topEventType: topEvent ? { type: topEvent._id, count: topEvent.count } : null,
        eventDistribution: eventStats.map((s) => ({ type: s._id, count: s.count })),
      },
    });
  } catch (error: any) {
    console.error("Activity API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const activity = await UserActivity.create({
      sessionId: body.sessionId || `sess_${Date.now()}`,
      userType: body.userType || "anonymous",
      eventType: body.eventType || "interaction",
      path: body.path || "/",
      searchTerm: body.searchTerm,
      contentType: body.contentType,
      contentId: body.contentId,
      device: body.device,
      browser: body.browser,
      metadata: body.metadata || {},
    });

    return NextResponse.json({ success: true, id: activity._id });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

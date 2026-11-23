import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { MovieModel } from "@/models/Movie";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search");
    const status = searchParams.get("status") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10) || 20));

    const query: Record<string, any> = {};

    // 1. Status Filter
    if (status === "available") {
      query.isAvailable = { $ne: false };
    } else if (status === "unavailable") {
      query.isAvailable = false;
    }

    // 2. Search Filter
    if (search && search.trim()) {
      const term = search.trim();
      const searchConditions: any[] = [
        { title: { $regex: term, $options: "i" } },
        { imdbId: { $regex: term, $options: "i" } },
      ];

      const num = Number(term);
      if (!isNaN(num) && num > 0) {
        searchConditions.push({ tmdbId: num });
      }

      query.$or = searchConditions;
    }

    const skip = (page - 1) * limit;

    const [movies, total] = await Promise.all([
      MovieModel.find(query)
        .sort({ createdAt: -1, releaseDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MovieModel.countDocuments(query),
    ]);

    const items = movies.map((movie: any) => ({
      id: movie._id.toString(),
      title: movie.title,
      tmdbId: movie.tmdbId ?? null,
      posterPath: movie.posterPath || "",
      streamUrl: movie.streamUrl || null,
      isAvailable: movie.isAvailable !== false,
      releaseDate: movie.releaseDate || null,
      telegramPostedAt: movie.telegramPostedAt || null,
    }));

    const totalPages = Math.ceil(total / limit) || 1;
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    };

    return NextResponse.json({
      success: true,
      items,
      pagination,
      data: {
        items,
        pagination,
      },
    });
  } catch (error: any) {
    console.error("Admin media GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch media list" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const targetId = body.id || body._id || body.movieId;

    if (!targetId || typeof targetId !== "string") {
      return NextResponse.json(
        { success: false, message: "Valid movie id is required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return NextResponse.json(
        { success: false, message: "Invalid movie ID format" },
        { status: 400 }
      );
    }

    const update: Record<string, any> = {};
    if (typeof body.isAvailable === "boolean") {
      update.isAvailable = body.isAvailable;
    }
    if (typeof body.streamUrl === "string") {
      update.streamUrl = body.streamUrl.trim();
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid fields to update (isAvailable, streamUrl)" },
        { status: 400 }
      );
    }

    const updatedMovie = await MovieModel.findByIdAndUpdate(
      targetId,
      { $set: update },
      { returnDocument: "after" }
    ).lean();

    if (!updatedMovie) {
      return NextResponse.json(
        { success: false, message: "Movie not found" },
        { status: 404 }
      );
    }

    const item = {
      id: updatedMovie._id.toString(),
      title: updatedMovie.title,
      tmdbId: updatedMovie.tmdbId ?? null,
      posterPath: updatedMovie.posterPath || "",
      streamUrl: updatedMovie.streamUrl || null,
      isAvailable: updatedMovie.isAvailable !== false,
      releaseDate: updatedMovie.releaseDate || null,
      telegramPostedAt: updatedMovie.telegramPostedAt || null,
    };

    return NextResponse.json({
      success: true,
      message: "Movie updated successfully",
      item,
      data: item,
    });
  } catch (error: any) {
    console.error("Admin media PATCH error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update movie" },
      { status: 500 }
    );
  }
}

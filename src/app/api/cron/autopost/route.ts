import { NextResponse } from "next/server";
import { checkAndRunAutoPost, startServerScheduler } from "@/lib/server-scheduler";

// Ensure background daemon is active
startServerScheduler();

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const outcome = await checkAndRunAutoPost();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...outcome,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}

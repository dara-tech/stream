import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  createSessionToken,
  setAdminSessionCookie,
  getAdminSessionCookie,
  verifySessionToken,
  clearAdminSessionCookie,
  getAdminCookieOptions,
  ADMIN_COOKIE_NAME,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, message: "Password is required" },
        { status: 400 }
      );
    }

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { success: false, message: "Invalid password" },
        { status: 401 }
      );
    }

    const token = createSessionToken();
    try {
      await setAdminSessionCookie(token);
    } catch (cookieErr) {
      // In case cookies() context doesn't support mutable cookies in test harness, fallback to response headers
      console.warn("setAdminSessionCookie warning:", cookieErr);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      ...getAdminCookieOptions(),
      value: token,
    });

    return response;
  } catch (error: any) {
    console.error("Admin auth POST error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Authentication error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const reqCookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    let token = reqCookieToken;

    if (!token) {
      try {
        token = await getAdminSessionCookie();
      } catch {
        // Fallback if cookies() context is not available
      }
    }

    const authenticated = verifySessionToken(token);
    return NextResponse.json({ authenticated });
  } catch (error: any) {
    console.error("Admin auth GET error:", error);
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE() {
  try {
    try {
      await clearAdminSessionCookie();
    } catch (cookieErr) {
      console.warn("clearAdminSessionCookie warning:", cookieErr);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete(ADMIN_COOKIE_NAME);
    return response;
  } catch (error: any) {
    console.error("Admin auth DELETE error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to clear session" },
      { status: 500 }
    );
  }
}

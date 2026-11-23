import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import {
  verifyPassword,
  createSessionToken,
  setAdminSessionCookie,
  getAdminSessionCookie,
  verifySessionToken,
  clearAdminSessionCookie,
  getAdminCookieOptions,
  getSessionPayload,
  ADMIN_COOKIE_NAME,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, message: "Password is required" },
        { status: 400 }
      );
    }

    let authUser: { username: string; role: string; email?: string } | null = null;

    // 1. If username / email is provided, check MongoDB UserModel
    if (username && typeof username === "string" && username.trim()) {
      await connectToDatabase();
      const cleanUser = username.trim().toLowerCase();

      const dbUser = await UserModel.findOne({
        $or: [
          { username: cleanUser },
          { email: cleanUser },
        ],
      });

      if (dbUser) {
        if (!dbUser.isActive) {
          return NextResponse.json(
            { success: false, message: "Account is disabled. Contact super administrator." },
            { status: 403 }
          );
        }

        const match = await bcrypt.compare(password, dbUser.password);
        if (match) {
          if (dbUser.role !== "admin" && dbUser.role !== "super_admin") {
            return NextResponse.json(
              { success: false, message: "Access denied: Administrator privileges required." },
              { status: 403 }
            );
          }

          // Update lastLogin
          dbUser.lastLogin = new Date();
          dbUser.loginCount = (dbUser.loginCount || 0) + 1;
          await dbUser.save();

          authUser = {
            username: dbUser.username,
            role: dbUser.role,
            email: dbUser.email,
          };
        }
      }
    }

    // 2. If not authenticated via DB user, check master password
    if (!authUser && verifyPassword(password)) {
      authUser = {
        username: "superadmin",
        role: "super_admin",
        email: "superadmin@streamflix.cc",
      };
    }

    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = createSessionToken(authUser);
    try {
      await setAdminSessionCookie(token);
    } catch (cookieErr) {
      console.warn("setAdminSessionCookie warning:", cookieErr);
    }

    const response = NextResponse.json({
      success: true,
      user: authUser,
    });
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
    const user = authenticated ? getSessionPayload(token) : null;

    return NextResponse.json({ authenticated, user });
  } catch (error: any) {
    console.error("Admin auth GET error:", error);
    return NextResponse.json({ authenticated: false, user: null });
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

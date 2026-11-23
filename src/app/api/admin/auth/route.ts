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

    await connectToDatabase();

    // 1. If username / email is provided, check MongoDB UserModel (case-insensitive)
    if (username && typeof username === "string" && username.trim()) {
      const cleanUser = username.trim();
      const escaped = cleanUser.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const userRegex = new RegExp(`^${escaped}$`, "i");

      const dbUser = await UserModel.findOne({
        $or: [
          { username: { $regex: userRegex } },
          { email: { $regex: userRegex } },
        ],
      });

      if (dbUser) {
        if (!dbUser.isActive) {
          return NextResponse.json(
            { success: false, message: "Account is disabled." },
            { status: 403 }
          );
        }

        const isBcryptMatch = dbUser.password ? await bcrypt.compare(password, dbUser.password) : false;
        const isMasterMatch = verifyPassword(password);

        if (isBcryptMatch || isMasterMatch) {
          if (dbUser.role !== "admin" && dbUser.role !== "super_admin") {
            return NextResponse.json(
              { success: false, message: "Access denied: insufficient permissions." },
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

    // 2. If no username specified, check if password matches any admin user in DB
    if (!authUser && (!username || !username.trim())) {
      const adminUsers = await UserModel.find({
        role: { $in: ["admin", "super_admin"] },
        isActive: true,
      });

      for (const u of adminUsers) {
        if (u.password && (await bcrypt.compare(password, u.password))) {
          authUser = {
            username: u.username,
            role: u.role,
            email: u.email,
          };
          u.lastLogin = new Date();
          u.loginCount = (u.loginCount || 0) + 1;
          await u.save();
          break;
        }
      }
    }

    // 3. Fallback: check master passwords (Admin@2026!, admin123, env)
    if (!authUser && verifyPassword(password)) {
      authUser = {
        username: "admin",
        role: "super_admin",
        email: "admin@streamflix.cc",
      };
    }

    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials." },
        { status: 401 }
      );
    }

    const token = createSessionToken(authUser);
    const proto = req.headers.get("x-forwarded-proto") || (req.url.startsWith("https") ? "https" : "http");
    const isHttps = proto === "https";

    try {
      await setAdminSessionCookie(token, isHttps);
    } catch (cookieErr) {
      console.warn("setAdminSessionCookie warning:", cookieErr);
    }

    const response = NextResponse.json({
      success: true,
      user: authUser,
    });
    response.cookies.set({
      ...getAdminCookieOptions(isHttps),
      value: token,
    });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

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

    const response = NextResponse.json({ authenticated, user });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  } catch (error: any) {
    console.error("Admin auth GET error:", error);
    return NextResponse.json({ authenticated: false, user: null }, { headers: { "Cache-Control": "no-store" } });
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

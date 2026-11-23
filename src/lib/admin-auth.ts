import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "admin_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

const DEFAULT_SECRET = "streamflix_admin_session_secret_key_2026";
const DEFAULT_PASSWORD = "admin123";

function getAdminSecret(): string {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || DEFAULT_SECRET;
}

function getExpectedPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

/**
 * Verify admin password using constant-time comparison
 */
export function verifyPassword(password: string): boolean {
  if (typeof password !== "string") return false;

  const expected = getExpectedPassword();
  const passwordBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);

  if (passwordBuffer.length !== expectedBuffer.length) {
    // Perform dummy timingSafeEqual to mitigate timing attacks
    crypto.timingSafeEqual(passwordBuffer, passwordBuffer);
    return false;
  }

  return crypto.timingSafeEqual(passwordBuffer, expectedBuffer);
}

/**
 * Generate a cryptographically signed session token
 */
export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = JSON.stringify({
    role: "admin",
    exp: expiresAt,
    nonce: crypto.randomBytes(16).toString("hex"),
  });

  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getAdminSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

/**
 * Verify session token signature and expiration
 */
export function verifySessionToken(token?: string | null): boolean {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [encodedPayload, signature] = parts;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", getAdminSecret())
      .update(encodedPayload)
      .digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }

    const payloadStr = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadStr);

    if (payload.role !== "admin") return false;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Cookie options helper for admin session
 */
export function getAdminCookieOptions() {
  return {
    name: ADMIN_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

/**
 * App Router cookie helpers using cookies() from next/headers
 */
export async function getAdminSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value;
}

export async function setAdminSessionCookie(token?: string): Promise<string> {
  const sessionToken = token || createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return sessionToken;
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = await getAdminSessionCookie();
  return verifySessionToken(token);
}

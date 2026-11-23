"use client";

export type ActivityEventType =
  | "page_view"
  | "search"
  | "movie_play"
  | "tv_play"
  | "interaction"
  | "filter";

export interface ActivityPayload {
  eventType: ActivityEventType;
  path?: string;
  searchTerm?: string;
  contentType?: "movie" | "tvshow";
  contentId?: string | number;
  metadata?: Record<string, any>;
}

const SESSION_KEY = "streamflix_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "server_session";
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function detectDeviceAndBrowser(): { device: string; browser: string } {
  if (typeof window === "undefined") return { device: "desktop", browser: "server" };

  const ua = navigator.userAgent;
  let device = "Desktop";
  if (/mobile/i.test(ua)) device = "Mobile";
  else if (/tablet|ipad/i.test(ua)) device = "Tablet";

  let browser = "Chrome";
  if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/edg/i.test(ua)) browser = "Edge";
  else if (/opera|opr/i.test(ua)) browser = "Opera";

  return { device, browser };
}

export async function trackActivity(payload: ActivityPayload): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const { device, browser } = detectDeviceAndBrowser();
    const sessionId = getSessionId();

    const body = {
      sessionId,
      eventType: payload.eventType,
      path: payload.path || window.location.pathname,
      searchTerm: payload.searchTerm,
      contentType: payload.contentType,
      contentId: payload.contentId,
      device,
      browser,
      metadata: payload.metadata || {},
    };

    fetch("/api/admin/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // Non-blocking silent catch
    });
  } catch {
    // Non-blocking
  }
}

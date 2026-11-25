export const INDEXNOW_KEY = "9337a4c87e01a8f359a80dd4d29dbc09";

export async function submitToIndexNow(
  urls: string[],
  siteUrl = "https://www.streamhd.to"
): Promise<{ success: boolean; status: number; message?: string }> {
  try {
    const cleanUrl = siteUrl.replace(/\/+$/, "");
    const host = cleanUrl.replace(/^https?:\/\//, "");

    const payload = {
      host,
      key: INDEXNOW_KEY,
      keyLocation: `${cleanUrl}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    };

    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    return {
      success: res.ok || res.status === 200 || res.status === 202,
      status: res.status,
      message: res.statusText || "Submitted to IndexNow",
    };
  } catch (e: any) {
    return { success: false, status: 500, message: e.message };
  }
}

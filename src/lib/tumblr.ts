import crypto from "crypto";
import https from "https";
import querystring from "querystring";

export interface TumblrConfig {
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
  blogIdentifier: string;
  postState?: "draft" | "queue" | "published";
}

function percentEncode(str: string | number): string {
  return encodeURIComponent(String(str)).replace(
    /[!*\'()]/g,
    (x) => "%" + x.charCodeAt(0).toString(16).toUpperCase()
  );
}

export function requestTumblrOAuth<T = any>(
  method: "GET" | "POST",
  endpointUrl: string,
  config: TumblrConfig,
  bodyParams: Record<string, any> = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: config.consumerKey,
      oauth_nonce: crypto.randomBytes(16).toString("hex"),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: config.token,
      oauth_version: "1.0",
    };

    const isPost = method === "POST";
    const allParams = isPost ? { ...oauthParams, ...bodyParams } : { ...oauthParams };
    const sortedKeys = Object.keys(allParams).sort();
    const paramString = sortedKeys
      .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
      .join("&");

    const baseString = `${method.toUpperCase()}&${percentEncode(endpointUrl)}&${percentEncode(
      paramString
    )}`;
    const signingKey = `${percentEncode(config.consumerSecret)}&${percentEncode(
      config.tokenSecret
    )}`;

    const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
    oauthParams.oauth_signature = signature;

    const authHeader =
      "OAuth " +
      Object.keys(oauthParams)
        .sort()
        .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
        .join(", ");

    const postData = isPost ? querystring.stringify(bodyParams) : "";
    const parsedUrl = new URL(endpointUrl);

    const headers: Record<string, string | number> = {
      Authorization: authHeader,
      "User-Agent": "StreamFlix/1.0.0",
    };

    if (isPost) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      headers["Content-Length"] = Buffer.byteLength(postData);
    }

    const reqOptions: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers,
    };

    const req = https.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            const msg = json.meta?.msg || json.errors?.[0]?.message || `HTTP ${res.statusCode}`;
            reject(new Error(msg));
          }
        } catch {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data as any);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        }
      });
    });

    req.on("error", reject);
    if (isPost && postData) {
      req.write(postData);
    }
    req.end();
  });
}

export async function testTumblrAuth(config: TumblrConfig): Promise<{ success: boolean; username?: string; message: string }> {
  try {
    const res = await requestTumblrOAuth(
      "GET",
      "https://api.tumblr.com/v2/user/info",
      config
    );
    const user = res?.response?.user;
    if (user) {
      return {
        success: true,
        username: user.name,
        message: `Tumblr authenticated as @${user.name} (${user.blogs?.length || 0} blogs)`,
      };
    }
    return { success: false, message: "No user object returned from Tumblr" };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to authenticate with Tumblr" };
  }
}

export async function postMovieToTumblr(
  config: TumblrConfig,
  movie: {
    title: string;
    overview: string;
    year?: string | number;
    rating?: string;
    posterUrl: string;
    streamLink: string;
  }
): Promise<{ success: boolean; message: string; postId?: string }> {
  try {
    const cleanBlog = config.blogIdentifier.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const endpoint = `https://api.tumblr.com/v2/blog/${cleanBlog}/post`;

    const postState = config.postState || "published";

    const imageHtml = movie.posterUrl
      ? `<p><img src="${movie.posterUrl}" alt="${movie.title}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);" /></p>`
      : "";

    const htmlBody = `
      ${imageHtml}
      ${movie.rating ? `<p>⭐ <strong>Rating:</strong> ${movie.rating}</p>` : ""}
      <p>${movie.overview}</p>
      <p>🍿 <a href="${movie.streamLink}" target="_blank"><strong>Watch Full Movie Online in HD on StreamHD</strong></a></p>
    `.trim();

    const postParams: Record<string, any> = {
      type: "text",
      title: `🎬 ${movie.title} ${movie.year ? `(${movie.year})` : ""} - Watch Online Free`,
      body: htmlBody,
      tags: "movies, streaming, streamhd, cinema, watch online, hd",
      state: postState,
    };

    const res = await requestTumblrOAuth("POST", endpoint, config, postParams);
    const id = res?.response?.id_string || res?.response?.id;

    return {
      success: true,
      message:
        postState === "draft"
          ? `Saved to Tumblr Drafts (@${cleanBlog})`
          : postState === "queue"
          ? `Added to Tumblr Queue (@${cleanBlog})`
          : `Published Live to Tumblr (@${cleanBlog})`,
      postId: String(id || ""),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to post to Tumblr",
    };
  }
}

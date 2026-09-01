const ALLOWED_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "instagr.am",
  "www.instagr.am",

  "tiktok.com",
  "www.tiktok.com",

  "facebook.com",
  "www.facebook.com",
  "fb.watch",
  "www.fb.watch",

  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "www.youtu.be"
]);

function sendJSON(res, status, data) {
  res.status(status);

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  return res.end(JSON.stringify(data));
}

function getPlatform(hostname) {
  const host = hostname.toLowerCase();

  if (
    host === "instagram.com" ||
    host === "www.instagram.com" ||
    host === "instagr.am" ||
    host === "www.instagr.am"
  ) {
    return "instagram";
  }

  if (
    host === "tiktok.com" ||
    host === "www.tiktok.com"
  ) {
    return "tiktok";
  }

  if (
    host === "facebook.com" ||
    host === "www.facebook.com" ||
    host === "fb.watch" ||
    host === "www.fb.watch"
  ) {
    return "facebook";
  }

  if (
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "youtu.be" ||
    host === "www.youtu.be"
  ) {
    return "youtube";
  }

  return null;
}

function validateURL(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }

  if (
    parsed.protocol !== "https:" &&
    parsed.protocol !== "http:"
  ) {
    return null;
  }

  const platform = getPlatform(parsed.hostname);

  if (!platform) {
    return null;
  }

  return {
    url: parsed.toString(),
    platform
  };
}

function decodeHTML(value) {
  if (!value) {
    return null;
  }

  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),

    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`,
      "i"
    ),

    new RegExp(
      `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),

    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`,
      "i"
    )
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match && match[1]) {
      return decodeHTML(match[1]);
    }
  }

  return null;
}

function extractMetadata(html) {
  const title =
    extractMeta(html, "og:title") ||
    extractMeta(html, "twitter:title") ||
    extractMeta(html, "title");

  const description =
    extractMeta(html, "og:description") ||
    extractMeta(html, "twitter:description") ||
    extractMeta(html, "description");

  const image =
    extractMeta(html, "og:image") ||
    extractMeta(html, "og:image:url") ||
    extractMeta(html, "twitter:image");

  const video =
    extractMeta(html, "og:video:secure_url") ||
    extractMeta(html, "og:video:url") ||
    extractMeta(html, "og:video");

  return {
    title,
    description,
    image,
    video
  };
}

function getYouTubeId(url) {
  try {
    const parsed = new URL(url);

    if (
      parsed.hostname === "youtu.be" ||
      parsed.hostname === "www.youtu.be"
    ) {
      return parsed.pathname
        .replace("/", "")
        .split("/")[0];
    }

    const queryId = parsed.searchParams.get("v");

    if (queryId) {
      return queryId;
    }

    if (parsed.pathname.includes("/shorts/")) {
      return parsed.pathname
        .split("/shorts/")[1]
        .split("/")[0];
    }

    return null;

  } catch {
    return null;
  }
}

function getYouTubeThumbnail(url) {
  const id = getYouTubeId(url);

  if (!id) {
    return null;
  }

  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}

async function requestPage(url) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {

    const response = await fetch(url, {
      method: "GET",

      redirect: "follow",

      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36",

        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

        "Accept-Language":
          "en-US,en;q=0.9"
      },

      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `Source returned HTTP ${response.status}`
      );
    }

    return await response.text();

  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {

  if (req.method === "OPTIONS") {

    res.status(204);

    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept"
    );

    return res.end();
  }

  if (req.method !== "GET") {

    return sendJSON(res, 405, {
      success: false,
      error: "Method not allowed"
    });
  }

  const requestedURL = req.query?.url;

  const validated =
    validateURL(requestedURL);

  if (!validated) {

    return sendJSON(res, 400, {
      success: false,

      error:
        "Invalid URL. Please enter a public Instagram, TikTok, Facebook or YouTube URL."
    });
  }

  const {
    url,
    platform
  } = validated;

  try {

    /*
     * YouTube thumbnails can be generated
     * directly from the video ID.
     */

    let fallbackThumbnail = null;

    if (platform === "youtube") {

      fallbackThumbnail =
        getYouTubeThumbnail(url);
    }

    /*
     * Request the public page.
     */

    const html =
      await requestPage(url);

    /*
     * Extract publicly exposed
     * Open Graph metadata.
     */

    const metadata =
      extractMetadata(html);

    const thumbnail =
      metadata.image ||
      fallbackThumbnail ||
      null;

    const video =
      metadata.video ||
      null;

    return sendJSON(res, 200, {

      success: true,

      platform,

      videoUrl: video,

      audioUrl: null,

      thumb: thumbnail,

      author: null,

      caption:
        metadata.description ||
        metadata.title ||
        null,

      title:
        metadata.title ||
        null,

      public: true,

      source: url,

      note: video
        ? null
        : "The platform did not expose a direct public video URL in the page metadata."

    });

  } catch (error) {

    console.error(
      "PaceFetch API error:",
      error
    );

    return sendJSON(res, 502, {

      success: false,

      platform,

      error:
        "PaceFetch could not retrieve public information from this URL.",

      public: true

    });
  }
    }

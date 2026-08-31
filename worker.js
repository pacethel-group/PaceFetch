export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("PaceFetch API Live", { headers: corsHeaders });
    }

    if (url.pathname === "/api/download" && request.method === "POST") {
      try {
        const { videoUrl } = await request.json();
        if (!videoUrl) return Response.json({ error: "No link" }, { status: 400, headers: corsHeaders });

        const platform = detectPlatform(videoUrl);

        // YOUTUBE
        if (platform === "youtube") {
          const videoId = extractYoutubeId(videoUrl);
          if (!videoId) throw new Error("Invalid YouTube link");
          return Response.json({
            platform: "youtube",
            type: "thumbnail",
            thumbnails: {
              max: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
              high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
              medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              low: `https://img.youtube.com/vi/${videoId}/default.jpg`,
            }
          }, { headers: corsHeaders });
        }

        // IG, TIKTOK, FB, TWITTER
        const cobaltRes = await fetch("https://api.cobalt.tools/api/json", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ url: videoUrl, vQuality: "1080" })
        });

        const data = await cobaltRes.json();

        return Response.json({
          platform: platform,
          url: data.url,
          picker: data.picker || null,
          audio: data.audio || null,
          filename: data.filename || "video.mp4"
        }, { headers: corsHeaders });

      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
}

function detectPlatform(link) {
  link = link.toLowerCase();
  if (link.includes("instagram.com")) return "instagram";
  if (link.includes("tiktok.com")) return "tiktok";
  if (link.includes("facebook.com") || link.includes("fb.watch")) return "facebook";
  if (link.includes("twitter.com") || link.includes("x.com")) return "twitter";
  if (link.includes("youtube.com") || link.includes("youtu.be")) return "youtube";
  return "unknown";
}

function extractYoutubeId(link) {
  const m = link.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[&?/]|$)/) || link.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  return m? m[1] : null;
        }

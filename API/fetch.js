export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  const inputUrl = req.query?.url;
  if (!inputUrl) return res.status(400).json({ success: false, error: "No URL provided" });

  // Try Cobalt first for real video download (TikTok/IG/FB)
  try {
    const r = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ url: inputUrl, vCodec: "h264", vQuality: "720", filenamePattern: "classic" })
    });
    const data = await r.json();
    if (data && (data.url || data.status === "redirect" || data.status === "tunnel" || data.status === "stream")) {
      const videoUrl = data.url;
      return res.status(200).json({
        success: true,
        platform: "auto",
        videoUrl: videoUrl,
        thumb: data.thumb || null,
        title: data.filename || "PaceFetch Video",
        source: inputUrl,
        public: true
      });
    }
  } catch (e) { console.error("cobalt error", e.message); }

  // Fallback: YouTube ID for thumbnail (always works)
  try {
    const parsed = new URL(inputUrl);
    let id = parsed.searchParams.get("v");
    if (!id && parsed.hostname.includes("youtu.be")) id = parsed.pathname.slice(1);
    if (id) {
      return res.status(200).json({
        success: true,
        platform: "youtube",
        videoUrl: null,
        thumb: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        title: "YouTube Video",
        source: inputUrl,
        public: true,
        note: "Use thumbnail downloader"
      });
    }
  } catch {}

  return res.status(502).json({ success: false, error: "Could not fetch video. Try another public link." });
}

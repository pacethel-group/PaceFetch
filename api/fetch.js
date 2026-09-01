export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  const inputUrl = req.query?.url;
  if (!inputUrl) return res.status(400).json({ success: false, error: "No URL provided" });

  try {
    const r = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ url: inputUrl, vCodec: "h264", vQuality: "720", filenamePattern: "classic" })
    });
    const data = await r.json();
    if (data && data.url) {
      return res.status(200).json({
        success: true,
        platform: "auto",
        videoUrl: data.url,
        thumb: data.thumb || null,
        title: data.filename || "PaceFetch Video",
        source: inputUrl,
        public: true
      });
    }
  } catch (e) {
    console.error(e);
  }

  return res.status(502).json({ success: false, error: "Could not fetch. Try public TikTok/IG/FB link." });
}
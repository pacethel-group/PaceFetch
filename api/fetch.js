export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  const inputUrl = req.query?.url;
  if (!inputUrl) return res.status(400).json({ success: false, error: "No URL" });

  // Try 1: TikWM for TikTok
  if (inputUrl.includes("tiktok.com")) {
    try {
      const r = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(inputUrl)}&hd=1`);
      const j = await r.json();
      if (j?.data?.play) {
        return res.status(200).json({
          success: true, platform: "tiktok",
          videoUrl: j.data.play,
          thumb: j.data.cover,
          title: j.data.title || "TikTok Video",
          source: inputUrl, public: true
        });
      }
    } catch(e){}
  }

  // Try 2: Cobalt backup instance
  const cobaltInstances = ["https://co.wuk.sh/api/json", "https://api.co.wuk.sh/api/json"];
  for (const instance of cobaltInstances) {
    try {
      const r = await fetch(instance, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url: inputUrl, vCodec: "h264", vQuality: "720" })
      });
      const data = await r.json();
      if (data?.url) {
        return res.status(200).json({
          success: true, platform: "auto",
          videoUrl: data.url,
          thumb: data.thumb || null,
          title: data.filename || "Video",
          source: inputUrl, public: true
        });
      }
    } catch(e){}
  }

  return res.status(502).json({ success: false, error: "Could not fetch. Try public TikTok/IG/FB link." });
}
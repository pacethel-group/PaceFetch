export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  
  const inputUrl = req.query?.url;
  if (!inputUrl) return res.status(400).json({ success: false, error: "No URL" });

  // Method 1: TiklyDown - works on Vercel
  try {
    const r = await fetch(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(inputUrl)}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const j = await r.json();
    const videoUrl = j?.video?.noWatermark || j?.video?.watermark || j?.video?.hd;
    if (videoUrl) {
      return res.status(200).json({
        success: true,
        platform: "tiktok",
        videoUrl: videoUrl,
        thumb: j?.cover || null,
        title: j?.title || "Video",
        source: inputUrl,
        public: true
      });
    }
  } catch(e){ console.log("tiklydown fail", e.message) }

  // Method 2: TikWM
  try {
    const r = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(inputUrl)}&hd=1`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const j = await r.json();
    if (j?.data?.play) {
      return res.status(200).json({
        success: true,
        platform: "tiktok",
        videoUrl: j.data.play,
        thumb: j.data.cover,
        title: j.data.title,
        source: inputUrl,
        public: true
      });
    }
  } catch(e){}

  // Method 3: Return the error detail so we can see
  return res.status(200).json({ 
    success: false, 
    error: "All download APIs blocked by Vercel. Use external RapidAPI.",
    triedUrl: inputUrl,
    fix: "Add RAPIDAPI_KEY env"
  });
}
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static('.'));
app.use(express.json());

app.get('/api/fetch', async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const inputUrl = req.query.url;
  if (!inputUrl) return res.json({ success: false, error: "No URL provided" });

  try {
    const response = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        url: inputUrl,
        vQuality: "720",
        filenamePattern: "basic"
      })
    });

    const data = await response.json();
    
    if (data.url) {
      return res.json({
        success: true,
        videoUrl: data.url,
        thumb: data.thumb || "",
        title: data.filename || "Video",
        platform: "video"
      });
    } else {
      return res.json({
        success: false,
        error: data.text || "Could not extract video. Try a different public link."
      });
    }
  } catch (e) {
    return res.json({ success: false, error: "Server error: " + e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log("Running on " + PORT));
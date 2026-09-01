const express = require('express');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static('.'));

app.get('/api/health', (req,res)=> res.json({ok:true, status:"PaceFetch Full is running - YouTube OK"}));

app.get('/api/stream', async (req,res)=>{
  const url = req.query?.url;
  if(!url) return res.status(400).send("No URL");
  try{
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi,'').slice(0,60);
    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    ytdl(url, { quality: 'highest', filter: f=> f.hasVideo && f.hasAudio }).pipe(res);
  }catch(e){ res.status(500).send("YouTube fetch failed: "+e.message); }
});

app.get('/api/fetch', async (req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  const inputUrl = req.query?.url;
  if(!inputUrl) return res.status(400).json({success:false, error:"No URL"});

  // YOUTUBE
  if(inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')){
    try{
      const info = await ytdl.getInfo(inputUrl);
      const thumb = info.videoDetails.thumbnails.pop().url;
      const title = info.videoDetails.title;
      // Return stream link that will download directly
      const streamUrl = `/api/stream?url=${encodeURIComponent(inputUrl)}`;
      return res.json({
        success:true,
        platform:"youtube",
        videoUrl: streamUrl,
        thumb: thumb,
        title: title,
        source: inputUrl,
        public:true,
        isYoutube: true
      });
    }catch(e){
      return res.status(502).json({success:false, error:"YouTube failed: "+e.message});
    }
  }

  // TIKTOK - TikWM
  try{
    const r = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(inputUrl)}&hd=1`, {headers:{"User-Agent":"Mozilla/5.0"}});
    const j = await r.json();
    if(j?.data?.play){
      return res.json({success:true, platform:"tiktok", videoUrl:j.data.play, thumb:j.data.cover, title:j.data.title, source:inputUrl, public:true});
    }
  }catch(e){}

  // IG/FB/TWITTER - Cobalt
  try{
    const r = await fetch("https://co.wuk.sh/api/json",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({url:inputUrl, vQuality:"720"})
    });
    const d = await r.json();
    if(d?.url) return res.json({success:true, platform:"auto", videoUrl:d.url, thumb:d.thumb, title:d.filename, source:inputUrl, public:true});
  }catch(e){}

  res.status(502).json({success:false, error:"Could not fetch"});
});

app.get('*', (req,res)=> res.sendFile(path.join(__dirname,'index.html')));
app.listen(PORT, ()=> console.log("PaceFetch full on", PORT));
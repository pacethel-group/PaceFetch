const express = require('express');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static('.'));

app.get('/api/health', (req,res)=> res.json({ok:true, status:"PaceFetch V3 - 4 fallbacks"} ));

app.get('/api/stream', async (req,res)=>{
  const url = req.query.url;
  if(!url) return res.status(400).send("No URL");
  try{
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi,'').slice(0,50) || "video";
    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    ytdl(url, { quality: 'highest', filter: f=> f.hasVideo && f.hasAudio }).pipe(res);
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/api/fetch', async (req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  const inputUrl = req.query.url;
  if(!inputUrl) return res.status(400).json({success:false, error:"No URL"});

  // 1. YOUTUBE
  if(inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be') || inputUrl.includes('m.youtube')){
    try{
      const info = await ytdl.getInfo(inputUrl);
      return res.json({
        success:true, platform:"youtube",
        videoUrl: `/api/stream?url=${encodeURIComponent(inputUrl)}`,
        thumb: info.videoDetails.thumbnails.pop().url,
        title: info.videoDetails.title, source:inputUrl, public:true
      });
    }catch(e){ return res.json({success:false, error:"YouTube: "+e.message}); }
  }

  // 2. TIKTOK - TikWM
  try{
    const r = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(inputUrl)}&hd=1`, {headers:{"User-Agent":"Mozilla/5.0"}});
    const j = await r.json();
    if(j?.data?.play) return res.json({success:true, platform:"tiktok", videoUrl:j.data.play, thumb:j.data.cover, title:j.data.title, source:inputUrl, public:true});
  }catch(e){}

  // 3. INSTAGRAM / FACEBOOK - Try Qewertyy API (free IG API)
  try{
    if(inputUrl.includes('instagram.com') || inputUrl.includes('fb.watch') || inputUrl.includes('facebook.com')){
      const r = await fetch(`https://api.qewertyy.dev/instagram?url=${encodeURIComponent(inputUrl)}`);
      const j = await r.json();
      if(j?.status && j?.data && j.data[0]?.url){
        return res.json({success:true, platform:"instagram", videoUrl:j.data[0].url, thumb:j.data[0].thumb, title:"Instagram Video", source:inputUrl, public:true});
      }
    }
  }catch(e){}

  // 4. COBALT - 3 instances fallback
  const cobaltInstances = ["https://api.cobalt.tools", "https://co.wuk.sh", "https://cobalt-api.kwiatekmiki.com"];
  for(const instance of cobaltInstances){
    try{
      const r = await fetch(`${instance}/api/json`,{
        method:"POST", headers:{"Content-Type":"application/json","Accept":"application/json"},
        body: JSON.stringify({url:inputUrl, vQuality:"720", filenamePattern:"basic"})
      });
      const d = await r.json();
      if(d?.url) return res.json({success:true, platform:"cobalt", videoUrl:d.url, thumb:d.thumb, title:d.filename||"Video", source:inputUrl, public:true});
    }catch(e){}
  }

  res.status(502).json({success:false, error:"All APIs failed - try another link or check Render logs"});
});

app.get('*', (req,res)=> res.sendFile(path.join(__dirname,'index.html')));
app.listen(PORT, ()=> console.log("V3 on "+PORT));
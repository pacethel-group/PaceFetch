const express = require('express');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.static('.'));

app.get('/api/health', (req,res)=> res.json({ok:true, status:"PaceFetch V4 - Direct IG"}));

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

async function getInstagramDirect(inputUrl){
  try{
    // Clean URL
    const cleanUrl = inputUrl.split('?')[0];
    const htmlRes = await fetch(cleanUrl, {
      headers:{
        "User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept":"text/html",
        "X-IG-App-ID":"936619743392459"
      }
    });
    const html = await htmlRes.text();
    // Try to find video URL in page
    let match = html.match(/"video_url":"([^"]+)"/);
    if(!match) match = html.match(/"playback_url":"([^"]+)"/);
    if(!match) match = html.match(/"video_url":\s*"([^"]+)"/);
    if(match){
      const videoUrl = JSON.parse(`"${match[1]}"`);
      const thumbMatch = html.match(/"display_url":"([^"]+)"/);
      const thumb = thumbMatch ? JSON.parse(`"${thumbMatch[1]}"`) : "";
      return {videoUrl, thumb};
    }
  }catch(e){ console.log("IG direct failed", e.message); }
  return null;
}

app.get('/api/fetch', async (req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  const inputUrl = req.query.url;
  if(!inputUrl) return res.status(400).json({success:false, error:"No URL"});

  if(inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')){
    try{
      const info = await ytdl.getInfo(inputUrl);
      return res.json({success:true, platform:"youtube", videoUrl:`/api/stream?url=${encodeURIComponent(inputUrl)}`, thumb:info.videoDetails.thumbnails.pop().url, title:info.videoDetails.title, source:inputUrl, public:true});
    }catch(e){ return res.json({success:false, error:"YouTube: "+e.message}); }
  }

  try{
    const r = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(inputUrl)}&hd=1`, {headers:{"User-Agent":"Mozilla/5.0"}});
    const j = await r.json();
    if(j?.data?.play) return res.json({success:true, platform:"tiktok", videoUrl:j.data.play, thumb:j.data.cover, title:j.data.title, source:inputUrl, public:true});
  }catch(e){}

  if(inputUrl.includes('instagram.com')){
    const direct = await getInstagramDirect(inputUrl);
    if(direct) return res.json({success:true, platform:"instagram", videoUrl:direct.videoUrl, thumb:direct.thumb, title:"Instagram Video", source:inputUrl, public:true});
  }

  // Last fallback - Cobalt
  const instances = ["https://api.cobalt.tools","https://co.wuk.sh"];
  for(const ins of instances){
    try{
      const r = await fetch(`${ins}/api/json`,{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({url:inputUrl, vQuality:"720"})});
      const d = await r.json(); if(d?.url) return res.json({success:true, platform:"auto", videoUrl:d.url, thumb:d.thumb, title:"Video", source:inputUrl, public:true});
    }catch(e){}
  }

  res.status(502).json({success:false, error:"All APIs failed - Instagram is blocking. Try public TikTok or YouTube first, IG may need 5 min retry."});
});

app.get('*', (req,res)=> res.sendFile(path.join(__dirname,'index.html')));
app.listen(PORT, ()=> console.log("V4 running"));
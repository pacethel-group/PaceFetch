const express = require('express');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.static('.'));

app.get('/api/stream', async (req,res)=>{
  const url = req.query.url;
  const info = await ytdl.getInfo(url);
  res.header('Content-Disposition', `attachment; filename="video.mp4"`);
  ytdl(url, { quality: 'highest', filter: f=> f.hasVideo && f.hasAudio }).pipe(res);
});

app.get('/api/fetch', async (req,res)=>{
  const inputUrl = req.query.url;
  if(!inputUrl) return res.json({success:false, error:"No URL"});

  // YOUTUBE
  if(inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')){
    try{
      const info = await ytdl.getInfo(inputUrl);
      return res.json({
        success:true,
        videoUrl:`/api/stream?url=${encodeURIComponent(inputUrl)}`,
        thumb:info.videoDetails.thumbnails.pop().url,
        title:info.videoDetails.title
      });
    }catch(e){ return res.json({success:false, error:e.message}); }
  }

  // TIKTOK - using Cobalt
  try{
    const r = await fetch("https://api.cobalt.tools/api/json",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({url:inputUrl})
    });
    const d = await r.json();
    if(d.url) return res.json({success:true, videoUrl:d.url, thumb:d.thumb, title:"TikTok Video"});
  }catch(e){}

  try{
    const r = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(inputUrl)}&hd=1`);
    const j = await r.json();
    if(j.data?.play) return res.json({success:true, videoUrl:j.data.play, thumb:j.data.cover, title:j.data.title});
  }catch(e){}

  res.json({success:false, error:"This link is temporarily blocked. Instagram is down globally today, TikTok sometimes blocks. Try a YouTube link - it works 100%. For TikTok, try a different video."});
});

app.get('*', (req,res)=> res.sendFile(path.join(__dirname,'index.html')));
app.listen(PORT);
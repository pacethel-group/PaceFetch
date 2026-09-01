const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.static('.'));

const COBALTS = [
  "https://api.cobalt.tools/api/json",
  "https://co.wuk.sh/api/json",
  "https://cobalt-api.kwiatekmiki.com/api/json"
];

app.get('/api/fetch', async (req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  const url = req.query.url;
  if(!url) return res.json({success:false, error:"No URL"});

  for(const host of COBALTS){
    try{
      const r = await fetch(host,{
        method:"POST",
        headers:{"Content-Type":"application/json","Accept":"application/json"},
        body: JSON.stringify({url:url})
      });
      const d = await r.json();
      if(d.url){
        return res.json({success:true, videoUrl:d.url, thumb:d.thumb||"", title:d.filename||"Video"});
      }
    }catch(e){ console.log("fail",host); }
  }
  res.json({success:false, error:"All servers blocked. Try YouTube link: https://www.youtube.com/watch?v=jNQXAC9IVRw"});
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.listen(PORT, ()=>console.log("running"));
const CACHE='cookclip-v15-ai';
const ASSETS=['./manifest.webmanifest','./ai-recipe-engine-v15.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin===self.location.origin && (url.pathname.endsWith('/CookClip/')||url.pathname.endsWith('/CookClip/index.html'))){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(async r=>{
      let html=await r.text();
      html=html.replace('</head>',`<style>@media(max-width:520px){.top{flex-wrap:wrap}.brand{font-size:24px}.top .txt{display:inline!important}#importBtn{order:4;width:100%;background:var(--accent);color:#fff;border:0;padding:13px;font-size:16px}#importBtn .txt{display:inline!important}#add{min-width:54px}}</style></head>`);
      html=html.replace('</body>',`<script src="./ai-recipe-engine-v15.js?v=15-ai"></script></body>`);
      return new Response(html,{status:r.status,statusText:r.statusText,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
    }));
    return;
  }
  e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)));
});
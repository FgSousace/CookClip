(()=>{
const V='13';
const $=s=>document.querySelector(s), uid=()=>crypto.randomUUID();
const btn=$('#analyzeUrl'), input=$('#recipeUrl'), status=$('#importStatus'); if(!btn||!input||!status)return;
const fallback=btn.onclick;
const FOOD=[
 {k:['mąka pszenna typ 00','maka pszenna typ 00','mąka pszenna','maka pszenna','mąka','maka'],n:[364,10.3,1,76.3,2.7,.3,.01]},
 {k:['drożdże suche','drozdze suche'],n:[325,40,7.6,41,26.9,0,.13]},
 {k:['drożdże','drozdze'],n:[105,8.4,1.9,18,8,0,.08]},
 {k:['oliwa z oliwek','oliwa','olej'],n:[884,0,100,0,0,0,0]},
 {k:['sól','sol'],n:[0,0,0,0,0,0,100]},
 {k:['woda'],n:[0,0,0,0,0,0,0]},
 {k:['passata'],n:[30,1.4,.2,5.6,1.5,4,.3]},
 {k:['mozzarella'],n:[280,28,17,3.1,0,1,1.6]},
 {k:['parmezan'],n:[431,38,29,4.1,0,.9,3.8]},
 {k:['ser'],n:[350,25,27,2,0,.5,1.8]},
 {k:['pierś z kurczaka','piers z kurczaka','kurczak'],n:[165,31,3.6,0,0,0,.18]},
 {k:['ryż','ryz'],n:[360,7,.7,79,1.3,.1,.01]}, {k:['makaron'],n:[350,12,1.5,72,3,2,.02]},
 {k:['jajko','jajka'],n:[143,12.6,9.5,.7,0,.4,.36]}, {k:['mleko'],n:[61,3.2,3.3,4.8,0,4.8,.1]},
 {k:['masło','maslo'],n:[717,.9,81,.1,0,.1,.03]}, {k:['pomidor','pomidory'],n:[18,.9,.2,3.9,1.2,2.6,.01]},
 {k:['cebula'],n:[40,1.1,.1,9.3,1.7,4.2,.01]}, {k:['czosnek'],n:[149,6.4,.5,33,2.1,1,.04]},
 {k:['cukier'],n:[400,0,0,100,0,100,0]}, {k:['jogurt'],n:[63,5.3,1.6,7,0,7,.12]},
 {k:['ziemniak','ziemniaki'],n:[77,2,.1,17,2.2,.8,.02]}, {k:['banan'],n:[89,1.1,.3,23,2.6,12,.01]}
];
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
const clean=s=>String(s||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
function isTikTok(u){try{const h=new URL(u).hostname.toLowerCase();return h==='vm.tiktok.com'||h==='vt.tiktok.com'||h==='tiktok.com'||h.endsWith('.tiktok.com')}catch{return false}}
async function fetchText(u,ms=16000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(u,{signal:c.signal,cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return await r.text()}finally{clearTimeout(t)}}
async function fetchJSON(u){return JSON.parse(await fetchText(u))}
function canonicalFrom(raw){const s=String(raw||'').replace(/\\\//g,'/');const m=s.match(/https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'<>]+\/video\/\d+/i);return m?m[0].replace(/&amp;/g,'&'):null}
async function resolveTikTok(u){if(/tiktok\.com\/@[^/]+\/video\/\d+/i.test(u))return u;for(const p of ['https://corsproxy.io/?url='+encodeURIComponent(u),'https://api.allorigins.win/raw?url='+encodeURIComponent(u)]){try{const x=canonicalFrom(await fetchText(p));if(x)return x}catch{}}return u}
async function oembed(u){const ep='https://www.tiktok.com/oembed?url='+encodeURIComponent(u);for(const p of [ep,'https://corsproxy.io/?url='+encodeURIComponent(ep),'https://api.allorigins.win/raw?url='+encodeURIComponent(ep)]){try{const d=await fetchJSON(p);if(d&&(d.title||d.html))return d}catch{}}return null}
function foodMatch(name){const n=norm(name);let best=null,L=0;for(const f of FOOD)for(const k of f.k){const nk=norm(k);if(n.includes(nk)&&nk.length>L){best=f;L=nk.length}}return best}
const BAD=/\b(godzin|godziny|godzina|hour|hours|minut|minuty|minuta|minute|minutes|sekund|fermentac|temperatur|pokojow|pieczen|wyrastan|odpoczy|stopni|°c|doba|dni|dzień|dzien)\b/i;
function parseAmount(x){x=String(x).replace(',','.');if(/^\d+\/\d+$/.test(x)){const[a,b]=x.split('/').map(Number);return b?a/b:0}return Number(x)||0}
function extractIngredients(text){
 const s=clean(text).replace(/[•●▪◦]/g,'\n').replace(/\s*[|;]\s*/g,'\n'); const out=[],seen=new Set();
 const unit='kg|mg|g|ml|cl|dl|l|szt\\.?|sztuki?|łyżki?|łyżka|łyżeczki?|łyżeczka|szklanki?|szklanka|ząbki?|ząbek|opak\\.?|opakowanie|garść|cup|cups|tbsp|tsp';
 const re=new RegExp('(\\d+\\/\\d+|\\d+(?:[.,]\\d+)?)\\s*('+unit+')(?=\\s|$|[,])\\s*([^,\\n]{1,90})','gi'); let m;
 while((m=re.exec(s))){let name=clean(m[3]).replace(/[#@]\S+/g,'').replace(/[.]+$/,'').trim();if(!name||BAD.test(name)||/^odziny\b/i.test(name))continue;const f=foodMatch(name);if(!f)continue;const key=norm(m[1]+' '+m[2]+' '+name);if(seen.has(key))continue;seen.add(key);out.push({id:uid(),amount:parseAmount(m[1]),unit:m[2],name});}
 return out.slice(0,50);
}
function extractSteps(text){const s=clean(text).replace(/[👉➡️➜→]/g,'. ').replace(/\s+\d+[.)]\s+/g,'. ');const parts=s.split(/(?<=[.!?])\s+|\n+/).map(clean).filter(Boolean);const verb=/\b(dodaj|wymieszaj|mieszaj|pokrój|smaż|gotuj|ugotuj|piecz|upiecz|blenduj|zblenduj|wlej|wsyp|ułóż|dopraw|połącz|przełóż|odstaw|zagotuj|podsmaż|wrzuć|wstaw|wyjmij|polej|posyp|rozpuść|wyrabiaj|wyrób|zagnieć|add|mix|chop|fry|cook|bake|blend|pour|season)\b/i;return [...new Set(parts.filter(x=>verb.test(x)&&x.length>8&&x.length<320))].slice(0,40).map(x=>({id:uid(),text:x,time:''}))}
function explicitMacro(s){const r={kcal:0,p:0,f:0,c:0,fi:0,su:0,salt:0};const take=(re,k)=>{const m=s.match(re);if(m)r[k]=parseFloat(m[1].replace(',','.'))||0};take(/(?:kcal|kalorie|calories?)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)/i,'kcal');if(!r.kcal)take(/(\d+(?:[.,]\d+)?)\s*kcal\b/i,'kcal');take(/(?:białko|protein)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)/i,'p');take(/(?:tłuszcz|fat)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)/i,'f');take(/(?:węgle|węglowodany|carbs?)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)/i,'c');return r}
function grams(i){const u=norm(i.unit),a=Number(i.amount)||0;const M={g:1,kg:1000,mg:.001,ml:1,l:1000,cl:10,dl:100,'lyzka':15,'lyzki':15,'lyzeczka':5,'lyzeczki':5,'szklanka':250,'szklanki':250,'szt.':60,'szt':60,'zabek':5,'zabki':5};return (M[u]??0)*a}
function calcMacro(ings,servings){let t=[0,0,0,0,0,0,0],matched=0;for(const i of ings){const f=foodMatch(i.name),g=grams(i);if(!f||g<=0)continue;matched++;for(let x=0;x<7;x++)t[x]+=f.n[x]*g/100}servings=Math.max(1,Number(servings)||1);t=t.map(v=>v/servings);return{matched,kcal:t[0],p:t[1],f:t[2],c:t[3],fi:t[4],su:t[5],salt:t[6]}}
function servingsFrom(s){let m=s.match(/(?:porcje|porcji|porcja|servings?)\s*[:=\-]?\s*(\d+)/i)||s.match(/(\d+)\s*(?:porcje|porcji|servings?)/i);return m?Number(m[1]):2}
function apply(d,url){resetEditor();title.value=d.title;servings.value=d.servings;sourceUrl.value=url;sourceName.value=d.author?`TikTok — ${d.author}`:'TikTok';ingredients.innerHTML='';d.ingredients.forEach(ingRow);if(!d.ingredients.length)ingRow();steps.innerHTML='';d.steps.forEach(stepRow);if(!d.steps.length)stepRow();kcal.value=d.macro.kcal?Math.round(d.macro.kcal):'';protein.value=d.macro.p?d.macro.p.toFixed(1):'';fat.value=d.macro.f?d.macro.f.toFixed(1):'';carbs.value=d.macro.c?d.macro.c.toFixed(1):'';fiber.value=d.macro.fi?d.macro.fi.toFixed(1):'';sugars.value=d.macro.su?d.macro.su.toFixed(1):'';salt.value=d.macro.salt?d.macro.salt.toFixed(2):'';notes.value=d.notes;importDialog.close();editorTitle.textContent=`Sprawdź przepis z TikToka • v${V}`;editor.showModal()}
btn.onclick=async function(ev){const target=input.value.trim();if(!isTikTok(target)){if(typeof fallback==='function')return fallback.call(this,ev);return}btn.disabled=true;try{status.textContent='🧠 CookClip v13: analizuję opis TikToka…';const full=await resolveTikTok(target),d=await oembed(full);if(!d)throw Error('TikTok nie zwrócił opisu');const caption=clean(d.title||'');const ingredients=extractIngredients(caption),steps=extractSteps(caption),sv=servingsFrom(caption),exp=explicitMacro(caption),est=calcMacro(ingredients,sv);const macro=(exp.kcal||exp.p||exp.f||exp.c)?{...est,...exp}:{...est};const titleText=clean(d.title||'').replace(/#\S+/g,' ').slice(0,100)||'Przepis z TikToka';const notes=`Źródłowy opis TikToka:\n${caption}\n\n${ingredients.length?`Rozpoznano ${ingredients.length} składników.`:'Nie znaleziono wiarygodnych składników z ilościami.'}${est.matched?` Makro oszacowano z ${est.matched} rozpoznanych składników.`:''}`;apply({title:titleText,author:d.author_name||'',ingredients,steps,servings:sv,macro,notes},full);status.textContent=`✅ v13: ${ingredients.length} składników, ${steps.length} kroków${est.matched?', makro policzone':''}.`;}catch(e){status.textContent='❌ v13: '+(e.message||e)}finally{btn.disabled=false}};
})();
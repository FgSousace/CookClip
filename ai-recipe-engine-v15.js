(()=>{
const VERSION='15-AI';
const btn=document.getElementById('analyzeUrl');
const input=document.getElementById('recipeUrl');
const status=document.getElementById('importStatus');
if(!btn||!input||!status)return;
const normalImporter=btn.onclick;
let generatorPromise=null;

const uid=()=>crypto.randomUUID();
const clean=s=>String(s||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
function isTikTok(u){try{const h=new URL(u).hostname.toLowerCase();return h==='vm.tiktok.com'||h==='vt.tiktok.com'||h==='tiktok.com'||h.endsWith('.tiktok.com')}catch{return false}}
async function fetchText(u,ms=20000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(u,{signal:c.signal,cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.text()}finally{clearTimeout(t)}}
async function fetchJSON(u){return JSON.parse(await fetchText(u))}
function canonicalFrom(raw){const s=String(raw||'').replace(/\\\//g,'/');const m=s.match(/https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'<>]+\/video\/\d+/i);return m?m[0].replace(/&amp;/g,'&'):null}
async function resolveTikTok(u){if(/tiktok\.com\/@[^/]+\/video\/\d+/i.test(u))return u;for(const p of ['https://corsproxy.io/?url='+encodeURIComponent(u),'https://api.allorigins.win/raw?url='+encodeURIComponent(u)]){try{const x=canonicalFrom(await fetchText(p));if(x)return x}catch{}}return u}
async function getTikTokMeta(u){const ep='https://www.tiktok.com/oembed?url='+encodeURIComponent(u);for(const p of [ep,'https://corsproxy.io/?url='+encodeURIComponent(ep),'https://api.allorigins.win/raw?url='+encodeURIComponent(ep)]){try{const d=await fetchJSON(p);if(d&&(d.title||d.html))return d}catch{}}return null}

async function loadAI(){
 if(generatorPromise)return generatorPromise;
 generatorPromise=(async()=>{
   status.textContent='🧠 Ładuję silnik AI…';
   const mod=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm');
   const {pipeline}=mod;
   const device=navigator.gpu?'webgpu':'wasm';
   const dtype=device==='webgpu'?'q4f16':'q4';
   const progress_callback=p=>{
     if(p?.status==='progress'&&Number.isFinite(p.progress)) status.textContent=`🧠 Pobieram model AI: ${Math.round(p.progress)}%…`;
     else if(p?.status==='ready') status.textContent='🧠 Model AI gotowy.';
   };
   try{
     return await pipeline('text-generation','onnx-community/Qwen2.5-0.5B-Instruct',{device,dtype,progress_callback});
   }catch(e){
     console.warn('Qwen AI load failed, trying lightweight fallback',e);
     status.textContent='🧠 Duży model nie ruszył — ładuję lżejszy model AI…';
     return await pipeline('text-generation','HuggingFaceTB/SmolLM2-135M-Instruct',{device,dtype:device==='webgpu'?'q4f16':'q4',progress_callback});
   }
 })();
 try{return await generatorPromise}catch(e){generatorPromise=null;throw e}
}

function extractJSON(text){
 text=String(text||'').replace(/```json/gi,'').replace(/```/g,'').trim();
 const first=text.indexOf('{'),last=text.lastIndexOf('}');
 if(first<0||last<=first)throw Error('AI nie zwróciło poprawnego JSON-u');
 return JSON.parse(text.slice(first,last+1));
}
function generatedContent(out){
 const g=out?.[0]?.generated_text;
 if(Array.isArray(g)){const a=[...g].reverse().find(x=>x?.role==='assistant');return a?.content||''}
 return typeof g==='string'?g:'';
}
function n(v){const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0}
function sanitizeAI(raw){
 const data={
   title:String(raw?.title||'Przepis z TikToka').slice(0,140),
   servings:Math.max(1,Math.round(n(raw?.servings)||2)),
   prepMinutes:Math.max(0,Math.round(n(raw?.prepMinutes))),
   cookMinutes:Math.max(0,Math.round(n(raw?.cookMinutes))),
   ingredients:[],steps:[],macro:null,notes:String(raw?.notes||'').slice(0,1500)
 };
 const bad=/\b(godzin|godziny|godzina|minut|minuty|minuta|sekund|fermentac|temperatur|pokojow|pieczen|wyrastan|odpoczy|stopni|°c|hours?|minutes?)\b/i;
 for(const x of Array.isArray(raw?.ingredients)?raw.ingredients:[]){
   const name=clean(x?.name).replace(/^[-•–—]+/,'').trim();
   const amount=n(x?.amount); const unit=clean(x?.unit).slice(0,20);
   if(!name||bad.test(name)||amount<0)continue;
   data.ingredients.push({id:uid(),name,amount:amount||'',unit});
 }
 for(const x of Array.isArray(raw?.steps)?raw.steps:[]){const t=clean(typeof x==='string'?x:x?.text);if(t.length>3)data.steps.push({id:uid(),text:t,time:''})}
 if(raw?.macroExplicit===true&&raw?.macro){
   data.macro={kcal:n(raw.macro.kcal),protein:n(raw.macro.protein),fat:n(raw.macro.fat),carbs:n(raw.macro.carbs),fiber:n(raw.macro.fiber),sugars:n(raw.macro.sugars),salt:n(raw.macro.salt)};
 }
 return data;
}

const FOOD=[
 {k:['mąka pszenna typ 00','maka pszenna typ 00','mąka pszenna','maka pszenna','mąka','maka'],v:[364,10.3,1,76.3,2.7,.3,.01]},
 {k:['drożdże suche','drozdze suche'],v:[325,40,7.6,41,26.9,0,.13]},
 {k:['drożdże','drozdze'],v:[105,8.4,1.9,18,8,0,.08]},
 {k:['oliwa z oliwek','oliwa','olej'],v:[884,0,100,0,0,0,0]},
 {k:['sól','sol'],v:[0,0,0,0,0,0,100]}, {k:['woda'],v:[0,0,0,0,0,0,0]},
 {k:['passata'],v:[30,1.4,.2,5.6,1.5,4,.3]}, {k:['mozzarella'],v:[280,28,17,3.1,0,1,1.6]},
 {k:['parmezan'],v:[431,38,29,4.1,0,.9,3.8]}, {k:['ser'],v:[350,25,27,2,0,.5,1.8]},
 {k:['pierś z kurczaka','piers z kurczaka','kurczak'],v:[165,31,3.6,0,0,0,.18]},
 {k:['ryż','ryz'],v:[360,7,.7,79,1.3,.1,.01]}, {k:['makaron'],v:[350,12,1.5,72,3,2,.02]},
 {k:['jajko','jajka'],v:[143,12.6,9.5,.7,0,.4,.36]}, {k:['mleko'],v:[61,3.2,3.3,4.8,0,4.8,.1]},
 {k:['masło','maslo'],v:[717,.9,81,.1,0,.1,.03]}, {k:['pomidor','pomidory'],v:[18,.9,.2,3.9,1.2,2.6,.01]},
 {k:['cebula'],v:[40,1.1,.1,9.3,1.7,4.2,.01]}, {k:['czosnek'],v:[149,6.4,.5,33,2.1,1,.04]},
 {k:['cukier'],v:[400,0,0,100,0,100,0]}, {k:['jogurt grecki'],v:[97,9,5,3.9,0,3.9,.09]},
 {k:['jogurt'],v:[63,5.3,1.6,7,0,7,.12]}, {k:['ziemniak','ziemniaki'],v:[77,2,.1,17,2.2,.8,.02]},
 {k:['banan'],v:[89,1.1,.3,23,2.6,12,.01]}
];
function food(name){const q=norm(name);let best=null,L=0;for(const f of FOOD)for(const k of f.k){const x=norm(k);if(q.includes(x)&&x.length>L){best=f;L=x.length}}return best}
function grams(i){const u=norm(i.unit),a=n(i.amount);const m={g:1,kg:1000,mg:.001,ml:1,l:1000,cl:10,dl:100,'lyzka':15,'lyzki':15,'lyzeczka':5,'lyzeczki':5,'szklanka':250,'szklanki':250,'szt':60,'szt.':60,'zabek':5,'zabki':5};return (m[u]??0)*a}
function estimateMacro(ings,servings){let t=[0,0,0,0,0,0,0],matched=0;for(const i of ings){const f=food(i.name),g=grams(i);if(!f||g<=0)continue;matched++;for(let j=0;j<7;j++)t[j]+=f.v[j]*g/100}servings=Math.max(1,n(servings)||1);t=t.map(v=>v/servings);return{matched,kcal:t[0],protein:t[1],fat:t[2],carbs:t[3],fiber:t[4],sugars:t[5],salt:t[6]}}

function apply(data,url,author,caption){
 resetEditor();
 title.value=data.title;servings.value=data.servings;prep.value=data.prepMinutes;cook.value=data.cookMinutes;
 sourceUrl.value=url;sourceName.value=author?`TikTok — ${author}`:'TikTok';
 ingredients.innerHTML='';data.ingredients.forEach(ingRow);if(!data.ingredients.length)ingRow();
 steps.innerHTML='';data.steps.forEach(stepRow);if(!data.steps.length)stepRow();
 const macro=data.macro||estimateMacro(data.ingredients,data.servings);
 kcal.value=macro.kcal?Math.round(macro.kcal):'';protein.value=macro.protein?macro.protein.toFixed(1):'';fat.value=macro.fat?macro.fat.toFixed(1):'';carbs.value=macro.carbs?macro.carbs.toFixed(1):'';fiber.value=macro.fiber?macro.fiber.toFixed(1):'';sugars.value=macro.sugars?macro.sugars.toFixed(1):'';salt.value=macro.salt?macro.salt.toFixed(2):'';
 const autoNote=!data.macro&&macro.matched?`Makro oszacowane automatycznie z ${macro.matched}/${data.ingredients.length} rozpoznanych składników.`:'';
 notes.value=[data.notes,autoNote,'Źródłowy opis TikToka:',caption].filter(Boolean).join('\n\n');
 importDialog.close();editorTitle.textContent=`Sprawdź przepis • AI v15`;editor.showModal();
}

async function analyzeWithAI(caption){
 const gen=await loadAI();
 status.textContent='🧠 AI analizuje składniki, kroki i porcje…';
 const prompt=`Jesteś parserem przepisów kulinarnych. Na podstawie opisu z TikToka zwróć WYŁĄCZNIE poprawny JSON, bez markdownu i bez komentarza. Nie zgaduj składników ani liczb, których nie ma w tekście. Informacje o czasie fermentacji, temperaturze, pieczeniu i odpoczynku NIE są składnikami. Pola:\n{\n "title":"string",\n "servings":number,\n "prepMinutes":number,\n "cookMinutes":number,\n "ingredients":[{"name":"string","amount":number,"unit":"g|kg|ml|l|szt.|łyżka|łyżeczka|szklanka|inne"}],\n "steps":["string"],\n "macroExplicit":true|false,\n "macro":{"kcal":number,"protein":number,"fat":number,"carbs":number,"fiber":number,"sugars":number,"salt":number},\n "notes":"string"\n}\nJeśli makro nie jest jawnie podane w tekście, ustaw macroExplicit=false i wartości macro na 0. Jeśli liczba porcji nie jest podana, ustaw 2. Zachowaj polskie nazwy.\n\nOPIS TIKTOKA:\n${caption.slice(0,7000)}`;
 const messages=[{role:'system',content:'Zwracasz tylko poprawny JSON zgodny ze schematem.'},{role:'user',content:prompt}];
 const out=await gen(messages,{max_new_tokens:700,do_sample:false,temperature:0.1,repetition_penalty:1.05});
 return sanitizeAI(extractJSON(generatedContent(out)));
}

btn.onclick=async function(ev){
 const target=input.value.trim();
 if(!isTikTok(target)){if(typeof normalImporter==='function')return normalImporter.call(this,ev);return}
 if(!/^https?:\/\//i.test(target)){status.textContent='❌ Wklej pełny link.';return}
 btn.disabled=true;
 try{
   status.textContent='🎵 Pobieram opis TikToka…';
   const full=await resolveTikTok(target),meta=await getTikTokMeta(full);if(!meta)throw Error('TikTok nie udostępnił opisu filmu');
   const caption=clean(meta.title||'');if(caption.length<5)throw Error('Opis TikToka jest pusty');
   const data=await analyzeWithAI(caption);
   apply(data,full,meta.author_name||'',caption);
   status.textContent=`✅ AI v15: ${data.ingredients.length} składników, ${data.steps.length} kroków.`;
 }catch(e){console.warn(e);status.textContent='❌ AI v15: '+(e.message||e)}finally{btn.disabled=false}
};
})();
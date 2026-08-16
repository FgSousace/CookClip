(()=>{
  const btn=document.getElementById('analyzeUrl');
  const input=document.getElementById('recipeUrl');
  const status=document.getElementById('importStatus');
  if(!btn||!input||!status)return;
  const oldHandler=btn.onclick;
  const uid=()=>crypto.randomUUID();
  const clean=s=>String(s||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  const isTikTok=u=>{try{const h=new URL(u).hostname.toLowerCase();return h==='vm.tiktok.com'||h==='vt.tiktok.com'||h==='tiktok.com'||h.endsWith('.tiktok.com')}catch{return false}};
  async function text(u,ms=16000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(u,{signal:c.signal,cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return await r.text()}finally{clearTimeout(t)}}
  async function json(u){return JSON.parse(await text(u))}
  function canonicalFrom(raw){const s=String(raw||'').replace(/\\\//g,'/');const m=s.match(/https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'<>]+\/video\/\d+/i);return m?m[0].replace(/&amp;/g,'&'):null}
  async function resolve(u){if(/tiktok\.com\/@[^/]+\/video\/\d+/i.test(u))return u;for(const p of ['https://corsproxy.io/?url='+encodeURIComponent(u),'https://api.allorigins.win/raw?url='+encodeURIComponent(u)]){try{const r=canonicalFrom(await text(p));if(r)return r}catch{}}return u}
  async function oembed(u){const ep='https://www.tiktok.com/oembed?url='+encodeURIComponent(u);for(const p of [ep,'https://corsproxy.io/?url='+encodeURIComponent(ep),'https://api.allorigins.win/raw?url='+encodeURIComponent(ep)]){try{const d=await json(p);if(d&&(d.title||d.html))return d}catch{}}return null}
  const val=x=>{if(!x)return'';x=String(x).replace(',','.');if(x.includes('/')){const[a,b]=x.split('/').map(Number);return b?a/b:''}const n=Number(x);return Number.isFinite(n)?n:''};

  function nutrition(s){
    const n={calories:0,proteinContent:0,fatContent:0,carbohydrateContent:0,fiberContent:0,sugarContent:0,sodiumContent:0};
    const full=(re,key)=>{const m=s.match(re);if(m)n[key]=parseFloat(m[1].replace(',','.'))||0};
    full(/(?:kalorie|kcal|calories?)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)/i,'calories');
    if(!n.calories)full(/(\d+(?:[.,]\d+)?)\s*kcal\b/i,'calories');
    full(/(?:białko|protein|proteiny?)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/i,'proteinContent');
    full(/(?:tłuszcz|fat)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/i,'fatContent');
    full(/(?:węglowodany|węgle|carbs?|carbohydrates?)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/i,'carbohydrateContent');
    full(/(?:błonnik|fiber)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/i,'fiberContent');
    full(/(?:cukry|cukier|sugars?)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/i,'sugarContent');
    full(/(?:sól|salt)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/i,'sodiumContent');
    // Skróty B/T/W tylko gdy są jawnie zapisane jak "B: 30 T: 10 W: 50".
    if(!n.proteinContent)full(/(?:^|[\s,;|])B\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*g?\b/im,'proteinContent');
    if(!n.fatContent)full(/(?:^|[\s,;|])T\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*g?\b/im,'fatContent');
    if(!n.carbohydrateContent)full(/(?:^|[\s,;|])W\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*g?\b/im,'carbohydrateContent');
    return n;
  }
  function servings(s){let m=s.match(/(?:porcje|porcji|porcja|servings?)\s*[:=\-]?\s*(\d+)/i)||s.match(/(\d+)\s*(?:porcje|porcji|servings?)/i);return m?Number(m[1]):2}
  function minutes(s,kind){const r=kind==='prep'?/(?:przygotowanie|prep(?:aration)?(?: time)?)\s*[:=\-]?\s*(\d+)\s*min/i:/(?:gotowanie|pieczenie|cook(?:ing)?(?: time)?)\s*[:=\-]?\s*(\d+)\s*min/i;const m=s.match(r);return m?Number(m[1]):0}

  function badIngredientName(n){return /\b(godzin|godziny|godzina|minut|minuty|minuta|sekund|fermentac|temperatur|stopni|°c|pieczen|wyrastan|odpoczy|lodów|lodow|dobę|doba|dni|dzień|dzien|room temperature|hours?|minutes?)\b/i.test(n)}
  function extractIngredients(s){
    const out=[],seen=new Set();
    const add=(a,u,n)=>{
      n=clean(n).replace(/^[-–—,:]+/,'').replace(/[#@][\wąćęłńóśźż]+/gi,'').trim();
      if(!n||n.length>100||badIngredientName(n))return;
      const key=(a+'|'+u+'|'+n).toLowerCase();if(seen.has(key))return;seen.add(key);
      out.push({id:uid(),amount:val(a),unit:u||'',name:n});
    };
    // Jednostka MUSI kończyć się granicą słowa/spacją. To zapobiega "24 godziny" => "24 g + odziny".
    const unit='kg|mg|g|ml|cl|dl|l|szt\\.?|sztuki?|łyżki?|łyżka|łyżeczki?|łyżeczka|szklanki?|szklanka|ząbki?|ząbek|opak\\.?|opakowanie|garść|cup|cups|tbsp|tsp';
    const re=new RegExp('(?:^|[,;|•\\n])\\s*(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])\\s*('+unit+')(?=\\s|$|[,;|•])\\s*([^,;|•\\n]+)','gi');
    let m;while((m=re.exec(s))&&out.length<60)add(m[1],m[2],m[3]);
    // Jeśli opis nie ma separatora przed składnikiem, dopuszczamy tylko bardzo typowe jednostki + nazwę, nadal z twardą granicą.
    const loose=new RegExp('(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?)\\s*(kg|mg|g|ml|l)(?=\\s)\\s+([a-ząćęłńóśźż][^,;|•\\n]{1,70})','gi');
    while((m=loose.exec(s))&&out.length<60)add(m[1],m[2],m[3]);
    const count=/\b(\d+(?:[.,]\d+)?)\s+(jajk\w*|banan\w*|jabłk\w*|cebule?|ząbki? czosnku|tortill\w*|bułk\w*|pomidory?|papryki?|ogórki?)\b/gi;
    while((m=count.exec(s))&&out.length<60)add(m[1],'szt.',m[2]);
    return out;
  }
  function extractSteps(s){let normalized=s.replace(/[👉➡️➜→]/g,'. ').replace(/\s+\d+[.)]\s+/g,'. ');let parts=normalized.split(/(?<=[.!?])\s+|\n+|\s*;\s*/).map(clean).filter(Boolean);const verb=/\b(dodaj|dodajemy|wymieszaj|wymieszamy|mieszaj|pokrój|kroimy|smaż|smażymy|gotuj|gotujemy|ugotuj|piecz|pieczemy|upiecz|blenduj|zblenduj|wlej|wsyp|ułóż|dopraw|połącz|przełóż|odstaw|zagotuj|podsmaż|wrzuć|wstaw|wyjmij|polej|posyp|add|mix|chop|fry|cook|bake|blend|pour|season)\b/i;const out=[];for(const p of parts){if(verb.test(p)&&p.length>8&&p.length<350&&!out.includes(p))out.push(p)}return out.slice(0,40).map(x=>({id:uid(),text:x,time:''}))}
  function leftovers(s,ings,steps){let x=s;for(const st of steps)x=x.replace(st.text,' ');x=x.replace(/#\S+/g,' ').replace(/(?:\d+(?:[.,]\d+)?)\s*kcal\b/gi,' ').replace(/\s{2,}/g,' ').trim();return x.slice(0,2500)}
  function apply(data,url){
    if(typeof resetEditor!=='function')throw Error('Formularz nie jest gotowy');resetEditor();
    title.value=data.title||'Przepis z TikToka';servings.value=data.servings;prep.value=data.prep;cook.value=data.cook;sourceUrl.value=url;sourceName.value=data.author?`TikTok — ${data.author}`:'TikTok';
    ingredients.innerHTML='';data.ingredients.forEach(ingRow);if(!data.ingredients.length)ingRow();
    steps.innerHTML='';data.steps.forEach(stepRow);if(!data.steps.length)stepRow();
    const n=data.nutrition;kcal.value=n.calories||'';protein.value=n.proteinContent||'';fat.value=n.fatContent||'';carbs.value=n.carbohydrateContent||'';fiber.value=n.fiberContent||'';sugars.value=n.sugarContent||'';salt.value=n.sodiumContent||'';
    notes.value=data.notes||'';importDialog.close();editorTitle.textContent='Sprawdź przepis z TikToka';editor.showModal();
    window.dispatchEvent(new CustomEvent('cookclip:imported'));
  }
  btn.onclick=async function(ev){
    const target=input.value.trim();if(!isTikTok(target)){if(typeof oldHandler==='function')return oldHandler.call(this,ev);return}
    if(!/^https?:\/\//i.test(target)){status.textContent='❌ Wklej pełny link.';return}btn.disabled=true;
    try{
      status.textContent='🎵 Analizuję TikToka i rozbijam opis na pola…';const full=await resolve(target),d=await oembed(full);if(!d)throw Error('TikTok nie zwrócił metadanych');
      const caption=clean([d.title||'',d.html||''].join('\n'));const ingredients=extractIngredients(caption),steps=extractSteps(caption),nut=nutrition(caption);
      const titleText=clean(d.title||'').replace(/#\S+/g,' ').replace(/\s{2,}/g,' ').slice(0,100)||'Przepis z TikToka';
      const data={title:titleText,servings:servings(caption),prep:minutes(caption,'prep'),cook:minutes(caption,'cook'),ingredients,steps,nutrition:nut,author:d.author_name||'',notes:leftovers(caption,ingredients,steps)};
      apply(data,full);
      const got=[];if(ingredients.length)got.push(ingredients.length+' składników');if(steps.length)got.push(steps.length+' kroków');if(Object.values(nut).some(Boolean))got.push('makro z opisu');
      status.textContent=got.length?'✅ Wyciągnięto: '+got.join(', ')+'.':'⚠️ TikTok nie podał danych w formie, którą można wiarygodnie rozpoznać.';
    }catch(e){console.warn(e);status.textContent='❌ Nie udało się przeanalizować TikToka: '+(e.message||e)}finally{btn.disabled=false}
  };
})();
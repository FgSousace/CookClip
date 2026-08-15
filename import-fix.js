(() => {
  window.__cookclipImporterInstalled = true;
  const $ = (s) => document.querySelector(s);
  const btn = $('#analyzeUrl');
  if (!btn) return;
  const status = $('#importStatus');
  const input = $('#recipeUrl');

  async function fetchText(url, timeoutMs = 18000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally { clearTimeout(timeout); }
  }
  async function fetchJSON(url, timeoutMs = 18000) { return JSON.parse(await fetchText(url, timeoutMs)); }
  function isTikTok(url) {
    try { const h = new URL(url).hostname.toLowerCase(); return h === 'vm.tiktok.com' || h === 'vt.tiktok.com' || h === 'tiktok.com' || h.endsWith('.tiktok.com'); }
    catch { return false; }
  }
  function stripHtml(s='') {
    const d = document.createElement('textarea');
    d.innerHTML = String(s).replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ');
    return d.value.replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  }
  function canonicalTikTokFromText(text) {
    const decoded = stripHtml(text);
    const patterns = [
      /https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'<>]+\/video\/\d+/i,
      /"canonical"\s*:\s*"([^"]*tiktok\.com[^"]*\/video\/\d+[^"]*)"/i,
      /property=["']og:url["'][^>]*content=["']([^"']+tiktok\.com[^"']+\/video\/\d+)["']/i,
      /rel=["']canonical["'][^>]*href=["']([^"']+tiktok\.com[^"']+\/video\/\d+)["']/i
    ];
    for (const p of patterns) {
      const m = text.match(p) || decoded.match(p);
      if (m) return (m[1] || m[0]).replace(/\\\//g,'/').replace(/&amp;/g,'&');
    }
    return null;
  }
  async function resolveTikTok(target) {
    if (/tiktok\.com\/@[^/]+\/video\/\d+/i.test(target)) return target;
    status.textContent = '🎵 Rozwijam krótki link TikToka…';
    for (const u of [
      'https://corsproxy.io/?url=' + encodeURIComponent(target),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
      'https://api.allorigins.win/get?url=' + encodeURIComponent(target)
    ]) {
      try {
        const raw = await fetchText(u, 16000);
        let text = raw;
        if (u.includes('/get?')) { try { text = JSON.parse(raw).contents || raw; } catch {} }
        const canonical = canonicalTikTokFromText(text);
        if (canonical) return canonical;
      } catch (e) { console.warn('TikTok resolve failed', e); }
    }
    return target;
  }

  function normalizeLines(text) {
    return stripHtml(text)
      .replace(/[•●▪◦·]/g, '\n• ')
      .replace(/\s*[|｜]\s*/g, '\n')
      .replace(/\s*;\s*/g, '\n')
      .split(/\n+/)
      .map(x => x.trim())
      .filter(Boolean);
  }
  function parseFraction(raw) {
    if (!raw) return '';
    const unicode = {'¼':.25,'½':.5,'¾':.75,'⅓':1/3,'⅔':2/3,'⅛':.125,'⅜':.375,'⅝':.625,'⅞':.875};
    if (unicode[raw] != null) return unicode[raw];
    if (/^\d+\s+\d+\/\d+$/.test(raw)) {
      const [w,f] = raw.split(/\s+/), [a,b] = f.split('/'); return Number(w)+Number(a)/Number(b);
    }
    if (/^\d+\/\d+$/.test(raw)) { const [a,b]=raw.split('/'); return Number(a)/Number(b); }
    const n = Number(String(raw).replace(',','.')); return Number.isFinite(n) ? n : '';
  }
  function ingredientObject(line) {
    line = line.replace(/^[-•*–—]\s*/, '').trim();
    const re = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])\s*(kg|g|mg|l|ml|cl|dl|szt\.?|sztuki?|łyżki?|łyżka|łyżeczki?|łyżeczka|szklanki?|szklanka|ząbki?|ząbek|opak\.?|opakowanie|garść|cup|cups|tbsp|tsp)?\s*(.*)$/i;
    const m = line.match(re);
    if (!m) return {id:crypto.randomUUID(), name:line, amount:'', unit:''};
    return {id:crypto.randomUUID(), amount:parseFraction(m[1]), unit:m[2]||'', name:(m[3]||line).trim()};
  }
  function pickNumber(text, regexes) {
    for (const re of regexes) {
      const m = text.match(re);
      if (m) return parseFloat(String(m[1]).replace(',','.')) || 0;
    }
    return 0;
  }
  function parseNutrition(text) {
    return {
      calories: pickNumber(text,[/(?:kcal|kalorie|calories?)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)/i,/(\d+(?:[.,]\d+)?)\s*kcal\b/i]),
      proteinContent: pickNumber(text,[/(?:białko|protein|proteiny?)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)/i,/(?:^|\s)P\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*g?/im]),
      fatContent: pickNumber(text,[/(?:tłuszcz|fat)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)/i,/(?:^|\s)F\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*g?/im]),
      carbohydrateContent: pickNumber(text,[/(?:węglowodany|węgle|carbs?|carbohydrates?)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)/i,/(?:^|\s)C\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*g?/im]),
      fiberContent: pickNumber(text,[/(?:błonnik|fiber)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)/i]),
      sugarContent: pickNumber(text,[/(?:cukry|cukier|sugars?)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)/i]),
      sodiumContent: pickNumber(text,[/(?:sól|salt|sodium)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)/i])
    };
  }
  function guessServings(text) {
    const m = text.match(/(?:porcje|porcji|porcja|servings?|yield)\s*[:=\-]?\s*(\d+)/i) || text.match(/(\d+)\s*(?:porcje|porcji|servings?)/i);
    return m ? String(Number(m[1])) : '2';
  }
  function guessMinutes(text, kind) {
    const arr = kind==='prep'
      ? [/(?:przygotowanie|prep(?:aration)?(?: time)?)\s*[:=\-]?\s*(\d+)\s*min/i]
      : [/(?:gotowanie|pieczenie|cook(?:ing)?(?: time)?)\s*[:=\-]?\s*(\d+)\s*min/i];
    for (const re of arr) { const m=text.match(re); if(m) return Number(m[1]); }
    return 0;
  }
  function looksLikeIngredient(line) {
    if (line.length > 160) return false;
    return /^(?:[-•*–—]\s*)?(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])\s*(?:kg|g|mg|l|ml|cl|dl|szt|łyż|łyżecz|szkl|ząb|opak|garść|cup|tbsp|tsp)?\b/i.test(line);
  }
  function looksLikeStep(line) {
    return /\b(dodaj|dodajemy|wymieszaj|mieszamy|pokrój|kroimy|smaż|smażymy|gotuj|gotujemy|piecz|pieczemy|blenduj|blendujemy|wlej|wsyp|ułóż|dopraw|połącz|przełóż|odstaw|zagotuj|podsmaż|wrzuć|wstaw|wyjmij|add|mix|chop|fry|cook|bake|blend|pour|season)\b/i.test(line);
  }
  function parseTikTokCaption(text, sourceUrl, author='') {
    const clean = stripHtml(text)
      .replace(/TikTok\s*[-–—]?\s*Make Your Day/gi,'')
      .replace(/Log in|Sign up|Open in TikTok/gi,'')
      .trim();
    const lines = normalizeLines(clean);
    const ingredientLines = [], stepLines = [];
    let mode='';
    const ingredientHeader=/^(składniki|ingredients|potrzebujesz|lista składników|co potrzebujesz)\s*:?$/i;
    const stepHeader=/^(przygotowanie|wykonanie|instrukcja|sposób przygotowania|instructions|method|steps?)\s*:?$/i;
    for (const raw of lines) {
      const line = raw.replace(/^[-•*–—]\s*/,'').trim();
      if (!line || /^#\S+$/.test(line) || /^@\S+$/.test(line)) continue;
      if (ingredientHeader.test(line)) { mode='ingredients'; continue; }
      if (stepHeader.test(line)) { mode='steps'; continue; }
      if (mode==='ingredients') {
        if (stepHeader.test(line)) { mode='steps'; continue; }
        if (looksLikeIngredient(line) || line.length<120) ingredientLines.push(line);
      } else if (mode==='steps') {
        if (line.length>3) stepLines.push(line);
      } else {
        if (looksLikeIngredient(line)) ingredientLines.push(line);
        else if (looksLikeStep(line)) stepLines.push(line);
      }
    }
    // Split long caption sentences if TikTok returned everything in one line.
    if (!stepLines.length) {
      const sentences = clean.split(/(?<=[.!?])\s+|\s+\d+[.)]\s+/).map(x=>x.trim()).filter(Boolean);
      sentences.filter(looksLikeStep).slice(0,30).forEach(x=>stepLines.push(x));
    }
    const titleLine = lines.find(x => !/^@/.test(x) && !/^#/.test(x) && !looksLikeIngredient(x) && !looksLikeStep(x)) || 'Przepis z TikToka';
    return {
      name:titleLine.replace(/#\S+/g,'').trim().slice(0,120)||'Przepis z TikToka',
      recipeYield:guessServings(clean),
      prepMinutes:guessMinutes(clean,'prep'), cookMinutes:guessMinutes(clean,'cook'),
      recipeIngredient:[...new Set(ingredientLines)].slice(0,80),
      recipeInstructions:[...new Set(stepLines)].slice(0,60).map(t=>({'@type':'HowToStep',text:t})),
      nutrition:parseNutrition(clean),
      description:clean.slice(0,5000), sourceUrl, author
    };
  }
  async function tiktokOEmbed(url) {
    const endpoint='https://www.tiktok.com/oembed?url='+encodeURIComponent(url);
    for (const u of [endpoint,'https://corsproxy.io/?url='+encodeURIComponent(endpoint),'https://api.allorigins.win/raw?url='+encodeURIComponent(endpoint)]) {
      try { const data=await fetchJSON(u,16000); if(data&&(data.title||data.html)) return data; }
      catch(e){console.warn('TikTok oEmbed attempt failed',e)}
    }
    return null;
  }
  async function tryTikTok(target) {
    status.textContent='🎵 TikTok wykryty…';
    const canonical=await resolveTikTok(target);
    status.textContent='🎵 Pobieram opis i wyciągam dane przepisu…';
    const data=await tiktokOEmbed(canonical);
    if(data){
      const caption=[data.title||'',data.html||''].join('\n');
      const parsed=parseTikTokCaption(caption,canonical,data.author_name||'');
      if(parsed.recipeIngredient.length||parsed.recipeInstructions.length||parsed.description.length>20) return parsed;
    }
    for(const u of ['https://corsproxy.io/?url='+encodeURIComponent(canonical),'https://api.allorigins.win/raw?url='+encodeURIComponent(canonical)]){
      try{const text=await fetchText(u,16000);const parsed=parseTikTokCaption(text,canonical);if(parsed.description.length>30)return parsed}catch{}
    }
    return null;
  }
  async function tryNormalRecipe(target) {
    const attempts=[
      {name:'Reader',url:'https://r.jina.ai/http://'+target.replace(/^https?:\/\//i,'')},
      {name:'CorsProxy',url:'https://corsproxy.io/?url='+encodeURIComponent(target)},
      {name:'AllOrigins',url:'https://api.allorigins.win/raw?url='+encodeURIComponent(target)},
      {name:'Bezpośrednio',url:target}
    ];
    for(const a of attempts){try{status.textContent=`⏳ Próba: ${a.name}…`;const html=await fetchText(a.url);if(typeof extractRecipe==='function'){const r=extractRecipe(html);if(r)return r}}catch(e){console.warn(a.name,e)}}
    return null;
  }
  function applyTikTok(recipe,target){
    if(typeof resetEditor!=='function')return false;
    resetEditor();
    title.value=recipe.name||'Przepis z TikToka';
    servings.value=Number(recipe.recipeYield)||2;
    prep.value=recipe.prepMinutes||0; cook.value=recipe.cookMinutes||0;
    sourceUrl.value=recipe.sourceUrl||target;
    sourceName.value=recipe.author?`TikTok — ${recipe.author}`:'TikTok';
    notes.value=recipe.description||'';
    ingredients.innerHTML='';(recipe.recipeIngredient||[]).forEach(x=>ingRow(typeof x==='string'?ingredientObject(x):x));if(!ingredients.children.length)ingRow();
    steps.innerHTML='';(recipe.recipeInstructions||[]).forEach(x=>stepRow({id:crypto.randomUUID(),text:typeof x==='string'?x:(x.text||''),time:''}));if(!steps.children.length)stepRow();
    const n=recipe.nutrition||{};
    kcal.value=n.calories||''; protein.value=n.proteinContent||''; fat.value=n.fatContent||''; carbs.value=n.carbohydrateContent||''; fiber.value=n.fiberContent||''; sugars.value=n.sugarContent||''; salt.value=n.sodiumContent||'';
    importDialog.close();editorTitle.textContent='Sprawdź przepis z TikToka';editor.showModal();return true;
  }
  btn.onclick=async()=>{
    const target=input.value.trim();if(!/^https?:\/\//i.test(target)){status.textContent='❌ Wklej pełny link.';return}
    btn.disabled=true;
    try{
      if(isTikTok(target)){
        const r=await tryTikTok(target);if(!r){status.textContent='❌ TikTok nie udostępnił opisu tego filmu.';return}
        applyTikTok(r,target);
        const got=[];if(r.recipeIngredient.length)got.push(`${r.recipeIngredient.length} składników`);if(r.recipeInstructions.length)got.push(`${r.recipeInstructions.length} kroków`);if(Object.values(r.nutrition||{}).some(Boolean))got.push('makro');
        status.textContent=got.length?'✅ Wyciągnięto: '+got.join(', ')+'.':'⚠️ Odczytałem opis, ale nie znalazłem w nim rozpisanych składników/kroków/makro.';return;
      }
      const r=await tryNormalRecipe(target);if(!r){status.textContent='❌ Nie udało się znaleźć danych przepisu na tej stronie.';return}if(typeof applyImported==='function')applyImported(r,target)
    }catch(e){console.warn(e);status.textContent='❌ Import nie powiódł się: '+(e.message||e)}finally{btn.disabled=false}
  };
})();
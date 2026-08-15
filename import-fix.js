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
  async function fetchJSON(url, timeoutMs = 18000) {
    return JSON.parse(await fetchText(url, timeoutMs));
  }
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
      /https?:\\?\/\\?\/(?:www\.)?tiktok\.com\\?\/@[^"']+?\\?\/video\\?\/\d+/i,
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
    const probes = [
      'https://corsproxy.io/?url=' + encodeURIComponent(target),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
      'https://api.allorigins.win/get?url=' + encodeURIComponent(target)
    ];
    for (const u of probes) {
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
  function parseTikTokCaption(text, sourceUrl, author='') {
    text = stripHtml(text);
    const lines = text.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const ingredientLines = [], stepLines = [];
    let mode = '';
    const ingredientHeader = /^(składniki|ingredients|potrzebujesz|lista składników)\s*:?$/i;
    const stepHeader = /^(przygotowanie|wykonanie|instrukcja|sposób przygotowania|instructions|method|steps?)\s*:?$/i;
    const amountish = /^[-•*]?\s*(?:\d+[\d.,\/\s]*|\d*\s?(?:g|kg|ml|l|łyż|łyżk|łyżecz|szkl|szt|ząb|opak|cup|tbsp|tsp)\b)/i;
    for (const raw of lines) {
      const line = raw.replace(/^[-•*]\s*/,'').trim();
      if (ingredientHeader.test(line)) { mode='ingredients'; continue; }
      if (stepHeader.test(line)) { mode='steps'; continue; }
      if (mode==='ingredients') ingredientLines.push(line);
      else if (mode==='steps') stepLines.push(line);
      else if (amountish.test(line) && line.length < 140) ingredientLines.push(line);
    }
    const titleLine = lines.find(x => !/^@/.test(x) && !/^#/.test(x)) || 'Przepis z TikToka';
    return {
      name: titleLine.slice(0,120), recipeYield:'2', recipeIngredient:ingredientLines,
      recipeInstructions:stepLines.map(t=>({'@type':'HowToStep',text:t})),
      description:text.slice(0,4000), sourceUrl, author
    };
  }
  async function tiktokOEmbed(url) {
    const endpoint = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(url);
    const attempts = [endpoint, 'https://corsproxy.io/?url=' + encodeURIComponent(endpoint), 'https://api.allorigins.win/raw?url=' + encodeURIComponent(endpoint)];
    for (const u of attempts) {
      try {
        const data = await fetchJSON(u, 16000);
        if (data && (data.title || data.html)) return data;
      } catch (e) { console.warn('TikTok oEmbed attempt failed', e); }
    }
    return null;
  }
  async function tryTikTok(target) {
    status.textContent = '🎵 TikTok wykryty…';
    const canonical = await resolveTikTok(target);
    status.textContent = '🎵 Pobieram opis z TikToka…';
    const data = await tiktokOEmbed(canonical);
    if (data) {
      const caption = [data.title || '', data.html || ''].join('\n');
      const parsed = parseTikTokCaption(caption, canonical, data.author_name || '');
      parsed.name = (data.title || parsed.name || 'Przepis z TikToka').replace(/#\S+/g,'').trim().slice(0,120) || 'Przepis z TikToka';
      if (parsed.recipeIngredient.length || parsed.recipeInstructions.length) return parsed;
      // Even when the caption has no structured recipe, open the editor with metadata instead of failing.
      parsed.description = stripHtml(data.title || data.html || '').slice(0,4000);
      parsed.noStructuredRecipe = true;
      return parsed;
    }
    // Last-resort page text through proxy only; Jina is deliberately skipped for TikTok because it often returns 403.
    for (const u of ['https://corsproxy.io/?url='+encodeURIComponent(canonical),'https://api.allorigins.win/raw?url='+encodeURIComponent(canonical)]) {
      try {
        const text = await fetchText(u,16000);
        const parsed = parseTikTokCaption(text,canonical);
        if (parsed.description.length > 30) { parsed.noStructuredRecipe = !(parsed.recipeIngredient.length || parsed.recipeInstructions.length); return parsed; }
      } catch {}
    }
    return null;
  }
  async function tryNormalRecipe(target) {
    const attempts = [
      {name:'Reader',url:'https://r.jina.ai/http://'+target.replace(/^https?:\/\//i,'')},
      {name:'CorsProxy',url:'https://corsproxy.io/?url='+encodeURIComponent(target)},
      {name:'AllOrigins',url:'https://api.allorigins.win/raw?url='+encodeURIComponent(target)},
      {name:'Bezpośrednio',url:target}
    ];
    for (const a of attempts) {
      try { status.textContent=`⏳ Próba: ${a.name}…`; const html=await fetchText(a.url); if (typeof extractRecipe==='function') { const r=extractRecipe(html); if (r) return r; } }
      catch(e){ console.warn(a.name,e); }
    }
    return null;
  }
  function applyTikTokFallback(recipe,target) {
    if (typeof resetEditor!=='function') return false;
    resetEditor();
    title.value = recipe.name || 'Przepis z TikToka';
    sourceUrl.value = recipe.sourceUrl || target;
    sourceName.value = recipe.author ? `TikTok — ${recipe.author}` : 'TikTok';
    notes.value = recipe.description || '';
    ingredients.innerHTML=''; (recipe.recipeIngredient||[]).forEach(x=>ingRow(typeof x==='string'?{id:crypto.randomUUID(),name:x,amount:'',unit:''}:x)); if(!ingredients.children.length) ingRow();
    steps.innerHTML=''; (recipe.recipeInstructions||[]).forEach(x=>stepRow({id:crypto.randomUUID(),text:typeof x==='string'?x:(x.text||''),time:''})); if(!steps.children.length) stepRow();
    importDialog.close(); editorTitle.textContent = recipe.noStructuredRecipe ? 'TikTok odczytany — uzupełnij szczegóły' : 'Sprawdź przepis z TikToka'; editor.showModal();
    return true;
  }
  btn.onclick = async () => {
    const target=input.value.trim();
    if(!/^https?:\/\//i.test(target)){status.textContent='❌ Wklej pełny link.';return}
    btn.disabled=true;
    try {
      if(isTikTok(target)) {
        const r=await tryTikTok(target);
        if(!r){status.textContent='❌ TikTok nie udostępnił nawet opisu tego filmu. Spróbuj pełnego linku do filmu zamiast vm.tiktok.com.';return}
        if(typeof applyImported==='function' && !r.noStructuredRecipe) applyImported(r,target); else applyTikTokFallback(r,target);
        status.textContent = r.noStructuredRecipe ? '⚠️ TikTok odczytany, ale przepis nie był rozpisany w opisie. Otworzyłem formularz z dostępnymi danymi.' : '✅ TikTok odczytany.';
        return;
      }
      const r=await tryNormalRecipe(target);
      if(!r){status.textContent='❌ Nie udało się znaleźć danych przepisu na tej stronie.';return}
      if(typeof applyImported==='function') applyImported(r,target);
    } catch(e){console.warn(e);status.textContent='❌ Import nie powiódł się: '+(e.message||e)}
    finally{btn.disabled=false}
  };
})();
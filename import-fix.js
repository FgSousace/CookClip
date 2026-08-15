(() => {
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
    } finally {
      clearTimeout(timeout);
    }
  }

  function isTikTok(url) {
    try {
      const h = new URL(url).hostname.toLowerCase();
      return h === 'vm.tiktok.com' || h === 'vt.tiktok.com' || h.endsWith('.tiktok.com') || h === 'tiktok.com';
    } catch { return false; }
  }

  function stripHtml(s='') {
    const d = document.createElement('textarea');
    d.innerHTML = String(s).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ');
    return d.value.replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  }

  function parseTikTokText(text, sourceUrl) {
    text = stripHtml(text);
    if (!text) return null;

    // Remove common oEmbed / page chrome noise.
    const clean = text
      .replace(/TikTok\s*[-–—]?\s*Make Your Day/gi,'')
      .replace(/Log in|Sign up|Open in TikTok/gi,'')
      .trim();

    // Try to identify recipe-like lines from caption/reader output.
    const lines = clean.split(/\n+/).map(x => x.trim()).filter(Boolean);
    const ingredientLines = [];
    const stepLines = [];
    let mode = '';

    const ingredientHeader = /^(składniki|ingredients|potrzebujesz|lista składników)\s*:?$/i;
    const stepHeader = /^(przygotowanie|wykonanie|instrukcja|sposób przygotowania|instructions|method|steps?)\s*:?$/i;
    const amountish = /^[-•*]?\s*(?:\d+[\d.,\/\s]*|\d*\s?(?:g|kg|ml|l|łyż|łyżk|łyżecz|szkl|szt|ząb|opak|cup|tbsp|tsp)\b)/i;

    for (let raw of lines) {
      let line = raw.replace(/^[-•*]\s*/, '').trim();
      if (!line) continue;
      if (ingredientHeader.test(line)) { mode = 'ingredients'; continue; }
      if (stepHeader.test(line)) { mode = 'steps'; continue; }
      if (mode === 'ingredients') ingredientLines.push(line);
      else if (mode === 'steps') stepLines.push(line);
      else if (amountish.test(line) && line.length < 120) ingredientLines.push(line);
    }

    // If there were no explicit sections, use sentence-like caption text as notes/title source.
    const title = (lines[0] || 'Przepis z TikToka').replace(/^@\S+\s*/, '').slice(0, 120);

    return {
      name: title || 'Przepis z TikToka',
      recipeYield: '2',
      recipeIngredient: ingredientLines,
      recipeInstructions: stepLines.map(t => ({'@type':'HowToStep', text:t})),
      description: clean.slice(0, 3000),
      sourceUrl
    };
  }

  async function tryTikTok(target) {
    status.textContent = '🎵 TikTok wykryty — próbuję pobrać opis filmu…';

    // 1) Official TikTok oEmbed. Works for many public videos and often gives title/caption metadata.
    try {
      const oembed = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(target);
      const raw = await fetchText('https://corsproxy.io/?url=' + encodeURIComponent(oembed));
      const data = JSON.parse(raw);
      const combined = [data.title, data.author_name, data.html].filter(Boolean).join('\n');
      const parsed = parseTikTokText(combined, target);
      if (parsed && (parsed.recipeIngredient.length || parsed.recipeInstructions.length || parsed.description.length > 40)) {
        return parsed;
      }
    } catch (e) {
      console.warn('TikTok oEmbed failed', e);
    }

    // 2) Jina Reader fallback - useful for resolving short links and extracting rendered text.
    try {
      status.textContent = '🎵 TikTok: próbuję Reader…';
      const reader = 'https://r.jina.ai/http://' + target.replace(/^https?:\/\//i,'');
      const text = await fetchText(reader, 22000);
      const parsed = parseTikTokText(text, target);
      if (parsed && (parsed.recipeIngredient.length || parsed.recipeInstructions.length || parsed.description.length > 80)) {
        return parsed;
      }
    } catch (e) {
      console.warn('TikTok Reader failed', e);
    }

    // 3) Direct/proxy page text fallback.
    const attempts = [
      'https://corsproxy.io/?url=' + encodeURIComponent(target),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(target)
    ];
    for (const u of attempts) {
      try {
        const text = await fetchText(u);
        const parsed = parseTikTokText(text, target);
        if (parsed && (parsed.recipeIngredient.length || parsed.recipeInstructions.length || parsed.description.length > 80)) return parsed;
      } catch {}
    }

    return null;
  }

  async function tryNormalRecipe(target) {
    const attempts = [
      { name: 'Reader', url: 'https://r.jina.ai/http://' + target.replace(/^https?:\/\//i,'') },
      { name: 'CorsProxy', url: 'https://corsproxy.io/?url=' + encodeURIComponent(target) },
      { name: 'AllOrigins raw', url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent(target) },
      { name: 'Bezpośrednio', url: target }
    ];

    for (const attempt of attempts) {
      try {
        status.textContent = `⏳ Próba: ${attempt.name}…`;
        const html = await fetchText(attempt.url);
        if (!html || html.length < 100) continue;
        if (typeof extractRecipe === 'function') {
          const recipe = extractRecipe(html);
          if (recipe) return recipe;
        }
      } catch (e) {
        console.warn('CookClip import attempt failed:', attempt.name, e);
      }
    }
    return null;
  }

  btn.onclick = async () => {
    const target = input.value.trim();
    if (!/^https?:\/\//i.test(target)) {
      status.textContent = '❌ Wklej pełny link zaczynający się od http:// albo https://';
      return;
    }

    btn.disabled = true;
    try {
      let recipe = null;
      if (isTikTok(target)) {
        recipe = await tryTikTok(target);
        if (!recipe) {
          status.innerHTML = '❌ TikTok został rozpoznany, ale z tego filmu nie udało się wyciągnąć przepisu z opisu/metadanych. Jeśli składniki są tylko mówione lub pokazane w filmie, potrzebna będzie analiza samego wideo.';
          return;
        }
      } else {
        recipe = await tryNormalRecipe(target);
        if (!recipe) {
          status.innerHTML = '❌ Nie udało się znaleźć danych przepisu na tej stronie. <b>Nic nie zostało zapisane.</b>';
          return;
        }
      }

      if (typeof applyImported === 'function') {
        applyImported(recipe, target);
        status.textContent = isTikTok(target) ? '✅ TikTok odczytany — sprawdź uzupełniony przepis.' : '✅ Przepis odczytany.';
      } else {
        status.textContent = '❌ Błąd formularza importu.';
      }
    } catch (e) {
      console.warn('CookClip import fatal:', e);
      status.textContent = '❌ Import nie powiódł się. Spróbuj ponownie za chwilę.';
    } finally {
      btn.disabled = false;
    }
  };
})();

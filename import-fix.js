(() => {
  const $ = (s) => document.querySelector(s);
  const btn = $('#analyzeUrl');
  if (!btn) return;

  const status = $('#importStatus');
  const input = $('#recipeUrl');

  async function fetchText(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'text/html,application/xhtml+xml' },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  btn.onclick = async () => {
    const target = input.value.trim();
    if (!/^https?:\/\//i.test(target)) {
      status.textContent = '❌ Wklej pełny link zaczynający się od http:// albo https://';
      return;
    }

    btn.disabled = true;
    status.textContent = '⏳ Pobieram przepis…';

    const attempts = [
      {
        name: 'CorsProxy',
        url: 'https://corsproxy.io/?url=' + encodeURIComponent(target)
      },
      {
        name: 'AllOrigins raw',
        url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent(target)
      },
      {
        name: 'AllOrigins get',
        url: 'https://api.allorigins.win/get?url=' + encodeURIComponent(target),
        json: true
      },
      {
        name: 'Bezpośrednio',
        url: target
      }
    ];

    const errors = [];

    for (const attempt of attempts) {
      try {
        status.textContent = `⏳ Próba: ${attempt.name}…`;
        let html;

        if (attempt.json) {
          const raw = await fetchText(attempt.url);
          const payload = JSON.parse(raw);
          html = payload.contents || '';
        } else {
          html = await fetchText(attempt.url);
        }

        if (!html || html.length < 100) throw new Error('Pusta odpowiedź');

        const recipe = extractRecipe(html);
        if (!recipe) throw new Error('Brak danych Recipe/JSON-LD');

        applyImported(recipe, target);
        status.textContent = `✅ Zaimportowano przez ${attempt.name}`;
        btn.disabled = false;
        return;
      } catch (e) {
        errors.push(`${attempt.name}: ${e?.message || e}`);
      }
    }

    console.warn('CookClip import errors:', errors);
    status.innerHTML = '❌ Nie udało się odczytać przepisu automatycznie. Strona może blokować proxy albo nie publikować danych Recipe. <b>Nic nie zostało zapisane.</b>';
    btn.disabled = false;
  };
})();

(()=>{
  // Legacy compatibility shim. The active importer lives in import-fix.js.
  // Do not override its click handler; this avoids stale Safari caches surfacing Jina HTTP 403 on TikTok links.
  if (window.__cookclipImporterInstalled) return;
  const status = document.getElementById('importStatus');
  const btn = document.getElementById('analyzeUrl');
  if (!btn) return;
  btn.onclick = () => {
    if (status) status.textContent = 'ℹ️ Aktualizuję importer CookClip… Zamknij tę kartę i otwórz aplikację ponownie.';
  };
})();
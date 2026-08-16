(()=>{
  const BAD=/\b(?:odziny|godzin(?:a|y|ach|ę)?|minut(?:a|y|ach)?|sekund(?:a|y|ach)?|fermentac\w*|temperatur\w*|pokojow\w*|lod[oó]w\w*|pieczen\w*|wyrastan\w*|odpoczy\w*|stopni\w*|°c|doba|dobę|dni|dzień|dzien|hours?|minutes?|room temperature)\b/i;
  const FOOD=/\b(?:m[aą]k\w*|wod\w*|drożdż\w*|drozdz\w*|s[oó]l\w*|oliw\w*|olej\w*|ser\w*|mozzarell\w*|pomidor\w*|passat\w*|kurczak\w*|ryż\w*|ryz\w*|makaron\w*|jaj\w*|mlek\w*|masł\w*|masl\w*|cukier|miód|miod|banan\w*|ceb\w*|czosn\w*|jogurt\w*|śmietan\w*|smietan\w*|ziemniak\w*|wołow\w*|wolow\w*|indyk\w*|łoso\w*|loso\w*|tuńczy\w*|tunczy\w*|awokad\w*)\b/i;
  function cleanRows(){
    const box=document.getElementById('ingredients');
    if(!box)return 0;
    let removed=0;
    [...box.children].forEach(row=>{
      const name=(row.querySelector('.in')?.value||'').trim();
      const unit=(row.querySelector('.iu')?.value||'').trim().toLowerCase();
      if(!name)return;
      const obviouslyBad=BAD.test(name) || (/^g$/i.test(unit)&&/^(?:odziny|odzin|odz\b)/i.test(name));
      const suspicious=!FOOD.test(name) && /\b(?:ferment|temperatur|pokoj|lod[oó]w|godzin|minut|sekund|piec|wyrast|odpoczy)\w*/i.test(name);
      if(obviouslyBad||suspicious){row.remove();removed++;}
    });
    if(!box.children.length && typeof window.ingRow==='function') window.ingRow();
    return removed;
  }
  function recalc(){
    const ids=['kcal','protein','fat','carbs','fiber','sugars','salt'];
    ids.forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    if(window.CookClipMacroEstimator?.fillMacro) window.CookClipMacroEstimator.fillMacro(true);
  }
  function markVersion(){
    const t=document.getElementById('editorTitle');
    const src=document.getElementById('sourceName')?.value||'';
    if(t&&/^TikTok/i.test(src)&&!t.textContent.includes('v12')) t.textContent='Sprawdź przepis z TikToka • v12';
  }
  function run(){
    const removed=cleanRows();
    recalc();
    markVersion();
    if(removed){
      const n=document.getElementById('notes');
      const msg=`Usunięto automatycznie ${removed} błędnych pozycji niebędących składnikami.`;
      if(n&&!n.value.includes(msg))n.value=(n.value?n.value+'\n\n':'')+msg;
    }
  }
  window.addEventListener('cookclip:imported',()=>setTimeout(run,220));
  const ed=document.getElementById('editor');
  if(ed){new MutationObserver(()=>{if(ed.open)setTimeout(run,80)}).observe(ed,{attributes:true,attributeFilter:['open']});}
})();
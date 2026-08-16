(()=>{
  function recalc(){
    try{
      const est=window.CookClipMacroEstimator;
      if(est&&typeof est.fillMacro==='function'){
        setTimeout(()=>est.fillMacro(),50);
        setTimeout(()=>est.fillMacro(),350);
      }
    }catch(e){console.warn('CookClip macro recalculation failed',e)}
  }
  function install(){
    const editor=document.getElementById('editor');
    if(!editor)return;
    const obs=new MutationObserver(()=>{
      if(editor.hasAttribute('open')) recalc();
    });
    obs.observe(editor,{attributes:true,attributeFilter:['open']});
    document.addEventListener('input',e=>{
      if(e.target.closest?.('#ingredients')||e.target.id==='servings') recalc();
    });
    window.addEventListener('cookclip:imported',recalc);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
})();
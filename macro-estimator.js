(()=>{
  const DB=[
    {keys:['pierś z kurczaka','piers z kurczaka','kurczak'],kcal:165,p:31,f:3.6,c:0,fi:0,su:0,salt:.18},
    {keys:['ryż','ryz'],kcal:360,p:7,f:.7,c:79,fi:1.3,su:.1,salt:.01},
    {keys:['makaron'],kcal:350,p:12,f:1.5,c:72,fi:3,su:2,salt:.02},
    {keys:['oliwa','olej'],kcal:884,p:0,f:100,c:0,fi:0,su:0,salt:0},
    {keys:['jajko','jajka'],kcal:143,p:12.6,f:9.5,c:.7,fi:0,su:.4,salt:.36},
    {keys:['ser mozzarella','mozzarella'],kcal:280,p:28,f:17,c:3.1,fi:0,su:1,salt:1.6},
    {keys:['parmezan'],kcal:431,p:38,f:29,c:4.1,fi:0,su:.9,salt:3.8},
    {keys:['ser'],kcal:350,p:25,f:27,c:2,fi:0,su:.5,salt:1.8},
    {keys:['mleko'],kcal:61,p:3.2,f:3.3,c:4.8,fi:0,su:4.8,salt:.1},
    {keys:['śmietana','smietana'],kcal:292,p:2.4,f:30,c:3.2,fi:0,su:3.2,salt:.08},
    {keys:['jogurt grecki'],kcal:97,p:9,f:5,c:3.9,fi:0,su:3.9,salt:.09},
    {keys:['jogurt'],kcal:63,p:5.3,f:1.6,c:7,fi:0,su:7,salt:.12},
    {keys:['masło','maslo'],kcal:717,p:.9,f:81,c:.1,fi:0,su:.1,salt:.03},
    {keys:['ziemniaki','ziemniak'],kcal:77,p:2,f:.1,c:17,fi:2.2,su:.8,salt:.02},
    {keys:['batat'],kcal:86,p:1.6,f:.1,c:20,fi:3,su:4.2,salt:.14},
    {keys:['cebula'],kcal:40,p:1.1,f:.1,c:9.3,fi:1.7,su:4.2,salt:.01},
    {keys:['czosnek'],kcal:149,p:6.4,f:.5,c:33,fi:2.1,su:1,salt:.04},
    {keys:['pomidor','pomidory'],kcal:18,p:.9,f:.2,c:3.9,fi:1.2,su:2.6,salt:.01},
    {keys:['passata'],kcal:30,p:1.4,f:.2,c:5.6,fi:1.5,su:4,salt:.3},
    {keys:['awokado'],kcal:160,p:2,f:14.7,c:8.5,fi:6.7,su:.7,salt:.02},
    {keys:['wołowina','wolowina'],kcal:250,p:26,f:15,c:0,fi:0,su:0,salt:.18},
    {keys:['indyk'],kcal:135,p:29,f:1.6,c:0,fi:0,su:0,salt:.16},
    {keys:['łosoś','losos'],kcal:208,p:20,f:13,c:0,fi:0,su:0,salt:.15},
    {keys:['tuńczyk','tunczyk'],kcal:132,p:29,f:1,c:0,fi:0,su:0,salt:.3},
    {keys:['mąka','maka'],kcal:364,p:10,f:1,c:76,fi:2.7,su:.3,salt:.01},
    {keys:['cukier'],kcal:400,p:0,f:0,c:100,fi:0,su:100,salt:0},
    {keys:['miód','miod'],kcal:304,p:.3,f:0,c:82,fi:.2,su:82,salt:.01},
    {keys:['banan'],kcal:89,p:1.1,f:.3,c:23,fi:2.6,su:12,salt:.01},
    {keys:['jabłko','jablko'],kcal:52,p:.3,f:.2,c:14,fi:2.4,su:10,salt:.01}
  ];
  const UNITS={g:1,kg:1000,mg:.001,ml:1,l:1000,cl:10,dl:100,'łyżka':15,'łyżki':15,'lyzka':15,'łyżeczka':5,'łyżeczki':5,'lyzeczka':5,'szklanka':250,'szklanki':250,'szt':60,'szt.':60,'sztuka':60,'sztuki':60,'ząbek':5,'ząbki':5,'zabek':5,'opakowanie':200,'opak.':200,'garść':30};
  function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
  function findFood(name){const n=norm(name);let best=null,bestLen=0;for(const row of DB)for(const k of row.keys){const nk=norm(k);if(n.includes(nk)&&nk.length>bestLen){best=row;bestLen=nk.length}}return best}
  function grams(amount,unit,name){let a=Number(amount);if(!Number.isFinite(a)||a<=0)return 0;let u=norm(unit);if(UNITS[u])return a*UNITS[u];if(/jaj/.test(norm(name))&&!u)return a*60;return a}
  function estimateFromForm(){if(!window.ingredients)return null;let totals={kcal:0,p:0,f:0,c:0,fi:0,su:0,salt:0},matched=0,total=0;for(const row of [...ingredients.children]){const name=row.querySelector('.in')?.value||'';const amount=row.querySelector('.ia')?.value||'';const unit=row.querySelector('.iu')?.value||'';if(!name)continue;total++;const food=findFood(name);const g=grams(amount,unit,name);if(!food||!g)continue;matched++;const m=g/100;totals.kcal+=food.kcal*m;totals.p+=food.p*m;totals.f+=food.f*m;totals.c+=food.c*m;totals.fi+=food.fi*m;totals.su+=food.su*m;totals.salt+=food.salt*m}
    const portions=Math.max(1,Number(window.servings?.value)||1);for(const k in totals)totals[k]/=portions;return {totals,matched,total,confidence:total?matched/total:0};}
  function fillMacro(){const r=estimateFromForm();if(!r||!r.matched)return false;const t=r.totals;const set=(id,v,d=1)=>{const e=document.getElementById(id);if(e&&!Number(e.value))e.value=Number(v.toFixed(d))};set('kcal',t.kcal,0);set('protein',t.p);set('fat',t.f);set('carbs',t.c);set('fiber',t.fi);set('sugars',t.su);set('salt',t.salt,2);let note=document.getElementById('notes');if(note&&r.confidence<1){const msg=`Makro oszacowane automatycznie z ${r.matched}/${r.total} rozpoznanych składników.`;if(!note.value.includes(msg))note.value=(note.value?note.value+'\n\n':'')+msg}return true}
  window.CookClipMacroEstimator={estimateFromForm,fillMacro};
  document.addEventListener('input',e=>{if(e.target.closest?.('#ingredients'))setTimeout(fillMacro,100)});
  window.addEventListener('cookclip:imported',()=>setTimeout(fillMacro,100));
})();
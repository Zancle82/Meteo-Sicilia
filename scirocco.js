'use strict';
/* Zancle Meteo 1.0.2 — experimental pressure-gradient index.
   Model forecast, not observed pressure or a validated wind warning. */
(function(){
 const places=[
  ['Atene',37.9838,23.7275],
  ['Heraklion (Creta)',35.3387,25.1442],
  ['Cagliari',39.2238,9.1217],
  ['Alghero',40.5579,8.3193]
 ];
 const el=id=>document.getElementById(id);
 let loading=false, lastLoaded=0;
 const round=n=>Number(n).toFixed(1);
 const format=n=>(n>0?'+':'')+round(n)+' hPa';
 const nowLabel=t=>t.replace('T',' · ')+' (Italia)';
 function label(d){
  if(d<=0)return 'Gradiente nullo o negativo: nessun segnale positivo da questo indice.';
  if(d<5)return 'Gradiente positivo debole: segnale preliminare, da confrontare con vento e carte sinottiche.';
  if(d<10)return 'Gradiente positivo moderato (soglia sperimentale): verificare vento e direzione previsti.';
  return 'Gradiente positivo marcato (soglia sperimentale): controllare le previsioni del vento e gli avvisi ufficiali.';
 }
 function chart(data){
  const width=720,height=205,padL=42,padR=16,padT=17,padB=38;
  const values=data.map(p=>p.d),low=Math.min(-2,...values)-1,high=Math.max(2,...values)+1;
  const x=i=>padL+(width-padL-padR)*i/(data.length-1);
  const y=v=>padT+(high-v)/(high-low)*(height-padT-padB);
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  svg.setAttribute('role','img');svg.setAttribute('aria-label','Evoluzione oraria del gradiente barico previsto per 72 ore');
  function node(tag,attrs,text){
   const n=document.createElementNS(ns,tag);
   Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));
   if(text!==undefined)n.textContent=text;
   svg.appendChild(n);return n;
  }
  for(let i=0;i<=4;i++){
   const v=low+(high-low)*i/4;
   node('line',{x1:padL,y1:y(v),x2:width-padR,y2:y(v),stroke:'#41627e','stroke-dasharray':'3 4'});
   node('text',{x:padL-7,y:y(v)+4,fill:'#c5dced','font-size':11,'text-anchor':'end'},round(v));
  }
  node('line',{x1:padL,y1:y(0),x2:width-padR,y2:y(0),stroke:'#d9e8f5','stroke-width':1.5});
  node('polyline',{points:data.map((p,i)=>`${x(i)},${y(p.d)}`).join(' '),fill:'none',stroke:'#66c7f0','stroke-width':2.7,'stroke-linejoin':'round','stroke-linecap':'round'});
  for(let i=0;i<data.length;i+=12){
   node('text',{x:x(i),y:height-17,fill:'#d4e6f5','font-size':11,'text-anchor':'middle'},i===0?'Ora':`+${i}h`);
  }
  return svg;
 }
 async function load(force=false){
  if(loading||(!force&&Date.now()-lastLoaded<30*60*1000))return;
  loading=true;el('scirocco-status').textContent='Caricamento delle pressioni previste…';
  el('scirocco-reload').disabled=true;
  try{
   const reports=await Promise.all(places.map(async ([name,lat,lon])=>{
    const u=new URL('https://api.open-meteo.com/v1/forecast');
    Object.entries({latitude:lat,longitude:lon,hourly:'pressure_msl',timezone:'Europe/Rome',forecast_days:4}).forEach(([k,v])=>u.searchParams.set(k,v));
    const response=await fetch(u);
    if(!response.ok)throw new Error('API '+response.status);
    const j=await response.json();
    if(j.error||!j.hourly||!Array.isArray(j.hourly.time)||!Array.isArray(j.hourly.pressure_msl))throw new Error('Pressioni non disponibili');
    return j.hourly;
   }));
   const lookup=reports.map(r=>new Map(r.time.map((t,i)=>[t,r.pressure_msl[i]])));
   const first=reports[0].time;
   const now=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).format(new Date()).replace(' ','T');
   const start=first.findIndex(t=>t>=now);
   if(start<0)throw new Error('Orari previsionali non disponibili');
   const rows=first.slice(start,start+73).map(t=>{
    const v=lookup.map(m=>m.get(t));
    if(v.some(n=>!Number.isFinite(n)))return null;
    const east=(v[0]+v[1])/2,west=(v[2]+v[3])/2;
    return {t,east,west,d:east-west};
   }).filter(Boolean);
   if(rows.length<24)throw new Error('Serie temporale insufficiente');
   const firstRow=rows[0];
   el('scirocco-east').textContent=round(firstRow.east)+' hPa';
   el('scirocco-west').textContent=round(firstRow.west)+' hPa';
   el('scirocco-delta').textContent=format(firstRow.d);
   el('scirocco-reading').textContent=label(firstRow.d);
   el('scirocco-chart').replaceChildren(chart(rows));
   el('scirocco-status').textContent='Previsione da '+nowLabel(firstRow.t)+' · '+rows.length+' ore disponibili';
   lastLoaded=Date.now();
  }catch(e){
   el('scirocco-status').textContent='Indice non disponibile: '+e.message+'. Riprova più tardi.';
   el('scirocco-reading').textContent='Nessuna stima mostrata in assenza dei dati.';
  }finally{loading=false;el('scirocco-reload').disabled=false;}
 }
 document.querySelector('[data-tab="modelli"]')?.addEventListener('click',()=>load());
 document.querySelector('[data-tab="modelli"]')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')load()});
 el('scirocco-reload')?.addEventListener('click',()=>load(true));
 if(location.hash==='#modelli')load();
})();

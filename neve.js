'use strict';
/* Zancle Meteo Beta 1.0.5: forecast-only mountain snow dashboard */
(function(){
 const stations={
  sapienza:['Etna · Rifugio Sapienza',37.699,14.999,1910],
  provenzana:['Etna · Piano Provenzana',37.797,15.036,1800],
  'etna-alta':['Etna · quota 2500 m',37.748,15.005,2500],
  soro:['Nebrodi · Monte Soro',37.936,14.672,1847],
  floresta:['Nebrodi · Floresta',37.987,14.911,1275],
  femmina:['Nebrodi · Portella Femmina Morta',37.934,14.708,1520],
  battaglia:['Madonie · Piano Battaglia',37.880,14.024,1600],
  carbonara:['Madonie · Pizzo Carbonara',37.895,14.026,1979]
 };
 const $=id=>document.getElementById(id);let busy=false,stamp=0,lastKey='';
 const num=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
 const metric=(n,unit,d=1)=>Number.isFinite(n)?num(n,d)+' '+unit:'Non disponibile';
 const read=(array,i)=>Array.isArray(array)&&Number.isFinite(array[i])?array[i]:null;
 async function load(force=false){
  const key=$('snow-place').value;if(busy)return;
  if(!force&&key===lastKey&&Date.now()-stamp<20*60*1000)return;
  busy=true;$('snow-reload').disabled=true;$('snow-status').textContent='Caricamento previsioni montane…';
  const [name,lat,lon,elevation]=stations[key];
  try{
   const u=new URL('https://api.open-meteo.com/v1/forecast');
   Object.entries({latitude:lat,longitude:lon,elevation,timezone:'Europe/Rome',forecast_days:4,hourly:'temperature_2m,snowfall,snow_depth,freezing_level_height,wind_speed_10m'}).forEach(([k,v])=>u.searchParams.set(k,v));
   const response=await fetch(u);if(!response.ok)throw Error('API '+response.status);
   const json=await response.json();if(json.error||!json.hourly?.time)throw Error(json.reason||'Dati non disponibili');
   const h=json.hourly,now=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).format(new Date()).replace(' ','T');
   const i=h.time.findIndex(t=>t>=now);if(i<0)throw Error('Orari non disponibili');
   const sumSnow=(start,end)=>{const a=h.snowfall;if(!Array.isArray(a))return null;const vals=a.slice(start,end);return vals.length&&vals.every(Number.isFinite)?vals.reduce((x,y)=>x+y,0):null};
   const t=read(h.temperature_2m,i),depth=read(h.snow_depth,i),freeze=read(h.freezing_level_height,i),wind=read(h.wind_speed_10m,i);
   $('snow-temp').textContent=metric(t,'°C');$('snow-fall').textContent=metric(sumSnow(i,i+24),'cm');
   $('snow-depth').textContent=metric(depth===null?null:depth*100,'cm');$('snow-freezing').textContent=metric(freeze,'m',0);
   $('snow-wind').textContent=metric(wind,'km/h',0);$('snow-ice').textContent=t===null?'Non disponibile':t<=0?'Possibile':'Non segnalato';
   const outlook=$('snow-outlook');outlook.replaceChildren();
   for(let k=0;k<3;k++){
    const start=i+k*24,end=Math.min(i+(k+1)*24,h.time.length),temps=h.temperature_2m?.slice(start,end).filter(Number.isFinite)||[];
    const card=document.createElement('div');card.className='snow-day';
    const title=document.createElement('strong');title.textContent=k===0?'0–24 ore':k===1?'24–48 ore':'48–72 ore';
    const temp=document.createElement('small');temp.textContent='Temperatura: '+(temps.length?num(Math.min(...temps))+' / '+num(Math.max(...temps))+' °C':'Non disponibile');
    const snow=document.createElement('small');snow.textContent='Neve prevista: '+metric(sumSnow(start,end),'cm');
    card.append(title,temp,snow);outlook.append(card);
   }
   $('snow-status').textContent=name+' · quota modello '+elevation+' m · previsioni da '+h.time[i].replace('T',' ')+' (ora italiana)';
   stamp=Date.now();lastKey=key;
  }catch(err){$('snow-status').textContent='Dati non disponibili: '+err.message+'. Riprova più tardi.';}
  finally{busy=false;$('snow-reload').disabled=false;}
 }
 document.querySelector('[data-tab="neve"]')?.addEventListener('click',()=>load());
 document.querySelector('[data-tab="neve"]')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')load()});
 $('snow-place')?.addEventListener('change',()=>load(true));
 $('snow-reload')?.addEventListener('click',()=>load(true));
 if(location.hash==='#neve')load();
})();

'use strict';
/* Zancle Meteo Beta 1.0.3: Marine API forecasts, not navigational advice. */
(function(){
 const sites={
  stretto:[38.27,15.64],tirreno:[38.27,15.18],eolie:[38.50,14.95],palermo:[38.19,13.38],
  trapani:[38.07,12.47],canale:[37.59,12.50],agrigento:[37.20,13.55],
  ragusa:[36.73,14.58],siracusa:[37.04,15.34],catania:[37.49,15.19],taormina:[37.87,15.33]
 };
 const $=id=>document.getElementById(id);
 const fields={wave_height:'mare-wave',wave_direction:'mare-direction',wave_period:'mare-period',sea_surface_temperature:'mare-temp',ocean_current_velocity:'mare-current',ocean_current_direction:'mare-current-direction',swell_wave_height:'mare-swell',wind_wave_height:'mare-windwave'};
 let data=null, requestId=0, lastKey='',lastTime=0;
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 const fmt=(n,unit,d=1)=>finite(n)?n.toFixed(d)+' '+unit:'Non disponibile';
 const compass=n=>{if(!finite(n))return '—';return ['N','NE','E','SE','S','SO','O','NO'][Math.round(((n%360)+360)%360/45)%8]};
 function render(i){
  if(!data)return;
  const a=data.hourly||{};
  const value=k=>Array.isArray(a[k])?a[k][i]:null;
  $('mare-wave').textContent=fmt(value('wave_height'),'m');
  $('mare-direction').textContent=finite(value('wave_direction'))?compass(value('wave_direction'))+' · '+Math.round(value('wave_direction'))+'°':'Non disponibile';
  $('mare-period').textContent=fmt(value('wave_period'),'s');
  $('mare-temp').textContent=fmt(value('sea_surface_temperature'),'°C');
  // Open-Meteo reports ocean_current_velocity in km/h by default; explicitly request knots.
  const currentUnit=(data.hourly_units||{}).ocean_current_velocity||'km/h';
  const rawCurrent=value('ocean_current_velocity');
  const currentKn=finite(rawCurrent)?(currentUnit==='kn'?rawCurrent:currentUnit==='m/s'?rawCurrent*1.943844:currentUnit==='km/h'?rawCurrent/1.852:null):null;
  $('mare-current').textContent=fmt(currentKn,'kn');
  $('mare-current-direction').textContent=finite(value('ocean_current_direction'))?compass(value('ocean_current_direction'))+' · '+Math.round(value('ocean_current_direction'))+'°':'Non disponibile';
  $('mare-swell').textContent=fmt(value('swell_wave_height'),'m');
  $('mare-windwave').textContent=fmt(value('wind_wave_height'),'m');
  $('mare-data-note').textContent='Dati riferiti al punto marino del modello, non alla spiaggia o al porto. Le variabili mancanti sono indicate come non disponibili. Onde: direzione di provenienza; correnti: direzione verso cui scorrono.';
 }
 async function load(force=false){
  const key=$('mare-zone').value;
  if(!force&&key===lastKey&&Date.now()-lastTime<20*60*1000&&data)return;
  const id=++requestId;
  $('mare-status').textContent='Caricamento delle previsioni marine…';$('mare-hour').disabled=true;$('mare-reload').disabled=true;
  data=null;Object.values(fields).forEach(k=>$(k).textContent='—');
  const [lat,lon]=sites[key];
  const u=new URL('https://marine-api.open-meteo.com/v1/marine');
  Object.entries({latitude:lat,longitude:lon,timezone:'Europe/Rome',forecast_days:4,cell_selection:'sea',wind_speed_unit:'kn',hourly:Object.keys(fields).join(',')}).forEach(([k,v])=>u.searchParams.set(k,v));
  try{
   const r=await fetch(u);if(!r.ok)throw Error('Servizio '+r.status);
   const j=await r.json();if(j.error||!j.hourly||!Array.isArray(j.hourly.time))throw Error(j.reason||'Dati non disponibili');
   if(id!==requestId)return;
   data=j;lastKey=key;lastTime=Date.now();
   const now=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).format(new Date()).replace(' ','T');
   const start=Math.max(0,j.hourly.time.findIndex(t=>t>=now));
   const options=[];
   for(let i=start;i<Math.min(start+73,j.hourly.time.length);i++){
    const opt=document.createElement('option');opt.value=String(i);opt.textContent=(i===start?'Ora · ':'')+j.hourly.time[i].replace('T',' · ');options.push(opt);
   }
   if(!options.length)throw Error('Nessun orario disponibile');
   $('mare-hour').replaceChildren(...options);$('mare-hour').disabled=false;
   $('mare-status').textContent='Previsioni disponibili · '+options.length+' ore · ora italiana';
   render(Number(options[0].value));
  }catch(e){if(id===requestId){$('mare-status').textContent='Dati marini temporaneamente non disponibili: '+e.message+'. Riprova più tardi.';$('mare-data-note').textContent='Nessun valore stimato in assenza dei dati.';}}
  finally{if(id===requestId)$('mare-reload').disabled=false;}
 }
 $('mare-zone').addEventListener('change',()=>load(true));
 $('mare-hour').addEventListener('change',e=>render(Number(e.target.value)));
 $('mare-reload').addEventListener('click',()=>load(true));
 document.querySelector('[data-tab="mare"]')?.addEventListener('click',()=>load());
 if(location.hash==='#mare')load();
})();

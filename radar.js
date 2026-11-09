/* Zancle Meteo 0.9.6 - radar sperimentale RainViewer, test privato. */
'use strict';
(()=>{
 const el=id=>document.getElementById(id);
 let map=null,layer=null,frames=[],index=0,playing=null,busy=false,lastFetch=0;
 const status=el('radar-status'),time=el('radar-time');
 const buttons=['radar-back','radar-play','radar-next'];
 const setControls=()=>{buttons.forEach(id=>el(id).disabled=!frames.length);el('radar-play').textContent=playing?'⏸ Pausa':'▶ Riproduci'};
 const stop=()=>{if(playing){clearInterval(playing);playing=null;}setControls()};
 function show(i){
   if(!map||!frames.length)return;
   index=(i+frames.length)%frames.length;
   if(layer)map.removeLayer(layer);
   const frame=frames[index];
   // RainViewer public API: 256px tile pyramid; 0 = universal blue.
   layer=L.tileLayer(`https://tilecache.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,{opacity:.72,maxNativeZoom:7,maxZoom:12,attribution:'Radar © RainViewer'}).addTo(map);
   const dt=new Date(frame.time*1000);
   time.textContent='Fotogramma '+(index+1)+' di '+frames.length+' · '+dt.toLocaleString('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' (ora italiana)';
 }
 async function refresh(force=false){
  if(busy)return;
  if(!force&&frames.length&&Date.now()-lastFetch<5*60*1000){map?.invalidateSize();return}
  busy=true;stop();status.textContent='Caricamento delle immagini radar…';
  try{
   if(typeof L==='undefined')throw Error('Libreria mappa non disponibile. Controlla la connessione.');
   if(!map){map=L.map('radar-map',{zoomControl:true,scrollWheelZoom:false}).setView([37.55,14.2],7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(map);
    map.setMaxBounds([[34.7,10.3],[40.4,18.3]]);
   }
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
   let res;try{res=await fetch('https://api.rainviewer.com/public/weather-maps.json',{cache:'no-store',signal:controller.signal})}finally{clearTimeout(timer)}
   if(!res.ok)throw Error('Servizio radar non disponibile ('+res.status+')');
   const data=await res.json();const past=data?.radar?.past;
   if(!Array.isArray(past)||!past.length)throw Error('Nessun fotogramma radar disponibile');
   frames=past.filter(f=>Number.isFinite(f.time)&&typeof f.path==='string'&&f.path.startsWith('/v2/'));
   if(!frames.length)throw Error('Formato fotogrammi non riconosciuto');
   lastFetch=Date.now();show(frames.length-1);setControls();
   status.textContent='Radar attivo · '+frames.length+' immagini disponibili · tocca ▶ per animare';
  }catch(err){status.textContent='Impossibile caricare il radar: '+err.message+' Usa il collegamento alla Protezione Civile qui sotto.'}
  finally{busy=false;setTimeout(()=>map?.invalidateSize(),100)}
 }
 el('radar-back').addEventListener('click',()=>{stop();show(index-1)});
 el('radar-next').addEventListener('click',()=>{stop();show(index+1)});
 el('radar-play').addEventListener('click',()=>{if(playing){stop();return}if(!frames.length)return;playing=setInterval(()=>show(index+1),750);setControls()});
 el('radar-refresh').addEventListener('click',()=>refresh(true));
 el('tab-radar').addEventListener('click',()=>{refresh();setTimeout(()=>map?.invalidateSize(),150)});
 window.addEventListener('hashchange',()=>{if(location.hash==='#radar'){refresh();setTimeout(()=>map?.invalidateSize(),150)}else stop()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 if(location.hash==='#radar')setTimeout(refresh,200);
})();

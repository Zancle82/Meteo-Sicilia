"use strict";
/* Beta 1.0.7 — true OpenStreetMap coastlines; schematic, selectable current directions only. */
(function(){
 let map=null,flow=null,labels=[];
 const points=[
  ["Messina",38.1938,15.5540],
  ["Ganzirri",38.2584,15.6149],
  ["Capo Peloro",38.2679,15.6507],
  ["Villa San Giovanni",38.2179,15.6365],
  ["Punta Pezzo",38.2313,15.6380],
  ["Reggio Calabria",38.1113,15.6474]
 ];
 function setDirection(dir){
  document.querySelectorAll('[data-stretto-dir]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.strettoDir===dir)));
  const note=document.getElementById('stretto-dir-note');
  if(note)note.textContent=dir==='none'?'Visualizzazione geografica, senza indicazioni di corrente.':dir==='montante'?'Schema generale: montante dallo Ionio verso il Tirreno. NON rappresenta la corrente attuale.':'Schema generale: scendente dal Tirreno verso lo Ionio. NON rappresenta la corrente attuale.';
  if(!map)return;
  if(flow){map.removeLayer(flow);flow=null;}
  if(dir==='none')return;
  // The arrow is a simple directional legend over open water, not a velocity vector or a model trajectory.
  const north=dir==='montante';
  const coords=north?[[38.181,15.604],[38.196,15.610],[38.211,15.616]]:[[38.211,15.616],[38.196,15.610],[38.181,15.604]];
  const color=north?'#26baff':'#f16b61';
  const head=north?'▲':'▼';
  flow=L.layerGroup();
  L.polyline(coords,{color:'#092e49',weight:11,opacity:.75,interactive:false}).addTo(flow);
  L.polyline(coords,{color,weight:6,opacity:.95,interactive:false}).addTo(flow);
  L.marker(coords[2],{interactive:false,icon:L.divIcon({className:'',html:`<span class="stretto-flow-arrow" style="color:${color};font-size:27px;text-shadow:0 1px 3px #001a2d">${head}</span>`,iconSize:[30,32],iconAnchor:[15,16]})}).addTo(flow);
  flow.addTo(map);
 }
 function show(){
  const node=document.getElementById('stretto-map');
  if(!node||typeof L==='undefined')return;
  if(map){map.invalidateSize();return;}
  map=L.map(node,{scrollWheelZoom:false}).setView([38.225,15.61],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  points.forEach(([name,lat,lon])=>{
   L.circleMarker([lat,lon],{radius:5,color:'#fff',weight:2,fillColor:'#1686c5',fillOpacity:1}).addTo(map).bindPopup(name);
   const label=L.marker([lat,lon],{interactive:false,icon:L.divIcon({className:'',html:`<span class="stretto-place-label">${name}</span>`,iconSize:[0,0],iconAnchor:[-9,10]})}).addTo(map);
   labels.push(label);
  });
  const sync=()=>labels.forEach((marker,i)=>{const show=map.getZoom()>=12||i===0||i===2||i===3; if(show&&!map.hasLayer(marker))marker.addTo(map);if(!show&&map.hasLayer(marker))map.removeLayer(marker);});
  map.on('zoomend',sync);sync();
  setDirection(document.querySelector('[data-stretto-dir][aria-pressed="true"]')?.dataset.strettoDir||'none');
  setTimeout(()=>map.invalidateSize(),150);
 }
 document.querySelectorAll('[data-stretto-dir]').forEach(b=>b.addEventListener('click',()=>{show();setDirection(b.dataset.strettoDir)}));
 document.querySelector('[data-tab="mare"]')?.addEventListener('click',()=>setTimeout(show,80));
 if(!document.getElementById('panel-mare')?.hidden)setTimeout(show,250);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&map)setTimeout(()=>map.invalidateSize(),150)});
})();

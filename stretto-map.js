"use strict";
/* Geographically grounded map, not a tidal-current prediction. */
(function(){
 let map=null;
 const points=[
  ["Messina",38.1938,15.5540],
  ["Ganzirri",38.2584,15.6149],
  ["Capo Peloro / Torre Faro",38.2679,15.6507],
  ["Villa San Giovanni",38.2179,15.6365],
  ["Punta Pezzo",38.2313,15.6380],
  ["Reggio Calabria",38.1113,15.6474]
 ];
 function show(){
  const node=document.getElementById("stretto-map");
  if(!node||typeof L==="undefined")return;
  if(map){map.invalidateSize();return;}
  map=L.map(node,{scrollWheelZoom:false}).setView([38.218,15.615],11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
   maxZoom:18,attribution:"&copy; OpenStreetMap contributors"
  }).addTo(map);
  points.forEach(([name,lat,lon])=>L.circleMarker([lat,lon],{radius:5,color:"#f5f8ff",weight:2,fillColor:"#2b91cf",fillOpacity:1}).addTo(map).bindPopup(name));
  setTimeout(()=>map.invalidateSize(),150);
 }
 document.querySelector('[data-tab="mare"]')?.addEventListener("click",()=>setTimeout(show,80));
 if(!document.getElementById("panel-mare")?.hidden)setTimeout(show,250);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&map)setTimeout(()=>map.invalidateSize(),150)});
})();

'use strict';
const places={Messina:[38.1938,15.5540],Palermo:[38.1157,13.3615],Catania:[37.5079,15.0830],Siracusa:[37.0755,15.2866],Trapani:[38.0176,12.5362],Agrigento:[37.3097,13.5846],Enna:[37.5676,14.2797],Caltanissetta:[37.4901,14.0629],Ragusa:[36.9269,14.7255],'San Giovannello':[38.169473,15.519475]};
const $=id=>document.getElementById(id);const fmt=n=>Number.isFinite(n)?Math.round(n)+'°C':'—';
const weatherCode=c=>{if(c===0)return ['Sereno','☀️'];if(c<=3)return ['Parzialmente nuvoloso','🌤️'];if(c===45||c===48)return ['Nebbia','🌫️'];if(c>=51&&c<=67)return ['Pioggia','🌧️'];if(c>=71&&c<=77)return ['Neve','🌨️'];if(c>=80&&c<=82)return ['Rovesci','🌦️'];if(c>=95)return ['Temporale','⛈️'];return ['Variabile','☁️']};
const api='https://api.open-meteo.com/v1/forecast';let serial=0;
function url(lat,lon,model){const u=new URL(api);const args={latitude:lat,longitude:lon,timezone:'Europe/Rome',forecast_days:7,current:'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,surface_pressure,apparent_temperature,precipitation,weather_code',hourly:'temperature_2m,precipitation_probability,wind_speed_10m,wind_gusts_10m,weather_code',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'};if(model)args.models=model;Object.entries(args).forEach(([k,v])=>u.searchParams.set(k,v));return u.toString()}
async function get(url){const r=await fetch(url);if(!r.ok)throw Error('Servizio meteo non disponibile ('+r.status+')');const j=await r.json();if(j.error)throw Error(j.reason||'Dati non disponibili');return j}
function render(data,label){const c=data.current||{};$('place').textContent=label;$('temp').textContent=fmt(c.temperature_2m);$('description').textContent=weatherCode(c.weather_code)[0];$('humidity').textContent=Number.isFinite(c.relative_humidity_2m)?c.relative_humidity_2m+'%':'—';$('wind').textContent=Number.isFinite(c.wind_speed_10m)?Math.round(c.wind_speed_10m)+' km/h':'—';$('rain').textContent=Number.isFinite(c.precipitation)?c.precipitation+' mm':'—';$('pressure').textContent=Number.isFinite(c.surface_pressure)?Math.round(c.surface_pressure)+' hPa':'—';$('gust').textContent=Number.isFinite(c.wind_gusts_10m)?Math.round(c.wind_gusts_10m)+' km/h':'—';$('feels').textContent=fmt(c.apparent_temperature);const h=data.hourly||{},times=h.time||[];const now=(c.time||'').slice(0,13);let start=times.findIndex(t=>t.slice(0,13)>=now);if(start<0)start=0;renderCharts(h,start);$('hours').replaceChildren(...times.slice(start,start+12).map((t,k)=>{const i=start+k;const el=document.createElement('div');el.className='hour';el.innerHTML='<div></div><div class="symbol"></div><strong></strong><div class="muted"></div>';el.children[0].textContent=t.slice(11,16);el.children[1].textContent=weatherCode(h.weather_code?.[i])[1];el.children[2].textContent=fmt(h.temperature_2m?.[i]);el.children[3].textContent=(h.precipitation_probability?.[i]??'—')+'% ☔';return el}));const d=data.daily||{};$('days').replaceChildren(...(d.time||[]).map((date,i)=>{const el=document.createElement('div');el.className='day';const day=new Date(date+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'});const cells=[day,weatherCode(d.weather_code?.[i])[1],fmt(d.temperature_2m_max?.[i])+' / '+fmt(d.temperature_2m_min?.[i])+' · ☔ '+(d.precipitation_probability_max?.[i]??'—')+'%'];cells.forEach(t=>{const s=document.createElement('span');s.textContent=t;el.append(s)});return el}))}

function renderCharts(hourly,start){
 const root=$('charts');root.replaceChildren();
 const specs=[
  {title:'Temperatura',key:'temperature_2m',unit:'°C',color:'#f6ce77'},
  {title:'Probabilità di pioggia',key:'precipitation_probability',unit:'%',color:'#77c8ff',fixed:[0,100]},
  {title:'Vento',key:'wind_speed_10m',unit:' km/h',color:'#9ee3d0',zero:true}
 ];
 const ns='http://www.w3.org/2000/svg';
 const make=(tag,attrs={},text)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));if(text!==undefined)el.textContent=text;return el};
 for(const spec of specs){
  const values=(hourly[spec.key]||[]).slice(start,start+24).map(v=>v===null||v===undefined?NaN:Number(v));
  const times=(hourly.time||[]).slice(start,start+values.length);
  const card=document.createElement('div');card.className='chart-card';
  const heading=document.createElement('div');heading.className='chart-title';heading.textContent=spec.title;card.append(heading);
  const valid=values.filter(Number.isFinite);
  if(valid.length<2){const note=document.createElement('p');note.className='muted';note.textContent='Dati non disponibili per questo grafico.';card.append(note);root.append(card);continue}
  let min=Math.min(...valid),max=Math.max(...valid);
  let low=spec.fixed?spec.fixed[0]:spec.zero?0:Math.floor(min-1);
  let high=spec.fixed?spec.fixed[1]:spec.zero?Math.max(5,Math.ceil(max/5)*5):Math.ceil(max+1);
  if(high<=low)high=low+1;
  const W=360,H=210,left=52,right=12,top=12,bottom=34;
  const x=i=>left+i*(W-left-right)/Math.max(1,values.length-1);
  const y=v=>top+(high-v)*(H-top-bottom)/(high-low);
  const svg=make('svg',{viewBox:`0 0 ${W} ${H}`,class:'chart',role:'img','aria-label':spec.title+' con scala valori e orari',preserveAspectRatio:'xMidYMid meet'});
  for(let j=0;j<=4;j++){
   const val=low+(high-low)*(4-j)/4,yy=y(val);
   svg.append(make('line',{x1:left,y1:yy,x2:W-right,y2:yy,stroke:'#46637c','stroke-width':0.8,'stroke-dasharray':j===4?'':'3 4'}));
   svg.append(make('text',{x:left-7,y:yy+4,fill:'#c3d8eb','font-size':11,'text-anchor':'end'},(spec.unit==='%'||spec.unit==='°C'?Math.round(val):Math.round(val))+spec.unit));
  }
  const marks=[0,Math.floor((values.length-1)/3),Math.floor(2*(values.length-1)/3),values.length-1];
  [...new Set(marks)].forEach(i=>svg.append(make('text',{x:x(i),y:H-9,fill:'#c3d8eb','font-size':11,'text-anchor':i===0?'start':i===values.length-1?'end':'middle'},times[i]?.slice(11,16)||'')));
  let segment=[];const flush=()=>{if(segment.length>1)svg.append(make('polyline',{points:segment.join(' '),fill:'none',stroke:spec.color,'stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'}));segment=[]};
  values.forEach((v,i)=>{if(Number.isFinite(v)){segment.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`)}else flush()});flush();
  svg.append(make('circle',{cx:x(values.findIndex(Number.isFinite)),cy:y(values.find(Number.isFinite)),r:3.5,fill:spec.color}));
  card.append(svg);
  const summary=document.createElement('div');summary.className='chart-labels';summary.textContent=`Min ${Math.round(min)}${spec.unit} · Max ${Math.round(max)}${spec.unit} · ${valid.length} rilevazioni previste`;card.append(summary);root.append(card);
 }
}

async function models(lat,lon,id){const choices=[['ECMWF IFS','ecmwf_ifs025'],['GFS','gfs_seamless'],['ICON','icon_seamless']];$('models').textContent='Caricamento modelli…';const results=await Promise.allSettled(choices.map(async ([name,model])=>{const d=await get(url(lat,lon,model));const times=d.hourly?.time||[];const now=(d.current?.time||'').slice(0,13);let i=times.findIndex(t=>t.slice(0,13)>=now);if(i<0)i=0;return {name,temp:d.hourly?.temperature_2m?.[i]}}));if(id!==serial)return;$('models').replaceChildren(...results.map((r,i)=>{const row=document.createElement('div');row.className='model';const name=document.createElement('span');name.textContent=choices[i][0];const value=document.createElement('strong');value.textContent=r.status==='fulfilled'?fmt(r.value.temp):'Non disponibile';row.append(name,value);return row}))}
async function load(lat,lon,label){const id=++serial;$('status').textContent='Aggiornamento previsioni per '+label+'…';$('error').classList.add('hide');try{const data=await get(url(lat,lon));if(id!==serial)return;render(data,label);$('status').textContent='Previsioni aggiornate · '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});models(lat,lon,id).catch(()=>{});}catch(e){if(id!==serial)return;$('status').textContent='Impossibile aggiornare le previsioni';$('error').textContent=e.message+'; controlla la connessione e riprova.';$('error').classList.remove('hide')}}
$('city').addEventListener('change',e=>{const name=e.target.value;if(places[name])load(...places[name],name)});
$('gps').addEventListener('click',()=>{if(!navigator.geolocation){$('status').textContent='GPS non supportato dal browser';return}$('status').textContent='Richiesta posizione GPS…';navigator.geolocation.getCurrentPosition(p=>{const {latitude:lat,longitude:lon}=p.coords;if(lat<35.4||lat>39.0||lon<11.8||lon>16.0){$('status').textContent='La posizione sembra fuori dall’area siciliana. Scegli una città.';return}$('city').value='gps';load(lat,lon,'Posizione GPS')},()=>{$('status').textContent='Posizione non disponibile. Puoi scegliere una città.'},{enableHighAccuracy:true,timeout:12000,maximumAge:600000})});
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
load(...places.Messina,'Messina');

// Ecowitt station: independent from forecast and GPS selection.
const STATION_URL='https://meteo-sicilia-ecowitt.zancle1982.workers.dev/meteo';
function convertReading(v,kind){
 if(!v||v.value===null||v.value===undefined||v.value===''||!Number.isFinite(Number(v.value)))return '—';
 let n=Number(v.value),u=String(v.unit||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
 if(kind==='temp'){
  // Ecowitt supplies Fahrenheit; accept Unicode degree-symbol variants.
  if(u.includes('f'))n=(n-32)*5/9;
  else if(u==='k'||u.includes('kelvin'))n-=273.15;
  return n.toFixed(1).replace('.',',')+' °C';
 }
 if(kind==='humidity')return Math.round(n)+'%';
 if(kind==='wind'){
  if(u.includes('mph'))n*=1.609344;
  else if(u.includes('m/s'))n*=3.6;
  else if(u.includes('knot'))n*=1.852;
  return n.toFixed(1).replace('.',',')+' km/h';
 }
 if(kind==='pressure'){
  if(u.includes('inhg'))n*=33.8638867;
  else if(u==='pa')n/=100;
  else if(u==='kpa')n*=10;
  return Math.round(n)+' hPa';
 }
 if(kind==='rain'){
  if(u.includes('in'))n*=25.4;
  return n.toFixed(1).replace('.',',')+' mm'+(u.includes('/hr')||u.includes('/h')?'/h':'');
 }
 return String(n);
}
let stationBusy=false;
async function loadStation(){
 if(stationBusy)return;stationBusy=true;
 $('station-status').textContent='Aggiornamento dati reali…';
 try{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  let response;
  try{response=await fetch(STATION_URL,{cache:'no-store',signal:controller.signal})}finally{clearTimeout(timeout)}
  if(!response.ok)throw Error('Servizio temporaneamente non disponibile');
  const payload=await response.json();if(!payload.measurements)throw Error('Formato dati non riconosciuto');
  const m=payload.measurements;
  const entries=[['Temperatura','temperature','temp'],['Umidità','humidity','humidity'],['Percepita','feelsLike','temp'],['Vento','windSpeed','wind'],['Raffiche','windGust','wind'],['Pressione','pressure','pressure'],['Pioggia istantanea','rainRate','rain'],['Pioggia oggi','rainToday','rain']];
  $('station-grid').replaceChildren(...entries.map(([label,key,kind])=>{const box=document.createElement('div');box.className='station-metric';const small=document.createElement('small');small.textContent=label;const strong=document.createElement('strong');strong.textContent=convertReading(m[key],kind);box.append(small,strong);return box}));
  const times=Object.values(m).map(v=>Number(v?.time)).filter(v=>Number.isFinite(v)&&v>0);
  const timestamp=times.length?Math.max(...times)*1000:Date.parse(payload.fetchedAt);
  $('station-time').textContent=Number.isFinite(timestamp)?'Ultima misurazione: '+new Date(timestamp).toLocaleString('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Ora dell’ultima misurazione non disponibile';
  $('station-status').textContent='● Stazione collegata · misurazioni Ecowitt';
   updateStationComparison(m.temperature,timestamp);
 }catch(e){$('station-status').textContent='Stazione temporaneamente non disponibile. '+e.message}
 finally{stationBusy=false}
}
$('station-refresh').addEventListener('click',loadStation);
loadStation();setInterval(()=>{if(!document.hidden)loadStation()},60000);


// 0.4: independent same-location, same-hour comparison; no accuracy ranking.
const STATION_COORDS=places['San Giovannello'];
const COMPARE_MODELS=[['ECMWF IFS','ecmwf_ifs025'],['GFS','gfs_seamless'],['ICON','icon_seamless']];
let comparisonCache=null,comparisonPending=null,comparisonSeq=0;
function stationCelsius(reading){
 if(!reading||reading.value===null||reading.value===undefined||reading.value==='')return NaN;
 let n=Number(reading.value);if(!Number.isFinite(n))return NaN;
 const u=String(reading.unit||'').normalize('NFKC').toLowerCase();
 if(u.includes('f'))return (n-32)*5/9;
 if(u==='k'||u.includes('kelvin'))return n-273.15;
 return n;
}
function stationLocalHour(timestamp){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(timestamp));
 const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return `${v.year}-${v.month}-${v.day}T${v.hour}`;
}
async function getComparisonForecasts(){
 if(comparisonCache&&Date.now()-comparisonCache.at<15*60*1000)return comparisonCache.results;
 if(comparisonPending)return comparisonPending;
 comparisonPending=Promise.allSettled(COMPARE_MODELS.map(async ([name,model])=>{
  const d=await get(url(...STATION_COORDS,model));
  return {name,times:d.hourly?.time||[],temps:d.hourly?.temperature_2m||[]};
 })).then(results=>{comparisonCache={at:Date.now(),results};return results}).finally(()=>{comparisonPending=null});
 return comparisonPending;
}
async function updateStationComparison(reading,timestamp){
 const seq=++comparisonSeq,root=$('station-comparison'),status=$('comparison-status');
 const observed=stationCelsius(reading);
 if(!Number.isFinite(observed)||!Number.isFinite(timestamp)){
  root.replaceChildren();status.textContent='Temperatura o orario Ecowitt non disponibili.';return;
 }
 const hour=stationLocalHour(timestamp);
 const stale=Date.now()-timestamp>30*60*1000;
 status.textContent='Confronto dei modelli in caricamento…';
 try{
  const results=await getComparisonForecasts();if(seq!==comparisonSeq)return;
  const rows=[{name:'Ecowitt · osservata',temp:observed,delta:null}];
  for(let i=0;i<COMPARE_MODELS.length;i++){
   const result=results[i];let temp=NaN;
   if(result.status==='fulfilled'){
    const {times,temps}=result.value;
    const idx=times.findIndex(t=>t.slice(0,13)===hour);
    if(idx>=0&&temps[idx]!==null&&temps[idx]!==undefined)temp=Number(temps[idx]);
   }
   rows.push({name:COMPARE_MODELS[i][0],temp,delta:Number.isFinite(temp)?temp-observed:null});
  }
  root.replaceChildren(...rows.map(r=>{
   const row=document.createElement('div');row.className='comparison-row';
   const name=document.createElement('span');name.textContent=r.name;
   const right=document.createElement('div');right.className='comparison-values';
   const temp=document.createElement('strong');temp.textContent=Number.isFinite(r.temp)?r.temp.toFixed(1).replace('.',',')+' °C':'Non disponibile';right.append(temp);
   if(r.delta!==null){const diff=document.createElement('small');diff.textContent=(r.delta>0?'+':'')+r.delta.toFixed(1).replace('.',',')+' °C rispetto alla stazione';right.append(diff)}
   row.append(name,right);return row;
  }));
  const timeLabel=new Date(timestamp).toLocaleString('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  status.textContent=`Stazione: ${timeLabel} · modelli confrontati per l'ora ${hour.slice(11)}:00${stale?' · attenzione: misura non recente':''}`;
 }catch(e){if(seq===comparisonSeq)status.textContent='Confronto temporaneamente non disponibile.'}
}

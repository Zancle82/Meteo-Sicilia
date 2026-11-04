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
  const heading=document.createElement('div');heading.className='chart-title';heading.textContent=spec.title+' · prossime 24 ore';card.append(heading);
  const valid=values.filter(Number.isFinite);
  if(valid.length<2){const note=document.createElement('p');note.className='muted';note.textContent='Dati non disponibili per questo grafico.';card.append(note);root.append(card);continue}
  const min=Math.min(...valid),max=Math.max(...valid);
  let low=spec.fixed?spec.fixed[0]:spec.zero?0:Math.floor(min-1);
  let high=spec.fixed?spec.fixed[1]:spec.zero?Math.max(5,Math.ceil(max/5)*5):Math.ceil(max+1);
  if(high<=low)high=low+1;
  // Scroll horizontally on small screens: each hour gets its own legible position.
  const W=Math.max(720,values.length*34),H=230,left=48,right=18,top=18,bottom=43;
  const x=i=>left+i*(W-left-right)/Math.max(1,values.length-1);
  const y=v=>top+(high-v)*(H-top-bottom)/(high-low);
  const svg=make('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,role:'img','aria-label':spec.title+' con orari ogni due ore e punti orari'});
  for(let j=0;j<=4;j++){
   const val=low+(high-low)*(4-j)/4,yy=y(val);
   svg.append(make('line',{x1:left,y1:yy,x2:W-right,y2:yy,stroke:'#46637c','stroke-width':0.8,'stroke-dasharray':j===4?'':'3 4'}));
   svg.append(make('text',{x:left-6,y:yy+4,fill:'#c3d8eb','font-size':11,'text-anchor':'end'},Math.round(val)+spec.unit));
  }
  times.forEach((t,i)=>{
   if(i%2!==0 && i!==times.length-1)return;
   const xx=x(i);
   svg.append(make('line',{x1:xx,y1:top,x2:xx,y2:H-bottom,stroke:'#46637c','stroke-width':0.7,'stroke-dasharray':'2 5'}));
   svg.append(make('text',{x:xx,y:H-20,fill:'#c3d8eb','font-size':11,'text-anchor':'middle'},t.slice(11,16)));
   if(t.slice(11,13)==='00')svg.append(make('text',{x:xx,y:H-6,fill:'#c3d8eb','font-size':10,'text-anchor':'middle'},t.slice(8,10)+'/'+t.slice(5,7)));
  });
  let segment=[];const flush=()=>{if(segment.length>1)svg.append(make('polyline',{points:segment.join(' '),fill:'none',stroke:spec.color,'stroke-width':2.5,'stroke-linejoin':'round','stroke-linecap':'round'}));segment=[]};
  values.forEach((v,i)=>{if(Number.isFinite(v))segment.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`);else flush()});flush();
  const detail=document.createElement('div');detail.className='chart-labels';detail.style.marginTop='8px';detail.setAttribute('aria-live','polite');
  const format=v=>v.toLocaleString('it-IT',{maximumFractionDigits:1})+spec.unit;
  const select=i=>{
   if(!Number.isFinite(values[i]))return;
   detail.textContent=`${times[i].slice(8,10)}/${times[i].slice(5,7)} alle ${times[i].slice(11,16)} · ${format(values[i])}`;
   dots.forEach((dot,k)=>dot.setAttribute('r',k===i?'6':'3.5'));
  };
  const dots=[];
  values.forEach((v,i)=>{
   if(!Number.isFinite(v))return;
   const dot=make('circle',{cx:x(i),cy:y(v),r:3.5,fill:spec.color,stroke:'#0b1d30','stroke-width':1});
   const hit=make('circle',{cx:x(i),cy:y(v),r:14,fill:'transparent',tabindex:0,role:'button','aria-label':`${times[i].slice(11,16)}: ${format(v)}`});
   hit.style.cursor='pointer';hit.addEventListener('click',()=>select(i));hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(i)}});
   svg.append(dot,hit);dots[i]=dot;
  });
  const scroller=document.createElement('div');scroller.style.cssText='overflow-x:auto;max-width:100%;touch-action:pan-x pan-y;overscroll-behavior-x:contain';scroller.append(svg);card.append(scroller);
  const hint=document.createElement('div');hint.className='muted';hint.style.fontSize='12px';hint.textContent='Scorri lateralmente per vedere tutte le ore · tocca un punto per il valore esatto';card.append(hint,detail);
  const first=values.findIndex(Number.isFinite);if(first>=0)select(first);
  const summary=document.createElement('div');summary.className='chart-labels';summary.textContent=`Min ${format(min)} · Max ${format(max)} · ${valid.length} valori orari previsti`;card.append(summary);root.append(card);
 }
}

const FORECAST_MODELS=[['ECMWF IFS','ecmwf_ifs'],['ECMWF AIFS (AI)','ecmwf_aifs025_single'],['NOAA GFS','gfs_seamless'],['DWD ICON Europa','icon_eu'],['Météo-France ARPEGE','meteofrance_arpege_europe'],['Canada GEM','gem_global'],['ItaliaMeteo ICON-2I','italiameteo_arpae_icon_2i']];
let modelCoords=[...places.Messina],modelKey='',modelBusy=false,modelRequest=0;
const HORIZONS=[6,12,24,48,72];
const median=values=>{const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2};
const metric=(n,unit,digits=1)=>Number.isFinite(n)?n.toFixed(digits)+unit:'—';
function modelTime(date){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).format(date).replace(' ','T')+':00'}
async function models(lat,lon,id){
 const key=lat.toFixed(3)+','+lon.toFixed(3);
 if(modelKey===key||modelBusy)return;
 modelBusy=true;const request=++modelRequest,el=$('models');el.textContent='Caricamento dei modelli…';
 const u=new URL(api);
 Object.entries({latitude:lat,longitude:lon,timezone:'Europe/Rome',forecast_days:5,hourly:'temperature_2m,precipitation,wind_speed_10m'}).forEach(([k,v])=>u.searchParams.set(k,v));
 const targetTimes=HORIZONS.map(h=>({h,time:modelTime(new Date(Date.now()+h*3600000))}));
 const nearest=(times,target)=>{const index=times.indexOf(target);if(index>=0)return index;const ms=Date.parse(target);let best=-1,delta=Infinity;times.forEach((t,i)=>{const d=Math.abs(Date.parse(t)-ms);if(d<delta){delta=d;best=i}});return delta<=3*3600000?best:-1};
 try{
 const responses=await Promise.allSettled(FORECAST_MODELS.map(async ([name,model])=>{
  const mu=new URL(u);mu.searchParams.set('models',model);
  const d=await get(mu.toString()),hourly=d.hourly||{},times=hourly.time||[];
  const field=base=>hourly[base]||hourly[base+'_'+model]||Object.entries(hourly).find(([k,v])=>k.startsWith(base+'_')&&Array.isArray(v))?.[1]||[];
  const temp=field('temperature_2m'),rain=field('precipitation'),wind=field('wind_speed_10m');
  const values=targetTimes.map(({h,time})=>{const i=nearest(times,time);return {h,temp:i>=0?temp[i]:null,rain:i>=0?rain[i]:null,wind:i>=0?wind[i]:null}});
  if(!values.some(v=>Number.isFinite(v.temp)))throw Error('Nessun dato');
  return {name,model,values};
 }));
 if(id!==serial||request!==modelRequest)return;
 const good=responses.filter(r=>r.status==='fulfilled').map(r=>r.value);
 el.replaceChildren();
 const intro=document.createElement('p');intro.className='notice';intro.textContent=good.length+' modelli disponibili su '+FORECAST_MODELS.length+' · dati per la località selezionata.';el.append(intro);
 if(!good.length){const msg=document.createElement('p');msg.className='notice';msg.textContent='Nessun modello ha restituito dati. Riprova più tardi.';el.append(msg);return}
 const controls=document.createElement('div');controls.className='horizon-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Orizzonte previsionale');
 const output=document.createElement('div');
 function display(h){
  controls.querySelectorAll('button').forEach(b=>{const active=Number(b.dataset.horizon)===h;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});
  output.replaceChildren();
  const time=targetTimes.find(t=>t.h===h).time;
  const subtitle=document.createElement('p');subtitle.className='notice';subtitle.textContent='Previsione per '+time.replace('T',' alle ');output.append(subtitle);
  const values=good.map(g=>({name:g.name,...g.values.find(v=>v.h===h)}));
  const t=values.map(v=>v.temp).filter(Number.isFinite),r=values.map(v=>v.rain).filter(Number.isFinite),w=values.map(v=>v.wind).filter(Number.isFinite);
  if(t.length>=3){
   const panel=document.createElement('div');panel.className='panel consensus';
   const heading=document.createElement('strong');heading.textContent='Sintesi sperimentale · '+t.length+' modelli';panel.append(heading);
   const temp=document.createElement('p');temp.textContent='Temperatura mediana: '+metric(median(t),' °C')+' · intervallo '+metric(Math.min(...t),' °C')+' – '+metric(Math.max(...t),' °C');panel.append(temp);
   if(w.length>=3){const wind=document.createElement('p');wind.textContent='Vento mediano: '+metric(median(w),' km/h',0);panel.append(wind)}
   if(r.length>=3){const rain=document.createElement('p');const wet=r.filter(x=>x>=0.1).length;rain.textContent='Pioggia nell’ora: '+wet+' modelli su '+r.length+' prevedono almeno 0,1 mm · accumulo mediano '+metric(median(r),' mm');panel.append(rain)}
   const caveat=document.createElement('p');caveat.className='notice';caveat.textContent='Sintesi non calibrata: non sostituisce la previsione ufficiale. L’accordo tra modelli non è una probabilità di pioggia.';panel.append(caveat);output.append(panel);
  }
  values.forEach(v=>{const row=document.createElement('div');row.className='model';const name=document.createElement('span');name.textContent=v.name;const val=document.createElement('strong');val.textContent=metric(v.temp,'°C')+' · '+metric(v.rain,' mm')+' · '+metric(v.wind,' km/h',0);row.append(name,val);output.append(row)});
  responses.forEach((r,i)=>{if(r.status==='fulfilled')return;const row=document.createElement('div');row.className='model';const name=document.createElement('span');name.textContent=FORECAST_MODELS[i][0];const val=document.createElement('strong');val.textContent='Non disponibile';row.append(name,val);output.append(row)});
 }
 HORIZONS.forEach(h=>{const b=document.createElement('button');b.type='button';b.dataset.horizon=String(h);b.textContent='+'+h+' h';b.addEventListener('click',()=>display(h));controls.append(b)});
 el.append(controls,output);
 const legend=document.createElement('p');legend.className='notice';legend.textContent='Ordine dei valori: temperatura · pioggia oraria · vento. I modelli possono avere risoluzioni diverse. I dati provengono da Open-Meteo, per uso privato non commerciale.';el.append(legend);
 display(24);modelKey=key;
 }finally{modelBusy=false}
}
async function load(lat,lon,label){const id=++serial;$('status').textContent='Aggiornamento previsioni per '+label+'…';$('error').classList.add('hide');try{const data=await get(url(lat,lon));if(id!==serial)return;render(data,label);$('status').textContent='Previsioni aggiornate · '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});modelCoords=[lat,lon];modelKey="";if($("tab-modelli").getAttribute("aria-selected")==="true")models(lat,lon,id).catch(()=>{});}catch(e){if(id!==serial)return;$('status').textContent='Impossibile aggiornare le previsioni';$('error').textContent=e.message+'; controlla la connessione e riprova.';$('error').classList.remove('hide')}}
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

// 0.5 navigation: keep weather and station updates active while switching views.
(function initTabs(){
 const buttons=[...document.querySelectorAll('[data-tab]')];
 function activate(name){
  if(!buttons.some(b=>b.dataset.tab===name))name='previsioni';
  buttons.forEach(b=>{const active=b.dataset.tab===name;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;document.getElementById('panel-'+b.dataset.tab).hidden=!active;});
  if(location.hash!=='#'+name)history.replaceState(null,'','#'+name);if(name==='modelli')models(...modelCoords,serial).catch(()=>{$('models').textContent='Confronto temporaneamente non disponibile.'});
 }
 buttons.forEach((b,i)=>{b.addEventListener('click',()=>activate(b.dataset.tab));b.addEventListener('keydown',e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;e.preventDefault();const next=buttons[(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length];activate(next.dataset.tab);next.focus();});});
 window.addEventListener('hashchange',()=>activate(location.hash.slice(1)));
 activate(location.hash.slice(1)||'previsioni');
})();

'use strict';
const places={Messina:[38.1938,15.5540],Palermo:[38.1157,13.3615],Catania:[37.5079,15.0830],Siracusa:[37.0755,15.2866],Trapani:[38.0176,12.5362],Agrigento:[37.3097,13.5846],Enna:[37.5676,14.2797],Caltanissetta:[37.4901,14.0629],Ragusa:[36.9269,14.7255],'San Giovannello':[38.169473,15.519475]};
const $=id=>document.getElementById(id);const fmt=n=>Number.isFinite(n)?Math.round(n)+'°C':'—';
const weatherCode=c=>{if(c===0)return ['Sereno','☀️'];if(c<=3)return ['Parzialmente nuvoloso','🌤️'];if(c===45||c===48)return ['Nebbia','🌫️'];if(c>=51&&c<=67)return ['Pioggia','🌧️'];if(c>=71&&c<=77)return ['Neve','🌨️'];if(c>=80&&c<=82)return ['Rovesci','🌦️'];if(c>=95)return ['Temporale','⛈️'];return ['Variabile','☁️']};
const api='https://api.open-meteo.com/v1/forecast';let serial=0;
function url(lat,lon,model){const u=new URL(api);const args={latitude:lat,longitude:lon,timezone:'Europe/Rome',forecast_days:7,current:'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,surface_pressure,apparent_temperature,precipitation,weather_code',hourly:'temperature_2m,precipitation_probability,wind_speed_10m,wind_gusts_10m,weather_code',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset'};if(model)args.models=model;Object.entries(args).forEach(([k,v])=>u.searchParams.set(k,v));return u.toString()}
async function get(url){const r=await fetch(url);if(!r.ok)throw Error('Servizio meteo non disponibile ('+r.status+')');const j=await r.json();if(j.error)throw Error(j.reason||'Dati non disponibili');return j}
function render(data,label){updateCityBrand(label);const c=data.current||{};$('place').textContent=label;$('temp').textContent=fmt(c.temperature_2m);$('description').textContent=weatherCode(c.weather_code)[0];$('humidity').textContent=Number.isFinite(c.relative_humidity_2m)?c.relative_humidity_2m+'%':'—';$('wind').textContent=Number.isFinite(c.wind_speed_10m)?Math.round(c.wind_speed_10m)+' km/h':'—';$('rain').textContent=Number.isFinite(c.precipitation)?c.precipitation+' mm':'—';$('pressure').textContent=Number.isFinite(c.surface_pressure)?Math.round(c.surface_pressure)+' hPa':'—';$('gust').textContent=Number.isFinite(c.wind_gusts_10m)?Math.round(c.wind_gusts_10m)+' km/h':'—';$('feels').textContent=fmt(c.apparent_temperature);const h=data.hourly||{},times=h.time||[];const now=(c.time||'').slice(0,13);let start=times.findIndex(t=>t.slice(0,13)>=now);if(start<0)start=0;renderCharts(h,start);$('hours').replaceChildren(...times.slice(start,start+12).map((t,k)=>{const i=start+k;const el=document.createElement('div');el.className='hour';el.innerHTML='<div></div><div class="symbol"></div><strong></strong><div class="muted"></div>';el.children[0].textContent=t.slice(11,16);el.children[1].textContent=weatherCode(h.weather_code?.[i])[1];el.children[2].textContent=fmt(h.temperature_2m?.[i]);el.children[3].textContent=(h.precipitation_probability?.[i]??'—')+'% ☔';return el}));const d=data.daily||{};$('days').replaceChildren(...(d.time||[]).map((date,i)=>{const el=document.createElement('div');el.className='day';const day=new Date(date+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'});const cells=[day,weatherCode(d.weather_code?.[i])[1],fmt(d.temperature_2m_max?.[i])+' / '+fmt(d.temperature_2m_min?.[i])+' · ☔ '+(d.precipitation_probability_max?.[i]??'—')+'%'];cells.forEach(t=>{const s=document.createElement('span');s.textContent=t;el.append(s)});return el}))}

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

const FORECAST_MODELS=[['ECMWF IFS','ecmwf_ifs'],['ECMWF AIFS (AI)','ecmwf_aifs025_single'],['NOAA GFS','gfs_seamless'],['DWD ICON Europa','icon_eu'],['Météo-France ARPEGE','meteofrance_arpege_europe'],['Canada GEM','gem_global'],['ItaliaMeteo ICON-2I','italia_meteo_arpae_icon_2i']];
let modelCoords=[...places.Messina],modelKey='',modelBusy=false,modelRequest=0;
const modelCache=new Map();const MODEL_CACHE_MS=20*60*1000;
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
  const cacheKey=key+'|'+model;let d;const cached=modelCache.get(cacheKey);
  if(cached&&Date.now()-cached.saved<MODEL_CACHE_MS)d=cached.data;
  else{d=await get(mu.toString());modelCache.set(cacheKey,{saved:Date.now(),data:d})}
  const hourly=d.hourly||{},times=hourly.time||[];
  const field=base=>hourly[base]||hourly[base+'_'+model]||Object.entries(hourly).find(([k,v])=>k.startsWith(base+'_')&&Array.isArray(v))?.[1]||[];
  const temp=field('temperature_2m'),rain=field('precipitation'),wind=field('wind_speed_10m');
  const values=targetTimes.map(({h,time})=>{const i=nearest(times,time);return {h,temp:i>=0?temp[i]:null,rain:i>=0?rain[i]:null,wind:i>=0?wind[i]:null}});
  if(!values.some(v=>Number.isFinite(v.temp)))throw Error('Nessun dato');
  return {name,model,values,hourly:{times,temp,rain,wind}};
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
 display(24);
 // Experimental hourly multimodel forecast, based on the same responses already downloaded.
 const hourlySection=document.createElement('section');hourlySection.className='section';
 const hourlyTitle=document.createElement('h2');hourlyTitle.textContent='Previsione multimodello oraria · 72 ore';
 const hourlyInfo=document.createElement('p');hourlyInfo.className='notice';
 hourlyInfo.textContent='Mediana non calibrata dei modelli disponibili per ciascuna ora. Gli intervalli indicano la dispersione delle temperature, non l’incertezza statistica. La pioggia è un accumulo orario, non una probabilità.';
 const dayPicker=document.createElement('div');dayPicker.className='horizon-controls';
 const chartPanel=document.createElement('div');chartPanel.className='multimodel-chart';
 const chartCaption=document.createElement('p');chartCaption.className='notice';chartCaption.textContent='Temperatura mediana oraria (°C) · grafico del giorno selezionato';
 const cards=document.createElement('div');cards.className='hourly-cards';
 chartPanel.append(chartCaption);
 hourlySection.append(hourlyTitle,hourlyInfo,dayPicker,chartPanel,cards);el.append(hourlySection);
 const firstTimes=good.flatMap(g=>g.hourly.times).filter(Boolean).sort();
 const uniqueTimes=[...new Set(firstTimes)].filter(t=>Date.parse(t)>=Date.now()-3600000).slice(0,73);
 const byDate=new Map();
 uniqueTimes.forEach(t=>{const day=t.slice(0,10);if(!byDate.has(day))byDate.set(day,[]);byDate.get(day).push(t)});
 const lookup=good.map(g=>({name:g.name,map:new Map(g.hourly.times.map((t,i)=>[t,{temp:g.hourly.temp[i],rain:g.hourly.rain[i],wind:g.hourly.wind[i]}]))}));
 function svgNode(tag,attrs={}){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));return el}
 function drawChart(points){
  chartPanel.querySelector('svg')?.remove();
  if(points.length<2)return;
  const svg=svgNode('svg',{viewBox:'0 0 340 142',role:'img','aria-label':'Andamento della temperatura mediana nel giorno selezionato'});
  const min=Math.floor(Math.min(...points.map(x=>x.temp))-1),max=Math.ceil(Math.max(...points.map(x=>x.temp))+1);
  const y=v=>114-(v-min)/(max-min||1)*90;
  for(let i=0;i<3;i++){const val=min+(max-min)*i/2;const yy=y(val);svg.append(svgNode('line',{x1:37,y1:yy,x2:333,y2:yy,stroke:'#466481','stroke-width':0.7}));const label=svgNode('text',{x:3,y:yy+4,fill:'#c4d9ea','font-size':11});label.textContent=val.toFixed(0)+'°';svg.append(label)}
  const x=i=>37+i*296/(points.length-1);
  const path=points.map((pt,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(pt.temp).toFixed(1)).join(' ');
  svg.append(svgNode('path',{d:path,fill:'none',stroke:'#83d4ff','stroke-width':2.6,'stroke-linecap':'round','stroke-linejoin':'round'}));
  [0,Math.floor((points.length-1)/2),points.length-1].forEach(i=>{const t=svgNode('text',{x:x(i),y:135,fill:'#b5cee5','font-size':11,'text-anchor':i===0?'start':i===points.length-1?'end':'middle'});t.textContent=points[i].time.slice(11,16);svg.append(t)});
  chartPanel.append(svg);
 }
 function renderDay(day){
  dayPicker.querySelectorAll('button').forEach(b=>{const on=b.dataset.day===day;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
  cards.replaceChildren();const graphPoints=[];
  (byDate.get(day)||[]).forEach(time=>{
   const values=lookup.map(g=>g.map.get(time)).filter(Boolean);
   const temps=values.map(x=>x.temp).filter(Number.isFinite),winds=values.map(x=>x.wind).filter(Number.isFinite),rains=values.map(x=>x.rain).filter(Number.isFinite);
   if(temps.length<3)return;
   const medianTemp=median(temps);graphPoints.push({time,temp:medianTemp});
   const card=document.createElement('article');card.className='hourly-forecast-card';
   const header=document.createElement('div');header.className='hourly-card-header';
   const timeLabel=document.createElement('strong');timeLabel.textContent=time.slice(11,16);
   const temperature=document.createElement('strong');temperature.className='hourly-card-temperature';temperature.textContent=metric(medianTemp,'°C');
   header.append(timeLabel,temperature);card.append(header);
   const details=document.createElement('div');details.className='hourly-card-details';
   const items=[['Intervallo',metric(Math.min(...temps),'°C')+' – '+metric(Math.max(...temps),'°C')],['Vento',winds.length?metric(median(winds),' km/h',0):'—'],['Pioggia',rains.length?metric(median(rains),' mm'):'—'],['Modelli con pioggia',rains.filter(x=>x>=0.1).length+' / '+rains.length],['Modelli disponibili',String(temps.length)+' / '+FORECAST_MODELS.length]];
   items.forEach(([name,value])=>{const box=document.createElement('div');box.className='hourly-card-detail';const label=document.createElement('small');label.textContent=name;const strong=document.createElement('strong');strong.textContent=value;box.append(label,strong);details.append(box)});
   card.append(details);cards.append(card);
  });
  if(!cards.children.length){const msg=document.createElement('p');msg.className='notice';msg.textContent='Dati orari insufficienti per questo giorno.';cards.append(msg)}
  drawChart(graphPoints);
 }
 [...byDate.keys()].slice(0,4).forEach((day,i)=>{const b=document.createElement('button');b.type='button';b.dataset.day=day;b.textContent=i===0?'Oggi':new Date(day+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric'});b.addEventListener('click',()=>renderDay(day));dayPicker.append(b)});
 if(byDate.size)renderDay([...byDate.keys()][0]);
 modelKey=key;
 }finally{modelBusy=false}
}
async function load(lat,lon,label){const id=++serial;$('status').textContent='Aggiornamento previsioni per '+label+'…';$('error').classList.add('hide');try{const data=await get(url(lat,lon));if(id!==serial)return;render(data,label);renderAstronomy(data,lat,lon,id).catch(()=>{});$('status').textContent='Previsioni aggiornate · '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});modelCoords=[lat,lon];modelKey="";if($("tab-modelli").getAttribute("aria-selected")==="true")models(lat,lon,id).catch(()=>{});}catch(e){if(id!==serial)return;$('status').textContent='Impossibile aggiornare le previsioni';$('error').textContent=e.message+'; controlla la connessione e riprova.';$('error').classList.remove('hide')}}
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

// 0.9: monument shown only for the nine Sicilian provincial capitals.
const CITY_MONUMENTS={Messina:'Madonnina del Porto',Catania:'Elefante (Liotru)',Palermo:'Cattedrale',Agrigento:'Tempio della Concordia',Siracusa:'Duomo di Ortigia',Trapani:'Torre di Ligny',Ragusa:'Duomo di San Giorgio',Enna:'Castello di Lombardia',Caltanissetta:'Castello di Pietrarossa'};
function updateCityBrand(city){
 const caption=document.getElementById('monument-caption');
 document.querySelectorAll('#city-brand .landmark').forEach(el=>{el.style.display=el.dataset.city===city?'':'none'});
 if(caption)caption.textContent='';
}
updateCityBrand('Messina');

// Astronomical events: Sunrise-Sunset.org API v2 (local Italian time, no API key).
// The service supplies rise/set, phase and illumination together; no estimated lunar times.
const astroCache=new Map();
const moonNames={'New Moon':'Luna nuova','Waxing Crescent':'Falce crescente','First Quarter':'Primo quarto','Waxing Gibbous':'Gibbosa crescente','Full Moon':'Luna piena','Waning Gibbous':'Gibbosa calante','Last Quarter':'Ultimo quarto','Waning Crescent':'Falce calante'};
function moonPhaseSVG(fraction,waxing){
 const f=Math.max(0,Math.min(1,Number(fraction)/100));
 const svgNS='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('width','82');svg.setAttribute('height','82');svg.setAttribute('role','img');svg.setAttribute('aria-label','Disco lunare illuminato al '+Math.round(f*100)+'%');
 const disc=document.createElementNS(svgNS,'circle');disc.setAttribute('cx','50');disc.setAttribute('cy','50');disc.setAttribute('r','44');disc.setAttribute('fill','#102238');disc.setAttribute('stroke','#7897b3');disc.setAttribute('stroke-width','1.5');svg.append(disc);
 // The bright region is bounded by the outer lunar limb and an elliptical terminator.
 const coords=[];const N=64;
 for(let i=0;i<=N;i++){
  const y=-44+88*i/N;const r=Math.sqrt(Math.max(0,44*44-y*y));
  const xOuter=waxing?r:-r;
  coords.push([50+xOuter,50+y]);
 }
 for(let i=N;i>=0;i--){
  const y=-44+88*i/N;const r=Math.sqrt(Math.max(0,44*44-y*y));
  const terminator=(waxing?1:-1)*(1-2*f)*r;
  coords.push([50+terminator,50+y]);
 }
 const path=document.createElementNS(svgNS,'path');path.setAttribute('d','M'+coords.map(pt=>pt.map(n=>n.toFixed(2)).join(',')).join(' L')+' Z');path.setAttribute('fill','#f0e9d7');svg.append(path);
 return svg;
}
async function renderAstronomy(data,lat,lon,id){
 const grid=$('astro-grid'),note=$('astro-note');if(!grid)return;
 const day=data.daily?.time?.[0];if(!day)return;
 grid.textContent='Caricamento dati astronomici…';note.textContent='Fonte: Sunrise-Sunset.org';
 const key=[lat.toFixed(4),lon.toFixed(4),day].join(':');
 try{
  let record=astroCache.get(key);
  if(!record){
   const u=new URL('https://api.sunrise-sunset.org/v2');
   u.searchParams.set('lat',lat);u.searchParams.set('lng',lon);u.searchParams.set('date',day);u.searchParams.set('tz','Europe/Rome');
   const response=await fetch(u.toString());if(!response.ok)throw Error('HTTP '+response.status);
   record=await response.json();if(!record||!record.sunrise||!('moon_phase' in record))throw Error('Risposta incompleta');
   astroCache.set(key,record);
  }
  if(id!==serial)return;
  const fmtTime=v=>v?new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(v)):'Non oggi';
  const entries=[['🌅','Alba del Sole',fmtTime(record.sunrise)],['🌇','Tramonto del Sole',fmtTime(record.sunset)],['🌙','Sorgere della Luna',fmtTime(record.moonrise)],['🌘','Tramonto della Luna',fmtTime(record.moonset)]];
  grid.replaceChildren(...entries.map(([emoji,label,value])=>{const item=document.createElement('div');item.className='astro-item';const small=document.createElement('small');small.textContent=emoji+' '+label;const strong=document.createElement('strong');strong.textContent=value;item.append(small,strong);return item}));
  const phase=record.moon_phase;const illuminated=Number(record.moon_illumination);
  if(Number.isFinite(illuminated)&&moonNames[phase]){
   const panel=document.createElement('div');panel.className='moon-phase-panel';
   const visual=moonPhaseSVG(illuminated,phase.startsWith('Waxing')||phase==='First Quarter');
   const label=document.createElement('div');label.className='moon-phase-copy';
   const name=document.createElement('strong');name.textContent=moonNames[phase];
   const pct=document.createElement('span');pct.textContent=illuminated.toLocaleString('it-IT',{maximumFractionDigits:0})+'% illuminata';
   label.append(name,pct);panel.append(visual,label);grid.append(panel);
  }
  note.replaceChildren(document.createTextNode('Orari locali · '+new Date(day+'T12:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})+' · Fase lunare calcolata a mezzogiorno. “Non oggi” indica che l’evento non avviene nella giornata. Fonte: '));
  const link=document.createElement('a');link.href='https://sunrise-sunset.org/api';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Sunrise-Sunset.org';note.append(link);
 }catch(err){
  if(id!==serial)return;
  grid.replaceChildren();note.replaceChildren(document.createTextNode('Dati astronomici temporaneamente non disponibili. Verifica la connessione. Fonte: '));
  const link=document.createElement('a');link.href='https://sunrise-sunset.org/api';link.textContent='Sunrise-Sunset.org';link.target='_blank';link.rel='noopener noreferrer';note.append(link);
 }
}
// Lunar coordinates and atmospheric refraction, based on the standard low-precision astronomical formulae.
function moonAltitude(date,lat,lon){
 const rad=Math.PI/180,d=(date.getTime()-Date.UTC(2000,0,1,12))/86400000;
 const L=(218.316+13.176396*d)*rad,M=(134.963+13.064993*d)*rad,F=(93.272+13.229350*d)*rad;
 const lambda=L+6.289*rad*Math.sin(M),beta=5.128*rad*Math.sin(F),eps=23.4397*rad;
 const ra=Math.atan2(Math.sin(lambda)*Math.cos(eps)-Math.tan(beta)*Math.sin(eps),Math.cos(lambda));
 const dec=Math.asin(Math.sin(beta)*Math.cos(eps)+Math.cos(beta)*Math.sin(eps)*Math.sin(lambda));
 const sidereal=(280.16+360.9856235*d)*rad+lon*rad;
 const phi=lat*rad,H=sidereal-ra;
 return Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H));
}
function moonEventsForDate(day,lat,lon){
 // Get the start of the given civil day in Europe/Rome (handles DST).
 const noon=new Date(day+'T12:00:00Z');
 const tzPart=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',timeZoneName:'shortOffset'}).formatToParts(noon).find(x=>x.type==='timeZoneName')?.value||'GMT+1';
 const m=tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
 const offset=m?(m[1]==='+'?1:-1)*(Number(m[2])*60+Number(m[3]||0)):60;
 const start=Date.parse(day+'T00:00:00Z')-offset*60000;
 const endDay=new Date(start+36*3600000);
 const fmtDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'});
 const fmtClock=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const result={};const threshold=0.133*Math.PI/180;
 let previous=moonAltitude(new Date(start),lat,lon)-threshold;
 for(let t=start+5*60000;t<=endDay.getTime();t+=5*60000){
  const current=moonAltitude(new Date(t),lat,lon)-threshold;
  if((previous<=0&&current>0)||(previous>=0&&current<0)){
   const crossing=t-5*60000+5*60000*Math.abs(previous)/(Math.abs(previous)+Math.abs(current));
   const when=new Date(crossing);
   if(fmtDay.format(when)===day){const key=current>previous?'rise':'set';if(!result[key])result[key]=fmtClock.format(when)}
  }
  previous=current;
 }
 return result;
}

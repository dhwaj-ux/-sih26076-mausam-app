/**
 * MAUSAM - pure logic engine (no DOM).
 * Shared by the browser and the Node backend, and unit-testable in isolation.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MAUSAM_ENGINE = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  var D = (typeof module === 'object' && module.exports)
    ? require('./data.js')
    : root.MAUSAM_DATA;
  var PERSONAS = D.PERSONAS, STATES = D.STATES, CROPS = D.CROPS, SEASONS = D.SEASONS;

  /* live state - written by the host app / server before calling into the engine */
  var WX = null, AQ = null, MAR = null, CUR = 'agri';
  var S = { name: 'Maharashtra', land: 2 };

  function setWeather(v) { WX = v; }
  function setAir(v) { AQ = v; }
  function setMarine(v) { MAR = v; }
  function setPersona(v) { CUR = v; }
  function setProfile(name, land) { S = { name: name, land: land }; }
  function getState() { return { WX: WX, AQ: AQ, MAR: MAR, CUR: CUR, S: S }; }

function wIcon(c){if(c===0)return"☀️";if(c<=3)return"⛅";if(c<=48)return"🌫️";if(c<=67)return"🌧️";if(c<=77)return"❄️";if(c<=82)return"🌦️";return"⛈️"}
function aqiCat(v){
  if(v<=50)return{c:"Good",col:"#22c55e",r:"The air is clean — outdoor activity is completely safe."};
  if(v<=100)return{c:"Moderate",col:"#eab308",r:"Mostly fine; sensitive people should take a little care."};
  if(v<=150)return{c:"Unhealthy (Sensitive)",col:"#f97316",r:"Asthma patients, children and the elderly should reduce outdoor exercise."};
  if(v<=200)return{c:"Unhealthy",col:"#ef4444",r:"Everyone should minimise outdoor activity; a mask is essential."};
  if(v<=300)return{c:"Very Unhealthy",col:"#a855f7",r:"Avoid going outdoors; keep windows shut and run a purifier."};
  return{c:"Hazardous",col:"#7f1d1d",r:"Emergency level! Stay indoors at all times."};
}

function wxAdvice(){
  if(!WX)return"";
  if(AQ&&AQ.aqi>150)return"😷 Air quality is poor — reduce outdoor activity and wear a mask.";
  if(WX.rain3>25)return"🌧️ Rain over the next 3 days — stop spraying and irrigation, and check drainage.";
  if(WX.temp>38)return"🔥 Extreme heat — work in the early morning or evening, and stay hydrated.";
  if(WX.temp<8)return"❄️ Very cold — wear layers and protect the crop from frost.";
  if(WX.hum>85)return"💦 High humidity — fungal risk, plan a preventive spray.";
  if(WX.wind>30)return"🌬️ Strong wind — do not spray or fly a drone today.";
  return"✅ Weather is favourable — you can follow your normal plan.";
}

function nextHours(n){ if(!WX)return[]; const r=[]; for(let i=WX.nowIdx;i<Math.min(WX.htime.length,WX.nowIdx+n);i++) r.push({t:WX.htime[i],temp:WX.htemp[i],feels:WX.hfeels[i],rain:WX.hrain[i]||0,prob:WX.hprob[i]||0,code:WX.hcode[i],wind:WX.hwind[i],hum:WX.hhum?WX.hhum[i]:null,uv:WX.huv?WX.huv[i]:null,aqi:AQ?AQ.haqi[i]:null}); return r; }
function hhmm(iso){return iso.slice(11,16)}
function bestWindow(){
  if(!WX)return null; const arr=nextHours(24).filter(h=>{const hh=+hhmm(h.t).slice(0,2);return hh>=5&&hh<=21});
  if(!arr.length)return null; let best=null;
  for(const h of arr){ const a=h.aqi||AQ&&AQ.aqi||60;
    const score=Math.abs(h.feels-22)*1.7 + h.rain*9 + h.prob*0.06 + Math.max(0,a-50)*0.45 + Math.max(0,h.wind-20)*0.5;
    if(!best||score<best.score) best={...h,score};
  }
  const i=arr.indexOf(arr.find(x=>x.t===best.t));
  return {from:best, to:arr[Math.min(arr.length-1,i+1)], arr};
}
function rainSummary(hs){
  const wet=hs.filter(h=>h.rain>0.2||h.prob>50);
  if(!wet.length) return {wet:false,html:"No rain signal — the weather is likely to stay clear."};
  const first=wet[0], last=wet[wet.length-1];
  const peak=wet.reduce((a,b)=>b.rain>a.rain?b:a);
  return {wet:true,first,last,peak,html:`Rain is likely between ${hhmm(first.t)} and ${hhmm(last.t)}, peaking at ${hhmm(peak.t)} (${peak.rain.toFixed(1)}mm, ${peak.prob}% chance).`};
}

/* ===================== SUGGESTIONS (persona) ===================== */

function bestDayText(){
  if(!WX)return"";
  let bi=0,bs=1e9;
  for(let i=0;i<Math.min(5,WX.dmax.length);i++){
    const sc=(WX.dsum[i]||0)*3 + Math.abs(WX.dmax[i]-26)*1.2 + (WX.duv[i]>9?6:0);
    if(sc<bs){bs=sc;bi=i}
  }
  const d=new Date(WX.dtime[bi]);
  return `Best day: <b>${WX.dtime[bi]}</b> (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]}) — ${Math.round(WX.dmax[bi])}°/${Math.round(WX.dmin[bi])}°, rain ${(WX.dsum[bi]||0).toFixed(1)}mm.`;
}
function packText(){
  const t=WX.temp,r=WX.rain3,uv=WX.duv[0],a=[]; 
  if(r>10)a.push("☔ umbrella + raincoat + waterproof bag");
  if(t<15)a.push("🧥 jacket/sweater (layers)");
  if(t>=30)a.push("👕 cotton/light clothes, cap, sunglasses");
  if(uv>=8)a.push("🧴 SPF 50 sunscreen");
  if(WX.wind>25)a.push("🧣 windcheater");
  a.push("💧 water bottle, power bank, medicines");
  return a.join(" · ");
}

/* ---- comfort index (Event Planners) ---- */
function comfortIndex(feels,hum,rainProb,wind,uv){
  const t=100-Math.min(100,Math.abs((feels==null?24:feels)-24)*4.5);
  const h=100-Math.min(100,Math.abs((hum==null?50:hum)-50)*1.6);
  const r=100-Math.min(100,Math.max(0,rainProb||0));
  const w=100-Math.min(100,Math.max(0,(wind||0)-15)*3);
  const u=100-Math.min(100,Math.max(0,(uv||0)-6)*8);
  return Math.max(0,Math.min(100,Math.round(0.35*t+0.20*h+0.30*r+0.10*w+0.05*u)));
}
function comfortInfo(sc){
  if(sc>=80)return{s:sc,label:"Excellent — ideal conditions",col:"#22c55e",adv:"Perfect for an outdoor event — just keep a basic backup."};
  if(sc>=65)return{s:sc,label:"Good — comfortable",col:"#84cc16",adv:"An outdoor event will run well; arrange water and shade."};
  if(sc>=50)return{s:sc,label:"Fair — acceptable",col:"#eab308",adv:"Outdoor is possible but needs planning — shade, water and a tarp backup."};
  if(sc>=35)return{s:sc,label:"Poor — uncomfortable",col:"#f97316",adv:"An outdoor event will be difficult; change the timing or keep an indoor backup."};
  return{s:sc,label:"Bad — avoid outdoor",col:"#ef4444",adv:"Avoid an outdoor event; choose an indoor venue."};
}
function nowComfort(){if(!WX)return null;const p=nextHours(1)[0];return comfortIndex(WX.feels,WX.hum,p?p.prob:0,WX.wind,WX.duv[0]);}
function dayComfort(i){
  if(!WX)return 0;
  const tmean=(WX.dmax[i]+WX.dmin[i])/2;
  const rainProb=Math.min(100,(WX.dsum[i]||0)*12);
  return comfortIndex(tmean,WX.hum,rainProb,15,WX.duv[i]||0);
}
function bestEventWindow(){
  if(!WX)return null;const arr=nextHours(24).filter(h=>{const hh=+hhmm(h.t).slice(0,2);return hh>=8&&hh<=21});
  if(!arr.length)return null;let best=null;
  for(const h of arr){const sc=comfortIndex(h.feels,h.hum==null?WX.hum:h.hum,h.prob,h.wind,h.uv==null?0:h.uv);if(!best||sc>best.sc)best={...h,sc}}
  return best;
}

/* ---- marine helpers (Beachgoers & Surfers) ---- */
function dirName(d){if(d==null)return"–";return ["N","NE","E","SE","S","SW","W","NW"][Math.round(((d%360)/45))%8]}
function surfRating(w){
  if(w==null)return{c:"–",col:"#9fb0d0",t:"No data available"};
  if(w<0.5)return{c:"Flat",col:"#9fb0d0",t:"Surf is flat — good for a beach or swim day"};
  if(w<1.0)return{c:"Small",col:"#22c55e",t:"Good for beginner surfers"};
  if(w<1.5)return{c:"Fun",col:"#84cc16",t:"Best for intermediate surfers"};
  if(w<2.5)return{c:"Good",col:"#eab308",t:"Solid conditions for advanced surfers"};
  if(w<3.5)return{c:"Big",col:"#f97316",t:"Experts only — beginners should stay out"};
  return{c:"Dangerous",col:"#ef4444",t:"Do not enter the water — life-threatening swell"};
}
function seaTempInfo(t){
  if(t==null)return{c:"–",col:"#9fb0d0",t:""};
  if(t<18)return{c:"Cold",col:"#38bdf8",t:"A wetsuit is needed; do not stay in the water long"};
  if(t<22)return{c:"Cool",col:"#22d3ee",t:"Refreshing — a short swim is fine"};
  if(t<28)return{c:"Perfect",col:"#22c55e",t:"Ideal for swimming"};
  return{c:"Warm",col:"#eab308",t:"Warm as bath water — stay hydrated"};
}
function tideInfo(){
  if(!MAR||!MAR.htime||!MAR.hlevel)return null;
  const nowKey=(WX&&WX.htime?WX.htime[WX.nowIdx]:"").substring(0,13);
  let i0=MAR.htime.findIndex(t=>t.substring(0,13)===nowKey); if(i0<0)i0=0;
  const seg=[];
  for(let i=i0;i<Math.min(MAR.htime.length,i0+25);i++) if(MAR.hlevel[i]!=null) seg.push({t:MAR.htime[i],v:MAR.hlevel[i]});
  if(seg.length<6)return null;
  const highs=[],lows=[];
  for(let i=1;i<seg.length-1;i++){
    if(seg[i].v>seg[i-1].v&&seg[i].v>=seg[i+1].v)highs.push(seg[i]);
    if(seg[i].v<seg[i-1].v&&seg[i].v<=seg[i+1].v)lows.push(seg[i]);
  }
  return {high:highs[0]||null,low:lows[0]||null,rising:seg[seg.length-1].v>seg[0].v};
}

/* ===================== CROP PLANNER ===================== */
function plan(){
  const s=document.getElementById("state2").value,se=document.getElementById("season").value,fo=document.getElementById("focus").value;
  const d=STATES[s];if(!d)return;const map={kharif:d.kharif,rabi:d.rabi,zaid:d.zaid};
  const low=["Bajra","Jowar","Moong","Gram","Mustard","Groundnut","Tur","Barley","Moth"],high=["Cotton","Sugarcane","Onion","Banana","Vegetables","Cumin","Chilli","Turmeric","Ginger","Potato"];
  let list=se==="all"?[...d.kharif,...d.rabi,...d.zaid]:map[se];
  list=list.filter(c=>fo==="water"?low.some(x=>c.includes(x.split(" ")[0])):fo==="profit"?high.some(x=>c.includes(x.split(" ")[0])):true);
  list=[...new Set(list)];
  const seasonOf=c=>{for(const[k,v]of Object.entries(map))if(v.includes(c))return k;return null};
  document.getElementById("planOut").innerHTML=`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(275px,1fr))">
    ${list.map(c=>{const key=Object.keys(CROPS).find(k=>c.startsWith(k)||k.startsWith(c.split(" ")[0]))||"";const ci=CROPS[key]||{};const sn=seasonOf(c);
      return `<div class="card" style="padding:14px"><h3 style="margin-bottom:8px">🌾 ${c} ${sn?`<span style="color:var(--acc)">${SEASONS[sn].name}</span>`:""}</h3>
      <div class="wmeta" style="font-size:12px;line-height:1.9">
      ${ci.sow?`📅 <b>Sow:</b> ${ci.sow}<br>`:""}${ci.harv?`🌾 <b>Harvest:</b> ${ci.harv}<br>`:""}
      ${ci.water?`💧 <b>Water:</b> ${ci.water}<br>`:""}${ci.soil?`🟤 <b>Soil:</b> ${ci.soil}<br>`:""}
      ${ci.fert?`🧪 <b>Fertilizer:</b> ${ci.fert}<br>`:""}</div>
      ${ci.tip?`<div class="note ok" style="margin-top:9px;font-size:11.5px">${ci.tip}</div>`:""}</div>`}).join("")}</div>`;
}

/* ===================== OFFLINE ENGINE (never fails) =====================
   All answers are written in ENGLISH.
   Keyword scanning understands Hindi (Devanagari), Hinglish and English. */
function H(){const s=S.name,d=STATES[s]||{};
  return `<div class="note ok" style="margin:0 0 10px">📍 <b>${PERSONAS[CUR].icon} ${PERSONAS[CUR].name}</b> ${WX?`· ${WX.city}: <b>${WX.temp}°C</b> ${AQ?`· AQI <b>${AQ.aqi}</b>`:""}`:""} ${CUR==="agri"?`· ${s} · soil <b>${d.soil||"-"}</b> · <b>${SEASONS[curSeason()].name}</b>`:""}</div>`;}

function offline(q){
  const ql=q.toLowerCase();
  let ans=H()+({agri:offAgri,run:offRun,school:offSchool,travel:offTravel,aqi:offAqi,commute:offCommute,beach:offBeach,event:offEvent}[CUR])(ql,q);
  // Persona routing: if the question belongs to another persona's domain, say so.
  const dom=detectDomain(ql);
  if(dom && dom!==CUR){
    ans+=`<div class="note">💡 This question belongs to the <b>${PERSONAS[dom].icon} ${PERSONAS[dom].name}</b> persona. Switch persona above to get the exact answer.</div>`;
  }
  return ans;
}

/* ---- which persona does this question belong to? (Hindi + Hinglish + English) ---- */
function detectDomain(ql){
  const map={
    agri:["soil","mitti","zameen","bhoomi","crop","fasal","kharif","rabi","zaid","sow","boye","lagau","khad","fertilizer","urea","dap","npk","pest","keeda","rog","mandi","msp","kisan","yojana","मिट्टी","माटी","फसल","बीज","खाद","कीट","कीड़ा","रोग","सिंचाई","पानी","मौसम","किसान","योजना","बुवाई"],
    run:["run","running","jog","workout","gym","pace","stamina","cardio","warm-up","stretch","दौड़","व्यायाम","वर्कआउट"],
    school:["school","bachch","bacche","kids","child","picnic","outing","umbrella","raincoat","family","स्कूल","बच्चे","बच्चों","पिकनिक","छाता"],
    travel:["travel","trip","packing","pack ","flight","hotel","destination","itinerary","sightseeing","यात्रा","ट्रिप","घूमना","पैकिंग"],
    aqi:["aqi","air quality","pm2.5","pm10","mask","asthma","allergy","purifier","pollen","smog","वायु","प्रदूषण","मास्क","धुआं"],
    commute:["commute","office","traffic","nikalna","nikal","bike","car ","cab","route","leave time","nowcast","fog","यातायात","ऑफिस","गाड़ी","बस","धुंध"],
    beach:["beach","wave","surf","tide","sea","swim","samudra","lifeguard","rip current","समुद्र","लहर","ज्वार","तैरना"],
    event:["event","wedding","shaadi","party","function","venue","comfort index","gathering","शादी","समारोह","पार्टी","आयोजन"],
  };
  let best=null,bestN=0;
  for(const [k,words] of Object.entries(map)){
    const n=words.reduce((a,w)=>a+(ql.includes(w)?1:0),0);
    if(n>bestN){bestN=n;best=k}
  }
  return bestN>0?best:null;
}

/* ---- AGRI ---- */
function offAgri(ql,q){
  const s=S.name,d=STATES[s]||{},sk=curSeason();
  if(/soil|mitti|zameen|bhoomi|मिट्टी|माटी/.test(ql))return `<b>🌱 Soil in ${s}:</b> ${d.soil}<br><br><b>Best crops for this soil:</b><ul>${d.kharif.slice(0,3).map(c=>`<li>${c} (Kharif)</li>`).join("")}${d.rabi.slice(0,3).map(c=>`<li>${c} (Rabi)</li>`).join("")}</ul><b>Soil improvement:</b><ul><li>Get a soil test every 2 years (pH, N-P-K, organic carbon)</li><li>Grow green manure (dhaincha / sunhemp)</li><li>Add 5-10 tonnes of organic compost per acre</li><li>Do not burn crop residue</li></ul>`;
  if(/weather|barish|rain|aaj|today|मौसम|बारिश/.test(ql)){ if(!WX)return "⚠️ First search your city on the <b>Home tab</b>.";return `<b>${WX.city} today:</b> ${wIcon(WX.code)} ${WX.temp}°C, humidity ${WX.hum}%, rain over the next 3 days ${WX.rain3.toFixed(1)}mm.<br><br><b>${wxAdvice()}</b><br><br><b>Today's field work:</b><ul><li>${WX.rain3>25?"Stop irrigation and check field drainage":"Light irrigation or weeding is fine"}</li><li>${WX.wind>30?"Do not spray today":"Spray between 7-10 am"}</li><li>${WX.hum>85?"Watch out for fungal disease":"Follow the nutrient schedule"}</li></ul>`}
  if(/fertilizer|khad|urea|dap|npk|paani|water|irrigation|खाद|सिंचाई|पानी/.test(ql))return `<b>🧪 ${s} — fertilizer &amp; irrigation:</b><ul><li><b>Cereals (Wheat/Rice):</b> NPK 100-120:50-60:40-50 kg/ha</li><li><b>Pulses:</b> NPK 20-25:40-50:20-25 + rhizobium seed treatment</li><li><b>Oilseeds:</b> NPK + sulphur (raises oil content)</li><li><b>Cotton/Sugarcane:</b> high nitrogen + boron/zinc</li></ul><b>💧 Irrigation:</b><ul><li>Wheat: 4-6 irrigations; the CRI stage (20-25 days) is critical</li><li>Rice: alternate wetting and drying saves about 30% of water</li><li>Drip or sprinkler: saves 40-50%</li><li>${WX?"Today: "+wxAdvice():"Check the weather on the Home tab"}</li></ul>`;
  if(/pest|keeda|rog|disease|insect|bimari|spray|कीट|कीड़ा|रोग/.test(ql))return `<b>🐛 IPM approach:</b><ul><li>Monitoring: light traps / pheromone traps / yellow sticky traps</li><li>Cultural: crop rotation, resistant varieties</li><li>Biological: neem oil 3-5 ml/L, Trichoderma, Bt, NPV</li><li>Chemical: label dose only, and rotate molecules</li></ul><b>Common problems in ${s}:</b><ul><li>Cotton → pink bollworm</li><li>Rice → stem borer, blast</li><li>Wheat → yellow rust</li></ul><div class="note">${WX?(WX.wind>30?"Strong wind — do not spray":WX.rain3>25?"Rain expected — the spray will wash off":"Weather is fine — spray in the morning"):""}</div>`;
  if(/yojana|scheme|msp|subsid|loan|bima|kisan|योजना|सब्सिडी|बीमा/.test(ql))return `<b>🏛️ Government schemes:</b><ul><li><b>PM-KISAN:</b> ₹6,000/year</li><li><b>PM Fasal Bima Yojana:</b> crop insurance — 2% kharif and 1.5% rabi premium</li><li><b>KCC:</b> Kisan Credit Card at 4% effective interest</li><li><b>Soil Health Card:</b> free soil testing</li><li><b>e-NAM:</b> online mandi trading</li><li><b>PM Krishi Sinchai:</b> 55-90% subsidy on drip and sprinkler</li></ul>📞 <b>Kisan Call Centre: 1800-180-1551</b>`;
  return `<b>🌾 Crop plan for ${s}:</b><ul><li><b>Kharif:</b> ${d.kharif.join(", ")}</li><li><b>Rabi:</b> ${d.rabi.join(", ")}</li><li><b>Zaid:</b> ${d.zaid.join(", ")}</li></ul><b>Right now (${SEASONS[sk].name}):</b> ${(d[sk]||[]).join(", ")}<br><br>Soil: <b>${d.soil}</b><div class="note ok">${d.tip}</div>`;
}

/* ---- RUNNING ---- */
function offRun(ql){
  if(!WX)return "⚠️ First search your city on the <b>Home tab</b> — then I can plan the exact best time, heat and AQI guidance.<br><br><b>General rules:</b><ul><li>Best: 5:30-7:30 am or after sunset</li><li>Slow your pace by 30-60 sec/km in heat</li><li>Drink 150-250 ml every 15-20 min</li></ul>";
  const b=bestWindow(),ac=AQ?aqiCat(AQ.aqi):null;
  const heat=WX.feels>32?"high":WX.feels>27?"moderate":"low";
  let s=`<b>🏃 Running plan — ${WX.city}</b><br>Now: ${WX.temp}°C (feels ${WX.feels}°C), humidity ${WX.hum}%, wind ${WX.wind} km/h${AQ?`, AQI ${AQ.aqi} (${ac.c})`:""}.<br><br>`;
  if(b)s+=`<b>✅ Best window:</b> <b>${hhmm(b.from.t)} – ${hhmm(b.to.t)}</b> (feels ${b.from.feels}°C, rain ${b.from.rain.toFixed(1)}mm, AQI ${b.from.aqi??(AQ&&AQ.aqi)??"–"})<br><br>`;
  s+=`<b>🌡️ Heat risk: ${heat.toUpperCase()}</b><ul>
    <li>${WX.feels>32?"Slow your pace by 45-60 sec/km and take walk breaks":"Normal pace is fine"}</li>
    <li>${WX.hum>75?"Humidity is high — sweat evaporates slowly, so fatigue builds faster. Take electrolytes.":"Humidity is normal"}</li>
    <li>Hydration: 300-500 ml 30 min before the run; 150-250 ml every 20 min${WX.feels>32?"; ORS or electrolytes are a must":""}</li>
    <li>Clothing: ${WX.temp>28?"light synthetic moisture-wicking gear, cap and sunglasses":"light layers, plus a windcheater if the wind picks up"}</li></ul>`;
  if(ac)s+=`<b>😷 Air quality: ${ac.c}</b><ul><li>${AQ.aqi>150?"AVOID outdoor runs — use a treadmill or train indoors; wear an N95 if you must go out.":AQ.aqi>100?"Sensitive runners should cut outdoor runs short; early morning has the lowest AQI.":"Outdoor running is safe ✅"}</li></ul>`;
  s+=`<b>🏋️ Today's recommendation:</b> ${(WX.rain3>15||(ac&&AQ.aqi>150))?"Indoor or gym session (cardio + strength) — avoid going outside.":"An outdoor run is great today! Warm up 8-10 min and cool down with 5 min of stretching."}`;
  return s;
}

/* ---- SCHOOL / FAMILY ---- */
function offSchool(ql){
  if(!WX)return "⚠️ Search your city on the <b>Home tab</b> — then you get the exact umbrella, heat and outing plan.<br><br><b>Quick rules:</b><ul><li>Umbrella or raincoat when rain probability is above 50%</li><li>Limit outdoor time 11am-4pm in heat; a water bottle is a must</li><li>Sunscreen and a cap when UV is above 8</li></ul>";
  const rs=rainSummary(nextHours(12)),ac=AQ?aqiCat(AQ.aqi):null,uv=WX.duv[0];
  let s=`<b>🎒 School commute — ${WX.city}</b><br>${WX.temp}°C, humidity ${WX.hum}%, rain 3d ${WX.rain3.toFixed(1)}mm${AQ?`, AQI ${AQ.aqi}`:""}.<br><br>
  <b>☔ Umbrella / raincoat:</b> ${rs.wet?"<b>YES</b> — "+rs.html:"<b>NO</b> — "+rs.html}<br><br>
  <b>👧 Checklist for the kids:</b><ul>
   <li>${WX.temp>34?"🥵 Very hot — light cotton clothes, a cap and a 1L water bottle; avoid outdoor games 11am-4pm":"✅ Temperature is comfortable"}</li>
   <li>${uv>=8?"🧴 UV "+uv+" (very high) — sunscreen, full sleeves and a cap":"UV "+uv+" — normal protection is enough"}</li>
   <li>${WX.hum>85?"💦 High humidity — change clothes quickly and guard against fungal infection":"—"}</li>
   <li>${ac&&AQ.aqi>150?"😷 AQI "+AQ.aqi+" — make them wear a mask and skip outdoor PT":"Air is fine"}</li>
   <li>${rs.wet?"🌧️ Rain gear plus a waterproof bag cover; allow extra time for the bus or auto (delays likely)":"Normal timings"}</li></ul>`;
  s+=`<b>👨‍👩‍👧 Family outing:</b><br>${bestDayText()}<br><ul>
   <li>Best time: 7-10 am or after 5 pm (lower UV and heat)</li>
   <li>Carry: water, snacks, a cap, ${rs.wet?"an umbrella":"sunscreen"}${WX.hum>80?", and mosquito repellent":""}</li>
   <li>Indoor option: ${(rs.wet||WX.temp>36)?"the weather is not great — a mall, museum or indoor play zone is better":"perfect for a park or picnic"}</li></ul>`;
  return s;
}

/* ---- TRAVEL ---- */
function offTravel(ql){
  if(!WX)return "⚠️ Search your destination city on the <b>Home tab</b> — without weather I cannot give useful packing or trip advice.<br><br><b>Quick packing rule:</b> below 15°C = layers, above 30°C = cotton, rain above 10mm = a raincoat.";
  const rs=rainSummary(nextHours(12));
  let s=`<b>✈️ Travel brief — ${WX.city}, ${WX.state||""}</b><br>
  Now: ${wIcon(WX.code)} ${WX.temp}°C (feels ${WX.feels}°C) · humidity ${WX.hum}% · wind ${WX.wind} km/h<br>
  Rain next 3 days: <b>${WX.rain3.toFixed(1)} mm</b> · UV max <b>${WX.duv[0]}</b><br><br>
  <b>🧳 Packing list:</b><br>${packText()}<br><br>
  <b>📍 Next 12h:</b> ${rs.wet?rs.html:"Clear — no rain expected"}<br><br>
  <b>📅 5-day outlook &amp; best day:</b><br>${bestDayText()}<br>
  <table style="width:100%;font-size:12px;margin-top:8px;border-collapse:collapse">
  ${WX.dtime.map((t,i)=>`<tr style="border-bottom:1px solid var(--line)"><td style="padding:5px 0">${t}</td><td>${wIcon(WX.dcode[i])}</td><td>${Math.round(WX.dmax[i])}°/${Math.round(WX.dmin[i])}°</td><td>${(WX.dsum[i]||0).toFixed(1)}mm</td></tr>`).join("")}</table><br>
  <b>⚠️ Travel advisories:</b><ul>
   <li>${WX.rain3>30?"Monsoon-like rain — a higher risk of flight and train delays; keep buffer time":WX.rain3>10?"Moderate rain — keep a backup for outdoor plans":"Dry weather — travel should be smooth"}</li>
   <li>${WX.wind>30?"Strong wind — possible flight and ferry delays":"Wind is normal"}</li>
   <li>${WX.temp>38?"Extreme heat — avoid activity 12pm-4pm and stay hydrated":"Temperature is manageable"}</li>
   <li>${WX.temp<5?"Very cold — pack heavy woollens and thermals":"—"}</li></ul>`;
  return s;
}

/* ---- AQI ---- */
function offAqi(ql){
  if(!AQ)return "⚠️ Search your city on the <b>Home tab</b> for AQI data.<br><br><b>AQI scale (US AQI):</b><ul><li>0–50 Good</li><li>51–100 Moderate</li><li>101–150 Unhealthy for sensitive groups</li><li>151–200 Unhealthy</li><li>201–300 Very Unhealthy</li><li>301+ Hazardous</li></ul>";
  const c=aqiCat(AQ.aqi),bad=AQ.aqi>150;
  let s=`<b>😷 Air Quality — ${WX?WX.city:""}</b><br>US AQI: <b style="color:${c.col}">${AQ.aqi} · ${c.c}</b><br>
  PM2.5 ${AQ.pm25} µg/m³ · PM10 ${AQ.pm10} µg/m³<br>
  <div class="aqib"><i style="left:${Math.min(99,AQ.aqi/500*100)}%"></i></div><br>
  <b>🩺 Health risk:</b> ${c.r}<br><br>
  <b>Decision guide:</b><ul>
   <li><b>Mask:</b> ${bad?"YES — wear an N95 or KN95; a cloth mask is not enough":"Not required (optional)"}</li>
   <li><b>Outdoor exercise:</b> ${AQ.aqi>150?"Stop it / move indoors":AQ.aqi>100?"Reduce it — early morning is best":"Safe ✅"}</li>
   <li><b>Windows:</b> ${AQ.aqi>100?"Keep them shut and run the AC or purifier":"You can keep them open"}</li>
   <li><b>Air purifier:</b> ${AQ.aqi>100?"Recommended — a HEPA filter with a PM2.5 sensor":"Optional"}</li>
   <li><b>High-risk groups:</b> asthma, COPD, children under 5, the elderly (60+), pregnant women and heart patients — ${AQ.aqi>100?"stay indoors and keep an inhaler handy":"normal routine"}</li></ul>
  <b>🏠 Indoor air tips:</b><ul><li>Even when it is sealed, schedule some ventilation</li><li>Avoid incense, mosquito coils and smoking indoors</li><li>Add indoor plants (snake plant, areca palm) and a HEPA purifier</li><li>Shift morning walks when AQI is high</li></ul>
  <div class="note ${bad?'d':'ok'}">Sensitive groups should take care once AQI crosses 100, and stay strictly indoors above 150.</div>`;
  return s;
}

/* ---- COMMUTER ---- */
function offCommute(ql){
  if(!WX)return "⚠️ Search your city on the <b>Home tab</b> for the nowcast.<br><br><b>Quick rule:</b> if rain probability is above 50% in the next 2-3 hours, leave early or wait it out.";
  const h2=nextHours(3),h4=nextHours(4),rs=rainSummary(h2),ac=AQ?aqiCat(AQ.aqi):null;
  let s=`<b>🚗 Commute nowcast — ${WX.city}</b><br>Now: ${wIcon(WX.code)} ${WX.temp}°C, wind ${WX.wind} km/h${AQ?`, AQI ${AQ.aqi}`:""}.<br><br>
  <b>⏱️ Next 4 hours:</b><div class="wstats" style="grid-template-columns:repeat(4,1fr)">${h4.map(h=>`<div class="stat"><b>${hhmm(h.t)}</b><span>${wIcon(h.code)} ${h.temp}°<br>${h.rain.toFixed(1)}mm · ${h.prob}%</span></div>`).join("")}</div><br>
  <b>🌧️ Rain answer:</b> ${rs.wet?"<b>YES</b> — "+rs.html:"<b>NO</b> — "+rs.html}<br><br>
  <b>🕐 Leave time advice:</b><ul>
   <li>${rs.wet?`Leave <b>20-30 min before</b> the peak rain (${rs.peak?hhmm(rs.peak.t):""}) to avoid jams and getting soaked`:"Leaving now is best — there is no rain risk"}</li>
   <li>${WX.wind>30?"Strong wind — take care on a two-wheeler; use the car if you can":"Wind is normal — a two-wheeler is fine"}</li>
   <li>${WX.temp>38?"Strong sun — carry a cap, water and pick a shaded route":"Temperature is comfortable"}</li></ul>
  <b>🏍️ Bike or car?</b> ${(rs.wet||WX.wind>30)?"<b>Car is better</b> — a two-wheeler is risky in rain or wind.":"<b>Bike is fine</b> — the weather is clear."}<br><br>
  ${ac?`<b>😷 Air:</b> ${ac.c} — ${AQ.aqi>150?"use AC and recirculation mode, and wear a mask":"normal travel is fine"}`:""}
  <div class="note ok">Smart suggestion: ${rs.wet?"Leaving a little early today means less rain and less traffic.":"Your commute will be smooth today — normal timing works."}</div>`;
  return s;
}

/* ---- BEACHGOERS & SURFERS ---- */
function offBeach(ql){
  if(!WX)return "⚠️ Search a <b>coastal city</b> on the <b>Home tab</b> (Goa, Mumbai, Chennai, Visakhapatnam, Kochi, Puri, Digha, Mangalore) — then you get the full wave, tide and sea temperature brief.<br><br><b>Quick sea rules:</b><ul><li>Waves under 1 m = fine for beginners</li><li>1–1.5 m = fun, intermediate level</li><li>Above 2.5 m = experts only, beginners stay out</li><li>Red flag or lifeguard warning = do not enter the water at all</li></ul>";
  if(!MAR)return `<b>🌊 Marine data is not available (no coastal grid point found)</b> — ${WX.city} may be inland. Try a coastal city: Goa, Mumbai, Chennai, Vizag, Kochi, Puri.<br><br><b>City conditions:</b> ${WX.temp}°C, humidity ${WX.hum}%, UV ${WX.duv[0]}, wind ${WX.wind} km/h.`;
  const sr=surfRating(MAR.wave), st=seaTempInfo(MAR.sst), ti=tideInfo();
  let s=`<b>🌊 Sea &amp; Surf report — ${WX.city}</b><br>
  Wave height <b>${MAR.wave} m</b> · period <b>${MAR.per||"–"} s</b> · swell <b>${MAR.swell??"–"} m</b> · direction <b>${dirName(MAR.dir)}</b><br>
  Sea surface temp <b>${MAR.sst??"–"}°C</b> · air temp ${WX.temp}°C · wind ${WX.wind} km/h<br><br>
  <b>🏄 Surf rating:</b> <b style="color:${sr.col}">${sr.c}</b> — ${sr.t}<br><br>`;
  if(ti)s+=`<b>🌊 Tides:</b><ul><li>Next high tide: <b>${ti.high?hhmm(ti.high.t)+" ("+ti.high.v.toFixed(2)+" m)":"–"}</b></li><li>Next low tide: <b>${ti.low?hhmm(ti.low.t)+" ("+ti.low.v.toFixed(2)+" m)":"–"}</b></li><li>Tide is currently ${ti.rising?"<b>rising ↑</b> (water level going up)":"<b>falling ↓</b> (water level going down)"}</li></ul><b>Plan tip:</b> ${ti.rising?"Swimming is fine on a rising tide, but stay away from rocks and the shoreline.":"A falling tide is best for tide-pooling and beach walks."}<br><br>`;
  s+=`<b>🩺 Sea temperature:</b> <b style="color:${st.col}">${st.c}</b> — ${st.t}<br><br>
  <b>☀️ Beach safety:</b><ul>
  <li>${MAR.wave>2?"⚠️ Large swell — avoid swimming; only use lifeguard-monitored beaches":"✅ Wave conditions are manageable"}</li>
  <li>UV max <b>${WX.duv[0]}</b> — ${WX.duv[0]>=8?"SPF 50+ is essential; stay in shade 11am-3pm":"sunscreen and a cap are enough"}</li>
  <li>${WX.rain3>15?"🌧️ Rain expected — lightning and rip-current risk, stay off the beach":"Rain is low — a beach day is fine"}</li>
  <li>${WX.wind>30?"🌬️ Strong wind — sand-blast and rough sea, take care":"Wind is normal"}</li>
  <li>If caught in a rip current, <b>swim parallel to the shore</b> to get out — do not fight it directly</li>
  <li>Always swim with a partner and stay near a lifeguard tower</li></ul>`;
  return s;
}

/* ---- EVENT PLANNERS ---- */
function offEvent(ql){
  if(!WX)return "⚠️ Search your event city on the <b>Home tab</b> — then you get the Comfort Index, rain probability and best window.<br><br><b>What the Comfort Index means:</b><ul><li>80+ = Excellent (outdoor is perfect)</li><li>65–79 = Good</li><li>50–64 = Fair</li><li>35–49 = Poor</li><li>Below 35 = Bad (choose indoor)</li></ul>";
  const nc=nowComfort(), ci=comfortInfo(nc), bw=bestEventWindow();
  let s=`<b>🎉 Event planner brief — ${WX.city}</b><br>
  <b>Comfort Index (now): <span style="color:${ci.col};font-size:20px">${ci.s}/100</span> — ${ci.label}</b><br>
  <div class="aqib"><i style="left:${ci.s}%"></i></div>
  ${ci.adv}<br><br>
  <b>📊 Inputs (ideal ranges):</b><ul>
  <li>Temperature: ${WX.feels}°C feels <span style="color:#9fb0d0">(ideal 20–26°C)</span></li>
  <li>Humidity: ${WX.hum}% <span style="color:#9fb0d0">(ideal 40–60%)</span></li>
  <li>Rain probability (next hour): ${nextHours(1)[0]?nextHours(1)[0].prob:0}%</li>
  <li>Wind: ${WX.wind} km/h <span style="color:#9fb0d0">(ideal below 20)</span></li>
  <li>UV index: ${WX.duv[0]} <span style="color:#9fb0d0">(ideal below 6)</span></li></ul>
  <b>⏰ Best event window (next 24h):</b> ${bw?`<b>around ${hhmm(bw.t)}</b> — comfort ${bw.sc}/100, ${bw.feels}°C, rain ${bw.prob}%`:"–"}<br><br>
  <b>📅 5-day Comfort Index:</b><div class="wstats" style="grid-template-columns:repeat(3,1fr)">
  ${WX.dtime.map((t,i)=>{const sc=dayComfort(i),k=comfortInfo(sc);return `<div class="stat"><b style="color:${k.col}">${sc}</b><span>${t.slice(5)} · ${k.label.split(" — ")[0]}<br>${(WX.dsum[i]||0).toFixed(1)}mm</span></div>`}).join("")}</div><br>
  <b>🌧️ Rain probability:</b><ul><li>Total rain over the next 3 days: <b>${WX.rain3.toFixed(1)} mm</b></li><li><b>${bestDayText()}</b></li></ul>
  <b>✅ Planning checklist:</b><ul>
  <li>Venue: ${ci.s>=65?"An outdoor venue is fine":"Indoor or covered venue recommended"}</li>
  <li>Shade / canopy: ${WX.feels>30||WX.duv[0]>7?"Essential — the sun is strong":"Optional"}</li>
  <li>Rain backup: ${WX.rain3>10?"Must — arrange tents, tarps and an indoor fallback":"Low risk — a light backup is enough"}</li>
  <li>Hydration: ${WX.feels>30?"Arrange 150 ml+ per person per hour":"A normal water station"}</li>
  <li>Timing: ${bw?"Shift to "+hhmm(bw.t)+" for the best comfort":"Best between 8-11 am or after 5 pm"}</li>
  <li>Wind: ${WX.wind>25?"Secure banners and standees — it is windy":"Wind is normal"}</li></ul>`;
  return s;
}

  function curSeason(){ var m = new Date().getMonth() + 1; return (m >= 6 && m <= 10) ? 'kharif' : (m === 11 || m === 12 || m <= 3) ? 'rabi' : 'zaid'; }

  return {
    PERSONAS: PERSONAS, STATES: STATES, CROPS: CROPS, SEASONS: SEASONS,
    setWeather: setWeather, setAir: setAir, setMarine: setMarine,
    setPersona: setPersona, setProfile: setProfile, getState: getState,
    wIcon: wIcon, aqiCat: aqiCat, wxAdvice: wxAdvice,
    nextHours: nextHours, hhmm: hhmm, bestWindow: bestWindow, rainSummary: rainSummary,
    bestDayText: bestDayText, packText: packText,
    comfortIndex: comfortIndex, comfortInfo: comfortInfo, nowComfort: nowComfort,
    dayComfort: dayComfort, bestEventWindow: bestEventWindow,
    dirName: dirName, surfRating: surfRating, seaTempInfo: seaTempInfo, tideInfo: tideInfo,
    H: H, offline: offline, detectDomain: detectDomain,
    offAgri: offAgri, offRun: offRun, offSchool: offSchool, offTravel: offTravel,
    offAqi: offAqi, offCommute: offCommute, offBeach: offBeach, offEvent: offEvent,
    curSeason: curSeason
  };
});

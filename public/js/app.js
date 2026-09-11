/* ===========================================================================
   MAUSAM — frontend application
   Talks to the Express backend when it is available (/api/*), and falls back to
   calling Open-Meteo directly when the page is opened as a plain file.
   =========================================================================== */
(function () {
  'use strict';

  var D = window.MAUSAM_DATA;
  var E = window.MAUSAM_ENGINE;
  var C = window.MAUSAM_CONTEXT;

  var PERSONAS = D.PERSONAS, STATES = D.STATES, SEASONS = D.SEASONS, CROPS = D.CROPS;

  var CUR = 'agri';
  var WX = null, AQ = null, MAR = null;   // live data for the current city
  var API_BASE = null;                    // '/api' when the backend answers
  var CFG = { prov: 'offline', key: '' }; // client-side key (standalone only)
  var booted = false;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }); };

  try { CFG = Object.assign(CFG, JSON.parse(localStorage.getItem('mausam_ai') || '{}')); } catch (e) { /* ignore */ }

  /** Push the current app state into the shared logic engine. */
  function sync() {
    E.setWeather(WX);
    E.setAir(AQ);
    E.setMarine(MAR);
    E.setPersona(CUR);
    E.setProfile($('state').value, $('land').value);
  }
  function curCity() { return $('city').value.trim(); }
  function profile() { return { state: $('state').value, land: $('land').value }; }

  /* ======================================================================
     Backend detection
     ====================================================================== */
  function detectBackend() {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 2500);
    return fetch('api/health', { signal: ctrl.signal, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.service === 'mausam-ai') { API_BASE = 'api'; return j; }
        return null;
      })
      .catch(function () { return null; })
      .finally(function () { clearTimeout(timer); });
  }

  function setMode(health) {
    var pill = $('modePill');
    if (API_BASE) {
      pill.textContent = health && health.aiProvider ? 'backend · ' + health.aiProvider : 'backend · offline KB';
      pill.className = 'pill live';
      $('aiMode').textContent = health && health.aiProvider ? health.aiProvider + ' via backend' : 'offline knowledge base';
    } else {
      pill.textContent = 'standalone mode';
      pill.className = 'pill off';
      $('aiMode').textContent = (CFG.prov === 'offline' || !CFG.key) ? 'offline knowledge base (no key)' : CFG.prov + ' (browser key)';
    }
  }

  /* ======================================================================
     Tabs
     ====================================================================== */
  function initTabs() {
    var tabs = document.querySelectorAll('.tab');
    Array.prototype.forEach.call(tabs, function (t) {
      t.addEventListener('click', function () {
        Array.prototype.forEach.call(tabs, function (x) { x.classList.remove('on'); });
        Array.prototype.forEach.call(document.querySelectorAll('.pane'), function (p) { p.classList.remove('on'); });
        t.classList.add('on');
        $('p-' + t.dataset.t).classList.add('on');
      });
    });
  }

  /* ======================================================================
     Personas
     ====================================================================== */
  function fillStates() {
    var opts = Object.keys(STATES).sort().map(function (s) { return '<option>' + s + '</option>'; }).join('');
    $('state').innerHTML = opts;
    $('state2').innerHTML = opts;
    $('state').value = 'Maharashtra';
    $('state2').value = 'Maharashtra';
  }

  function renderPersonaCards() {
    var html = Object.keys(PERSONAS).map(function (k) {
      var p = PERSONAS[k];
      return '<button class="pc' + (k === CUR ? ' on' : '') + '" data-persona="' + k + '" type="button">' +
        '<span class="tick">&#10003;</span>' +
        '<div class="ic">' + p.icon + '</div><b>' + p.name + '</b><span>' + p.tag + '</span></button>';
    }).join('');
    $('pgrid').innerHTML = html;
    $('pgrid2').innerHTML = html;

    Array.prototype.forEach.call(document.querySelectorAll('.pc'), function (el) {
      el.addEventListener('click', function () { setPersona(el.dataset.persona); });
    });
  }

  function setPersona(k) {
    var prev = CUR;
    CUR = k;
    renderPersonaCards();
    renderChips();
    renderAIHead();
    renderSuggest();
    renderProfile();

    var p = PERSONAS[k];
    $('personaInfo').innerHTML = '<b>' + p.icon + ' ' + p.name + '</b> — ' + p.about +
      '<br><span class="muted">The AI advisor\'s suggested questions and answers change with the persona.</span>';
    $('curP').textContent = 'selected: ' + p.name.split(' ')[0];

    if (booted && prev !== k && $('msgs')) {
      addMsg('a', 'SYSTEM',
        '&#128260; Persona switched &rarr; <b>' + p.icon + ' ' + p.name + '</b><br>' +
        'I will now answer only within this domain. Try the suggested questions below.<br>' +
        '<span class="muted">Ask in Hindi, English or Hinglish — answers are always in English.</span>');
    }
  }

  function renderChips() {
    $('chips').innerHTML = PERSONAS[CUR].chips.map(function (c) {
      return '<button class="chip" type="button" data-q="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
    Array.prototype.forEach.call($('chips').querySelectorAll('.chip'), function (el) {
      el.addEventListener('click', function () { ask(el.dataset.q); });
    });
  }

  function renderAIHead() {
    $('aiTitle').textContent = PERSONAS[CUR].name + ' Advisor';
    $('sugFor').textContent = PERSONAS[CUR].name;
  }

  /* ======================================================================
     Weather
     ====================================================================== */
  async function getWeather() {
    var city = curCity();
    if (!city) return;
    $('wout').innerHTML = '<p class="muted">Loading ' + esc(city) + '&hellip;</p>';

    try {
      if (API_BASE) {
        var r = await fetch(API_BASE + '/weather?city=' + encodeURIComponent(city));
        if (r.status === 404) throw new Error('CITY_NOT_FOUND');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var j = await r.json();
        WX = j.weather; AQ = j.air; MAR = j.marine;
      } else {
        await getWeatherDirect(city);
      }
      sync();
      renderWeather();
      renderProfile();
      renderSuggest();
      plan();
    } catch (err) {
      $('wout').innerHTML = err.message === 'CITY_NOT_FOUND'
        ? '<p class="err">City not found. Please check the spelling.</p>'
        : '<p class="err">Could not load the weather. Check your internet connection.</p>';
    }
  }

  /** Standalone path: call Open-Meteo directly from the browser (India first). */
  async function getWeatherDirect(city) {
    var G = window.MAUSAM_GEO;
    var query = G.queryFor(city);
    var base = 'https://geocoding-api.open-meteo.com/v1/search?name=' +
      encodeURIComponent(query) + '&count=10&language=en';
    var g = await (await fetch(base + '&countryCode=IN')).json().catch(function () { return null; });
    if (!g || !g.results || !g.results.length) g = await (await fetch(base)).json();
    if (!g.results || !g.results.length) throw new Error('CITY_NOT_FOUND');
    var r = G.pickPlace(g.results, query) || g.results[0];
    var p = { name: r.name, admin1: r.admin1, latitude: r.latitude, longitude: r.longitude };
    var lat = p.latitude, lon = p.longitude;

    var urls = [
      'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day' +
        '&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,uv_index' +
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,weather_code' +
        '&timezone=auto&forecast_days=7',
      'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lon +
        '&current=us_aqi,pm2_5,pm10&hourly=us_aqi&timezone=auto&forecast_days=3',
      'https://marine-api.open-meteo.com/v1/marine?latitude=' + lat + '&longitude=' + lon +
        '&current=wave_height,wave_direction,wave_period,swell_wave_height,sea_surface_temperature' +
        '&hourly=wave_height,wave_period,swell_wave_height,sea_surface_temperature,sea_level_height_msl' +
        '&timezone=auto&forecast_days=7'
    ];
    var res = await Promise.all(urls.map(function (u) {
      return fetch(u).then(function (x) { return x.json(); }).catch(function () { return null; });
    }));
    var f = res[0], a = res[1], m = res[2];
    if (!f || !f.current) throw new Error('WEATHER_FAILED');

    var c = f.current, h = f.hourly, d = f.daily;
    var key = String(c.time || '').slice(0, 13);
    var idx = h.time.findIndex(function (t) { return t.slice(0, 13) === key; });

    WX = {
      city: p.name, state: p.admin1 || '', lat: lat, lon: lon,
      temp: c.temperature_2m, hum: c.relative_humidity_2m, feels: c.apparent_temperature,
      rain: c.precipitation, wind: c.wind_speed_10m, code: c.weather_code, isDay: c.is_day,
      dmax: d.temperature_2m_max, dmin: d.temperature_2m_min, dsum: d.precipitation_sum,
      duv: d.uv_index_max, dcode: d.weather_code, dtime: d.time,
      htime: h.time, htemp: h.temperature_2m, hfeels: h.apparent_temperature,
      hhum: h.relative_humidity_2m, hrain: h.precipitation, hprob: h.precipitation_probability,
      hcode: h.weather_code, hwind: h.wind_speed_10m, huv: h.uv_index,
      nowIdx: idx < 0 ? 0 : idx
    };
    WX.rain3 = (d.precipitation_sum || []).slice(0, 3).reduce(function (x, y) { return x + (y || 0); }, 0);

    AQ = (a && a.current && a.current.us_aqi != null)
      ? { aqi: Math.round(a.current.us_aqi), pm25: a.current.pm2_5, pm10: a.current.pm10,
          htime: a.hourly ? a.hourly.time : [], haqi: a.hourly ? a.hourly.us_aqi : [] }
      : null;

    MAR = (m && m.current && m.current.wave_height != null)
      ? { wave: m.current.wave_height, dir: m.current.wave_direction, per: m.current.wave_period,
          swell: m.current.swell_wave_height, sst: m.current.sea_surface_temperature,
          htime: m.hourly ? m.hourly.time : [], hwave: m.hourly ? m.hourly.wave_height : [],
          hper: m.hourly ? m.hourly.wave_period : [], hswell: m.hourly ? m.hourly.swell_wave_height : [],
          hlevel: m.hourly ? m.hourly.sea_level_height_msl : [] }
      : null;

    if (STATES[p.admin1]) {
      $('state').value = p.admin1;
      $('state2').value = p.admin1;
    }
  }

  function renderWeather() {
    if (!WX) return;
    var ac = AQ ? E.aqiCat(AQ.aqi) : null;

    // ---- 7-day forecast strip (today + the next 6 days)
    var DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var days = '';
    var nDays = Math.min(7, WX.dtime.length);
    for (var i = 0; i < nDays; i++) {
      var dt = new Date(WX.dtime[i] + 'T12:00:00');
      var label = i === 0 ? 'Today' : DAYN[dt.getDay()];
      var rain = WX.dsum[i] || 0;
      days += '<div class="fday' + (i === 0 ? ' today' : '') + '">' +
        '<span class="fdname">' + label + '</span>' +
        '<span class="fdicon">' + E.wIcon(WX.dcode[i]) + '</span>' +
        '<span class="fdmax">' + Math.round(WX.dmax[i]) + '&deg;</span>' +
        '<span class="fdmin">' + Math.round(WX.dmin[i]) + '&deg;</span>' +
        '<span class="fdrain"' + (rain >= 0.5 ? '' : ' data-dry="1"') + '>' + rain.toFixed(1) + ' mm</span>' +
        '<span class="fduv"' + (WX.duv[i] >= 8 ? '' : ' data-low="1"') + '>UV ' + (WX.duv[i] == null ? '&ndash;' : Math.round(WX.duv[i])) + '</span>' +
        '</div>';
    }
    $('wout').innerHTML =
      '<div class="whero">' +
        '<div class="wicon">' + E.wIcon(WX.code) + '</div>' +
        '<div><div class="wtemp">' + WX.temp + '&deg;C</div>' +
        '<div class="wmeta"><b>' + esc(WX.city) + '</b>' + (WX.state ? ', ' + esc(WX.state) : '') +
        '<br>Feels ' + WX.feels + '&deg;C &middot; Humidity ' + WX.hum + '%</div></div>' +
        '<div style="margin-left:auto;text-align:right"><div class="wmeta">' +
        'Rain now: <b>' + WX.rain + ' mm</b><br>Wind: <b>' + WX.wind + ' km/h</b><br>' +
        'Min/Max: <b>' + WX.dmin[0] + '&deg;/' + WX.dmax[0] + '&deg;</b><br>' +
        'UV max: <b>' + WX.duv[0] + '</b></div></div>' +
      '</div>' +
      '<div class="wstats">' +
        '<div class="stat"><b>' + WX.hum + '%</b><span>Humidity</span></div>' +
        '<div class="stat"><b>' + WX.rain3.toFixed(1) + ' mm</b><span>Rain next 3d</span></div>' +
        '<div class="stat"><b>' + WX.wind + '</b><span>Wind km/h</span></div>' +
        '<div class="stat"><b>' + (ac ? AQ.aqi : '&ndash;') + '</b><span>US AQI</span></div>' +
      '</div>' +
      (ac ? '<div class="aqib"><i style="left:' + Math.min(99, AQ.aqi / 500 * 100) + '%"></i></div>' +
        '<div class="badge" style="background:' + ac.col + '22;color:' + ac.col + ';border-color:' + ac.col + '77">' +
        'AQI ' + AQ.aqi + ' &middot; ' + ac.c + ' &middot; PM2.5 ' + AQ.pm25 + ' &micro;g/m&sup3;</div>' : '') +
      (MAR ? '<div class="badge">&#127754; ' + MAR.wave + ' m waves &middot; ' + (MAR.sst == null ? '&ndash;' : MAR.sst) +
        '&deg;C sea temp &middot; surf: ' + E.surfRating(MAR.wave).c + '</div>' : '') +
      '<div class="badge warm">' + esc(E.wxAdvice()) + '</div>' +
      '<div class="secTitle">7-Day Forecast</div>' +
      '<div class="fstrip">' + days + '</div>';
  }

  /* ======================================================================
     Profile + suggestions
     ====================================================================== */
  function renderProfile() {
    var s = $('state').value, d = STATES[s];
    if (!d) return;
    $('profileBox').innerHTML =
      '<div style="margin-top:14px;border-top:1px solid var(--line);padding-top:13px">' +
      '<label>Soil — ' + esc(s) + '</label><div class="tags"><span class="tag g">' + esc(d.soil) + '</span></div>' +
      '<label style="margin-top:12px">Kharif</label><div class="tags">' +
      d.kharif.map(function (c) { return '<span class="tag">' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<label style="margin-top:12px">Rabi</label><div class="tags">' +
      d.rabi.map(function (c) { return '<span class="tag">' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<div class="note ok"><b>Tip:</b> ' + esc(d.tip) + '</div></div>';
    renderSuggest();
  }

  function renderSuggest() {
    var el = $('dailyTips');
    if (!el) return;
    sync();
    var p = PERSONAS[CUR];
    var body = '';
    var s = $('state').value, d = STATES[s], sk = E.curSeason();

    if (CUR === 'agri') {
      body = '<div class="grid"><div>' +
        '<label>Auto-detected season: <b class="acc">' + SEASONS[sk].name + '</b> (' + SEASONS[sk].when + ')</label>' +
        '<div class="tags">' + (d[sk] || []).map(function (c) { return '<span class="tag g">' + c + '</span>'; }).join('') + '</div>' +
        '<div class="note ok" style="margin-top:10px">' + esc(d.tip) + '</div></div>' +
        '<div><label>Smart action</label>' +
        (WX ? '<div class="note ok">' + esc(E.wxAdvice()) + '</div>' : '<div class="note">Search a city on the Home tab.</div>') +
        '<div class="note"><b>Soil health:</b> get a soil test every 2 years and grow green manure.</div></div></div>';
    } else if (CUR === 'run') {
      var bw = WX ? E.bestWindow() : null;
      body = '<div class="grid"><div><label>Best workout window</label>' +
        (bw ? '<div class="note ok"><b>' + E.hhmm(bw.from.t) + ' &ndash; ' + E.hhmm(bw.to.t) + '</b> &middot; ' +
          bw.from.feels + '&deg;C feels &middot; AQI ' + (bw.from.aqi || (AQ && AQ.aqi) || '&ndash;') +
          ' &middot; rain ' + bw.from.rain.toFixed(1) + 'mm</div>'
          : '<div class="note">Load the weather first.</div>') +
        '<label style="margin-top:10px">Today\'s heat &amp; humidity</label>' +
        (WX ? '<div class="note">' + WX.feels + '&deg;C feels &middot; ' + WX.hum + '% humidity &middot; wind ' + WX.wind + ' km/h</div>' : '') +
        '</div><div><label>Runner flags</label>' +
        (WX ? '<div class="note ' + (WX.feels > 32 ? 'd' : 'ok') + '">' +
          (WX.feels > 32 ? 'Heat risk — slow your pace and double your hydration' : 'Temperature is workout-friendly') + '</div>' : '') +
        (AQ ? '<div class="note ' + (AQ.aqi > 150 ? 'd' : 'ok') + '">' +
          (AQ.aqi > 150 ? 'AQI is high — avoid outdoor runs' : 'Air quality is fine for running') + '</div>' : '') +
        '</div></div>';
    } else if (CUR === 'school') {
      var rs = WX ? E.rainSummary(E.nextHours(12)) : null;
      body = '<div class="grid"><div><label>Umbrella decision (next 12h)</label>' +
        (rs ? '<div class="note ' + (rs.wet ? '' : 'ok') + '">' + (rs.wet ? 'Pack an umbrella or raincoat — ' + rs.html : 'No umbrella needed — ' + rs.html) + '</div>'
            : '<div class="note">Load the weather first.</div>') +
        (WX ? '<div class="note">' + WX.temp + '&deg;C &middot; UV max ' + WX.duv[0] + ' &middot; Humidity ' + WX.hum + '%</div>' : '') +
        '</div><div><label>Family outing — best day</label>' +
        (WX ? '<div class="note ok">' + E.bestDayText() + '</div>' : '') +
        '<div class="note"><b>Kids tip:</b> limit outdoor time between 11am-4pm in heat; a water bottle and cap are a must.</div></div></div>';
    } else if (CUR === 'travel') {
      body = '<div class="grid"><div><label>Destination: <b>' + (WX ? esc(WX.city) : '&ndash;') + '</b></label>' +
        (WX ? '<div class="note ok">' + WX.temp + '&deg;C &middot; ' + E.wIcon(WX.code) + ' &middot; rain next 3d ' +
          WX.rain3.toFixed(1) + 'mm &middot; wind ' + WX.wind + ' km/h</div>' : '<div class="note">Search your destination city.</div>') +
        '<label style="margin-top:10px">Packing hint</label>' + (WX ? '<div class="note">' + esc(E.packText()) + '</div>' : '') +
        '</div><div><label>Best travel day (7-day)</label>' +
        (WX ? '<div class="note ok">' + E.bestDayText() + '</div>' : '') +
        '<div class="note"><b>Tip:</b> the risk of flight and train delays is highest with rain and strong wind.</div></div></div>';
    } else if (CUR === 'aqi') {
      var ac2 = AQ ? E.aqiCat(AQ.aqi) : null;
      body = '<div class="grid"><div><label>Today\'s Air Quality</label>' +
        (ac2 ? '<div class="note ' + (AQ.aqi > 150 ? 'd' : 'ok') + '"><b>AQI ' + AQ.aqi + ' &middot; ' + ac2.c + '</b><br>' + ac2.r + '</div>' +
          '<div class="aqib"><i style="left:' + Math.min(99, AQ.aqi / 500 * 100) + '%"></i></div>' +
          '<div class="note">PM2.5 ' + AQ.pm25 + ' &micro;g/m&sup3; &middot; PM10 ' + AQ.pm10 + ' &micro;g/m&sup3;</div>'
          : '<div class="note">Load the weather first (needed for AQI).</div>') +
        '</div><div><label>Health actions</label>' +
        (ac2 ? '<div class="note ' + (AQ.aqi > 150 ? 'd' : 'ok') + '">' +
          (AQ.aqi > 150 ? 'Wear an N95 &middot; stop outdoor exercise &middot; keep windows shut &middot; run the purifier'
                        : 'Mask optional &middot; outdoor activity is fine') + '</div>' : '') +
        '<div class="note"><b>Sensitive groups:</b> asthma, children, the elderly and pregnant women — take care once AQI &gt;100.</div></div></div>';
    } else if (CUR === 'beach') {
      var sr = (WX && MAR) ? E.surfRating(MAR.wave) : null;
      var st = (WX && MAR) ? E.seaTempInfo(MAR.sst) : null;
      var ti = WX ? E.tideInfo() : null;
      body = '<div class="grid"><div><label>Sea conditions' + (WX ? ' — ' + esc(WX.city) : '') + '</label>' +
        (MAR ? '<div class="wstats" style="grid-template-columns:repeat(3,1fr)">' +
          '<div class="stat"><b>' + MAR.wave + ' m</b><span>Wave height</span></div>' +
          '<div class="stat"><b>' + (MAR.per ? MAR.per + ' s' : '&ndash;') + '</b><span>Wave period</span></div>' +
          '<div class="stat"><b>' + (MAR.swell == null ? '&ndash;' : MAR.swell) + ' m</b><span>Swell</span></div>' +
          '<div class="stat"><b>' + (MAR.sst == null ? '&ndash;' : MAR.sst) + '&deg;</b><span>Sea temp</span></div>' +
          '<div class="stat"><b>' + E.dirName(MAR.dir) + '</b><span>Direction</span></div>' +
          '<div class="stat"><b style="color:' + sr.col + '">' + sr.c + '</b><span>Surf rating</span></div></div>'
          : '<div class="note">No marine data — search a coastal city (Goa, Mumbai, Chennai, Vizag, Kochi, Puri).</div>') +
        (ti ? '<div class="note ok"><b>Tide:</b> next high <b>' + (ti.high ? E.hhmm(ti.high.t) + ' (' + ti.high.v.toFixed(2) + ' m)' : '&ndash;') +
          '</b> &middot; next low <b>' + (ti.low ? E.hhmm(ti.low.t) + ' (' + ti.low.v.toFixed(2) + ' m)' : '&ndash;') +
          '</b> &middot; tide ' + (ti.rising ? 'rising &uarr;' : 'falling &darr;') + '</div>' : '') +
        '</div><div><label>Beach safety &amp; plan</label>' +
        (MAR ? '<div class="note ' + (MAR.wave > 2 ? 'd' : 'ok') + '">' +
          (MAR.wave > 2 ? 'Large swell — avoid swimming and rocky shores; choose a lifeguard-monitored beach'
                        : 'Wave conditions are manageable') + '</div>' : '') +
        (st ? '<div class="note ok">Sea temp ' + MAR.sst + '&deg;C — ' + st.c + '. ' + st.t + '.</div>' : '') +
        '<div class="note"><b>Beach checklist:</b> SPF 50 sunscreen &middot; cap &middot; 2L water &middot; ' +
        (WX && WX.duv[0] >= 8 ? 'UV is high — stay in shade 11am-3pm' : 'UV normal') + '</div></div></div>';
    } else if (CUR === 'event') {
      var nc = WX ? E.nowComfort() : null;
      var ci = nc != null ? E.comfortInfo(nc) : null;
      var eb = WX ? E.bestEventWindow() : null;
      var dcs = WX ? WX.dtime.map(function (t, i) { return { t: t, s: E.dayComfort(i) }; }) : [];
      body = '<div class="grid"><div><label>Comfort Index — now</label>' +
        (ci ? '<div class="note" style="border-left-color:' + ci.col + '"><b style="color:' + ci.col + ';font-size:19px">' +
          ci.s + '/100 &middot; ' + ci.label + '</b><br>' + ci.adv + '</div>' +
          '<div class="aqib"><i style="left:' + ci.s + '%"></i></div>' +
          '<div class="note">Factors: ' + WX.feels + '&deg;C feels &middot; ' + WX.hum + '% humidity &middot; ' +
          WX.wind + ' km/h wind &middot; UV ' + WX.duv[0] + '</div>'
          : '<div class="note">Load the weather first.</div>') +
        '</div><div><label>Best event window (next 24h)</label>' +
        (eb ? '<div class="note ok"><b>around ' + E.hhmm(eb.t) + '</b> &middot; comfort ' + eb.sc + '/100 &middot; ' +
          eb.feels + '&deg;C &middot; rain ' + eb.prob + '%</div>' : '<div class="note">Load the weather first.</div>') +
        '<label style="margin-top:10px">7-day Comfort Index</label>' +
        '<div class="wstats" style="grid-template-columns:repeat(auto-fill,minmax(84px,1fr))">' + dcs.map(function (x) {
          var k = E.comfortInfo(x.s);
          return '<div class="stat"><b style="color:' + k.col + '">' + x.s + '</b><span>' + x.t.slice(5) + '<br>' +
            k.label.split(' — ')[0] + '</span></div>';
        }).join('') + '</div>' +
        '<div class="note"><b>Planning tip:</b> ' + (ci ? ci.adv : '—') + '</div></div></div>';
    } else {
      var h4 = WX ? E.nextHours(4) : null;
      var rs3 = WX ? E.rainSummary(E.nextHours(3)) : null;
      body = '<div class="grid"><div><label>Next 4 hours nowcast</label>' +
        (h4 ? '<div class="wstats" style="grid-template-columns:repeat(2,1fr)">' + h4.map(function (h) {
          return '<div class="stat"><b>' + E.hhmm(h.t) + '</b><span>' + E.wIcon(h.code) + ' ' + h.temp +
            '&deg;<br>' + h.rain.toFixed(1) + 'mm &middot; ' + h.prob + '%</span></div>';
        }).join('') + '</div>' : '<div class="note">Load the weather first.</div>') +
        '</div><div><label>Leave time advice</label>' +
        (rs3 ? '<div class="note ' + (rs3.wet ? '' : 'ok') + '">' +
          (rs3.wet ? rs3.html + ' — leave a little earlier.' : rs3.html + ' — leave at your normal time.') + '</div>' : '') +
        (AQ ? '<div class="note ' + (AQ.aqi > 150 ? 'd' : 'ok') + '">' +
          (AQ.aqi > 150 ? 'AQI is high — prefer the car or AC' : 'Air is fine — a two-wheeler is okay too') + '</div>' : '') +
        '</div></div>';
    }

    el.innerHTML = '<div class="muted" style="font-size:11.5px;margin-bottom:10px">' + p.icon + ' ' + p.name + ' — ' + p.tag + '</div>' + body;
  }

  /* ======================================================================
     Crop planner
     ====================================================================== */
  function plan() {
    var s = $('state2').value, se = $('season').value, fo = $('focus').value;
    var d = STATES[s];
    if (!d) return;
    var map = { kharif: d.kharif, rabi: d.rabi, zaid: d.zaid };
    var low = ['Bajra', 'Jowar', 'Moong', 'Gram', 'Mustard', 'Groundnut', 'Tur', 'Barley', 'Moth'];
    var high = ['Cotton', 'Sugarcane', 'Onion', 'Banana', 'Vegetables', 'Cumin', 'Chilli', 'Turmeric', 'Ginger', 'Potato'];
    var list = se === 'all' ? d.kharif.concat(d.rabi, d.zaid) : map[se];
    list = list.filter(function (c) {
      if (fo === 'water') return low.some(function (x) { return c.indexOf(x.split(' ')[0]) !== -1; });
      if (fo === 'profit') return high.some(function (x) { return c.indexOf(x.split(' ')[0]) !== -1; });
      return true;
    });
    list = list.filter(function (c, i) { return list.indexOf(c) === i; });

    function seasonOf(c) {
      if (map.kharif.indexOf(c) !== -1) return 'kharif';
      if (map.rabi.indexOf(c) !== -1) return 'rabi';
      if (map.zaid.indexOf(c) !== -1) return 'zaid';
      return null;
    }

    $('planOut').innerHTML = '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(275px,1fr))">' +
      list.map(function (c) {
        var key = Object.keys(CROPS).find(function (k) {
          return c.indexOf(k) === 0 || k.indexOf(c.split(' ')[0]) === 0;
        }) || '';
        var ci = CROPS[key] || {};
        var sn = seasonOf(c);
        return '<div class="card" style="padding:14px">' +
          '<h3 style="margin-bottom:8px">' + esc(c) + (sn ? ' <span class="acc">' + SEASONS[sn].name + '</span>' : '') + '</h3>' +
          '<div class="wmeta" style="font-size:12px;line-height:1.9">' +
          (ci.sow ? 'Sow: <b>' + ci.sow + '</b><br>' : '') +
          (ci.harv ? 'Harvest: <b>' + ci.harv + '</b><br>' : '') +
          (ci.water ? 'Water: <b>' + ci.water + '</b><br>' : '') +
          (ci.soil ? 'Soil: <b>' + ci.soil + '</b><br>' : '') +
          (ci.fert ? 'Fertilizer: <b>' + ci.fert + '</b><br>' : '') + '</div>' +
          (ci.tip ? '<div class="note ok" style="font-size:11.5px">' + esc(ci.tip) + '</div>' : '') + '</div>';
      }).join('') + '</div>';
  }

  /* ======================================================================
     Chat
     ====================================================================== */
  function bootMsg() {
    var p = PERSONAS[CUR];
    $('msgs').innerHTML = '<div class="msg a"><div class="who">MAUSAM</div>' +
      'Hello &#128075; I am your <b>MAUSAM Assistant</b>.<br><br>' +
      'The <b>' + p.icon + ' ' + p.name + '</b> persona is active. ' + p.about + '<br><br>' +
      'Switch persona above and ask anything. Suggested questions are listed below.<br>' +
      '<span class="muted">Ask in Hindi, English or Hinglish — <b>answers are always in English</b>.</span></div>';
  }

  function addMsg(cls, who, html) {
    var d = document.createElement('div');
    d.className = 'msg ' + cls;
    d.innerHTML = (who ? '<div class="who">' + who + '</div>' : '') + html;
    $('msgs').appendChild(d);
    $('msgs').scrollTop = $('msgs').scrollHeight;
    return d;
  }

  async function ask(q) {
    var inp = $('qi');
    var text = (q || inp.value).trim();
    if (!text) return;
    if (!q) inp.value = '';

    addMsg('u', 'JUDGE / YOU', esc(text));
    var p = PERSONAS[CUR];
    var load = addMsg('a', p.icon + ' MAUSAM', '<div class="typing"><i></i><i></i><i></i></div>');

    var html;
    if (API_BASE) {
      try {
        var r = await fetch(API_BASE + '/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona: CUR, question: text, city: curCity(), profile: profile() })
        });
        var j = await r.json();
        html = j.answer || localAnswer(text);
        if (j.source === 'offline') {
          html += '<div class="note">Answered from the built-in knowledge base' +
            (j.error ? ' (AI provider: ' + esc(j.error) + ')' : '') + '.</div>';
        }
      } catch (e) {
        html = localAnswer(text) + '<div class="note">Backend unreachable — answered locally.</div>';
      }
    } else {
      html = await localAnswer(text);
    }

    load.innerHTML = '<div class="who">' + p.icon + ' ' + p.name.toUpperCase() + '</div>' + html;
    $('msgs').scrollTop = $('msgs').scrollHeight;
  }

  /** Standalone: use the browser key when present, else the offline engine. */
  async function localAnswer(text) {
    sync();
    if (CFG.prov === 'offline' || !CFG.key) return E.offline(text);
    try {
      return await clientLLM(text);
    } catch (e) {
      return E.offline(text) + '<div class="note">AI API error — this answer came from the built-in knowledge base.</div>';
    }
  }

  async function clientLLM(question) {
    var p = PERSONAS[CUR];
    var sys = C.systemPrompt(p);
    var prompt = 'CONTEXT (live data):\n' + C.buildContext(CUR, { weather: WX, air: AQ, marine: MAR }, profile()) +
      '\n\nUSER QUESTION: ' + question;
    var txt = '';

    if (CFG.prov === 'gemini') {
      var r1 = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
        encodeURIComponent(CFG.key), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ parts: [{ text: prompt }] }] })
      });
      var j1 = await r1.json();
      if (j1.error) throw new Error(j1.error.message);
      txt = j1.candidates[0].content.parts[0].text;
    } else if (CFG.prov === 'groq') {
      var r2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CFG.key },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.5, max_tokens: 750,
          messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }] })
      });
      var j2 = await r2.json();
      if (j2.error) throw new Error(j2.error.message);
      txt = j2.choices[0].message.content;
    } else {
      var r3 = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CFG.key },
        body: JSON.stringify({ model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }] })
      });
      var j3 = await r3.json();
      if (j3.error) throw new Error(j3.error.message);
      txt = j3.choices[0].message.content;
    }
    return C.markdownToHtml(txt);
  }

  /* ======================================================================
     Settings modal
     ====================================================================== */
  function openCfg() {
    $('mask').hidden = false;
    if (API_BASE) {
      $('cfgTitle').textContent = 'AI Settings — server managed';
      $('cfgIntro').textContent = 'This page is running against the Express backend, so the AI provider and key live on the server.';
      $('cfgServerBlock').hidden = false;
      $('cfgClientBlock').hidden = true;
      $('cfgServerState').innerHTML = 'Provider: <b>' + ($('modePill').textContent) + '</b>';
    } else {
      $('cfgTitle').textContent = 'AI Settings — standalone mode';
      $('cfgIntro').textContent = 'This page is running as a plain file (no backend). You can add a free API key here, or keep using the built-in offline knowledge base.';
      $('cfgServerBlock').hidden = true;
      $('cfgClientBlock').hidden = false;
      $('prov').value = CFG.prov;
      $('key').value = CFG.key || '';
    }
  }
  function closeCfg() { $('mask').hidden = true; }
  function saveCfg() {
    CFG = { prov: $('prov').value, key: $('key').value.trim() };
    try { localStorage.setItem('mausam_ai', JSON.stringify(CFG)); } catch (e) { /* ignore */ }
    setMode();
    closeCfg();
    addMsg('a', 'SYSTEM', CFG.prov === 'offline'
      ? 'Offline knowledge base is active — the full demo runs without a key or internet.'
      : CFG.prov.toUpperCase() + ' is connected — you will now get live LLM answers.');
  }

  /* ======================================================================
     PWA — service worker, install prompt, deep links
     ====================================================================== */
  var deferredPrompt = null;

  function initPWA() {
    // Service worker only makes sense over http(s), not file://
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () { /* offline still works, just no cache */ });
      });
    }

    var btn = $('installBtn');

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      if (btn) btn.hidden = false;
    });

    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      if (btn) btn.hidden = true;
      addMsg('a', 'SYSTEM', 'App installed — open <b>MAUSAM</b> any time from your home screen.');
    });

    if (btn) {
      btn.addEventListener('click', async function () {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          try { await deferredPrompt.userChoice; } catch (e) { /* ignored */ }
          deferredPrompt = null;
          btn.hidden = true;
          return;
        }
        // iOS Safari never fires beforeinstallprompt — explain the manual route
        window.alert('Install MAUSAM\n\niPhone / iPad:\n  Tap Share, then "Add to Home Screen"\n\nAndroid:\n  Tap the browser menu, then "Install app" / "Add to Home screen"');
      });
    }
  }

  /** Support the PWA shortcuts: ./?tab=ai and ./?tab=crop */
  function applyDeepLink() {
    var wanted = new URLSearchParams(location.search).get('tab');
    if (!wanted) return;
    var tabEl = document.querySelector('.tab[data-t="' + wanted + '"]');
    if (tabEl) tabEl.click();
  }

  /* ======================================================================
     Boot
     ====================================================================== */
  async function init() {
    fillStates();
    initTabs();
    renderPersonaCards();
    renderChips();
    renderAIHead();
    renderProfile();
    plan();
    bootMsg();
    setPersona('agri');
    booted = true;

    $('getBtn').addEventListener('click', getWeather);
    $('city').addEventListener('keydown', function (e) { if (e.key === 'Enter') getWeather(); });
    $('sendBtn').addEventListener('click', function () { ask(); });
    $('qi').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); }
    });
    $('state').addEventListener('change', function () { renderProfile(); renderSuggest(); });
    $('land').addEventListener('input', renderSuggest);
    $('season').addEventListener('change', plan);
    $('state2').addEventListener('change', plan);
    $('focus').addEventListener('change', plan);
    $('cfgBtn').addEventListener('click', openCfg);
    $('closeCfg').addEventListener('click', closeCfg);
    $('saveCfg').addEventListener('click', saveCfg);
    $('clearCfg').addEventListener('click', function () {
      CFG = { prov: 'offline', key: '' };
      try { localStorage.removeItem('mausam_ai'); } catch (e) { /* ignore */ }
      $('prov').value = 'offline'; $('key').value = '';
      setMode();
    });
    $('mask').addEventListener('click', function (e) { if (e.target === $('mask')) closeCfg(); });

    initPWA();
    applyDeepLink();

    var health = await detectBackend();
    setMode(health);
    getWeather();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

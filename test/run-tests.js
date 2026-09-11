/**
 * MAUSAM — test suite.
 *
 *   node test/run-tests.js
 *
 * Part 1: unit tests for the shared logic engine (no network).
 * Part 2: integration tests that boot the real Express app in-process.
 *
 * LLM keys are explicitly blanked so the suite never calls a paid provider —
 * the /api/ai tests therefore exercise the offline knowledge-base path.
 */
'use strict';

// Must run before the app is required.
process.env.GEMINI_API_KEY = '';
process.env.GROQ_API_KEY = '';
process.env.OPENROUTER_API_KEY = '';
process.env.LLM_PROVIDER = '';

const path = require('path');
const fs = require('fs');
const vm = require('vm');
const ENGINE = require(path.join(__dirname, '..', 'public', 'js', 'engine.js'));
const DATA = require(path.join(__dirname, '..', 'public', 'js', 'data.js'));
const CONTEXT = require(path.join(__dirname, '..', 'public', 'js', 'context.js'));
const GEO = require(path.join(__dirname, '..', 'public', 'js', 'geo.js'));

let pass = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) { pass++; return; }
  failures.push(name + (extra ? '  ->  ' + extra : ''));
}

/* ------------------------------------------------------------------ fixtures */
const HOURS = Array.from({ length: 48 }, (_, i) =>
  `2026-09-11T${String(i % 24).padStart(2, '0')}:00`);

const WX = {
  city: 'Panaji', state: 'Goa', temp: 30, hum: 78, feels: 34, rain: 0, wind: 14, code: 1, isDay: 1,
  dmax: [31, 32, 30, 29, 31], dmin: [25, 26, 24, 24, 25], dsum: [0, 2, 8, 1, 0],
  duv: [9, 8, 7, 8, 9], dcode: [1, 2, 61, 3, 1],
  dtime: ['2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15'],
  htime: HOURS, htemp: HOURS.map(() => 30), hfeels: HOURS.map(() => 34),
  hhum: HOURS.map(() => 78), hrain: HOURS.map(() => 0), hprob: HOURS.map(() => 10),
  hcode: HOURS.map(() => 1), hwind: HOURS.map(() => 14), huv: HOURS.map(() => 9),
  nowIdx: 8, rain3: 10,
};
const AQ = { aqi: 88, pm25: 30, pm10: 55, htime: HOURS, haqi: HOURS.map(() => 88) };
const MAR = {
  wave: 1.4, per: 10, swell: 1.1, sst: 28.4, dir: 225,
  htime: HOURS, hwave: HOURS.map(() => 1.4), hper: HOURS.map(() => 10),
  hswell: HOURS.map(() => 1.1),
  hlevel: HOURS.map((_, i) => 1.5 + 1.0 * Math.sin((i / 6) * Math.PI)),
};

/* ======================================================================
   PART 1 — unit tests
   ====================================================================== */
console.log('\n── engine unit tests ─────────────────────────────────────');

const personaKeys = Object.keys(DATA.PERSONAS);
check('8 personas in the catalogue', personaKeys.length === 8, personaKeys.join(', '));
check('every persona has 6 suggested questions',
  personaKeys.every((k) => DATA.PERSONAS[k].chips.length === 6));
check('32 states of agronomy data', Object.keys(DATA.STATES).length >= 30);
check('17 crop guides', Object.keys(DATA.CROPS).length >= 15);

// comfort index
check('comfort: ideal conditions >= 95', ENGINE.comfortIndex(24, 50, 0, 10, 3) >= 95, String(ENGINE.comfortIndex(24, 50, 0, 10, 3)));
check('comfort: worst case < 40', ENGINE.comfortIndex(42, 85, 80, 40, 11) < 40);
check('comfort: rises with better weather', ENGINE.comfortIndex(24, 50, 0, 10, 3) > ENGINE.comfortIndex(24, 50, 90, 10, 3));
check('comfort: stays inside 0..100', [0, 1, 50, 99, 150].every((v) => { const s = ENGINE.comfortIndex(v, v, v, v, v); return s >= 0 && s <= 100; }));
check('comfortInfo labels differ by band', ENGINE.comfortInfo(85).col !== ENGINE.comfortInfo(20).col);

// surf / sea
check('surf rating bands', ENGINE.surfRating(0.3).c === 'Flat' && ENGINE.surfRating(0.8).c === 'Small' &&
  ENGINE.surfRating(1.2).c === 'Fun' && ENGINE.surfRating(2.0).c === 'Good' && ENGINE.surfRating(4.0).c === 'Dangerous');
check('sea temp bands', ENGINE.seaTempInfo(16).c === 'Cold' && ENGINE.seaTempInfo(25).c === 'Perfect' && ENGINE.seaTempInfo(30).c === 'Warm');
check('direction naming', ENGINE.dirName(0) === 'N' && ENGINE.dirName(90) === 'E' && ENGINE.dirName(225) === 'SW');

// tide
ENGINE.setWeather(WX); ENGINE.setAir(AQ); ENGINE.setMarine(MAR);
const tide = ENGINE.tideInfo();
check('tide finds a high and a low', !!(tide && tide.high && tide.low),
  tide && tide.high ? `high ${tide.high.t}=${tide.high.v.toFixed(2)}m low ${tide.low.t}=${tide.low.v.toFixed(2)}m` : 'none');
check('tide high > tide low', tide && tide.high.v > tide.low.v);

// best window
check('bestWindow returns a slot', !!ENGINE.bestWindow());
check('bestEventWindow returns a slot', !!ENGINE.bestEventWindow());

// geocoding helpers
check('geo: alias "Panaji" -> Panjim', GEO.queryFor('Panaji') === 'Panjim');
check('geo: alias "Bangalore" -> Bengaluru', GEO.queryFor('bangalore') === 'Bengaluru');
check('geo: strips diacritics', GEO.normalizeName('Panāji') === 'panaji');
check('geo: unknown city is passed through', GEO.queryFor('Nagpur') === 'Nagpur');
const indianWin = GEO.pickPlace([
  { name: 'Panajijay', country_code: 'GT', feature_code: 'PPL', population: 100, latitude: 1, longitude: 1 },
  { name: 'Panāji Muwara', country_code: 'IN', feature_code: 'PPL', population: 50, latitude: 2, longitude: 2 },
], 'Panaji');
check('geo: prefers the Indian match', indianWin && indianWin.country_code === 'IN', indianWin && indianWin.name + '/' + indianWin.country_code);
const exactWin = GEO.pickPlace([
  { name: 'Goa', country_code: 'PH', feature_code: 'PPL', population: 0, latitude: 1, longitude: 1 },
  { name: 'Goa', country_code: 'IN', feature_code: 'PPL', population: 0, latitude: 2, longitude: 2 },
], 'Goa');
check('geo: exact name + India wins a tie', exactWin && exactWin.country_code === 'IN');

// persona router (Hindi + Hinglish + English)
const routes = [
  ['mere crop me keeda lag raha hai', 'agri'],
  ['मेरी मिट्टी कौन सी है', 'agri'],
  ['इस मौसम में कौन सी फसल लगाऊं', 'agri'],
  ['aaj run ke liye best time', 'run'],
  ['आज दौड़ने का समय', 'run'],
  ['tide kab badhegi', 'beach'],
  ['समुद्र में लहर कैसी है', 'beach'],
  ['aaj aqi kitna hai', 'aqi'],
  ['आज वायु प्रदूषण', 'aqi'],
  ['shaadi ka event plan', 'event'],
  ['शादी का आयोजन', 'event'],
  ['बच्चों को स्कूल भेजना है', 'school'],
];
routes.forEach(([q, want]) => check(`router: "${q}" -> ${want}`, ENGINE.detectDomain(q) === want, String(ENGINE.detectDomain(q))));
check('router: generic question -> null', ENGINE.detectDomain('hello how are you') === null);

// persona isolation in the prompt context
ENGINE.setProfile('Maharashtra', 2);
const agriCtx = CONTEXT.buildContext('agri', { weather: WX, air: AQ, marine: MAR }, { state: 'Maharashtra', land: 2 });
check('agri context includes AGRI CONTEXT', /AGRI CONTEXT/.test(agriCtx));
const leaks = [];
['run', 'school', 'travel', 'aqi', 'commute', 'beach', 'event'].forEach((k) => {
  const c = CONTEXT.buildContext(k, { weather: WX, air: AQ, marine: MAR }, { state: 'Maharashtra', land: 2 });
  ['AGRI CONTEXT', 'Kharif', 'Zaid', 'Soil:', 'acre'].forEach((w) => { if (c.indexOf(w) !== -1) leaks.push(k + ':' + w); });
});
check('context: no agriculture leakage into other personas', leaks.length === 0, leaks.join(', '));
check('beach context has MARINE CONTEXT', /MARINE CONTEXT/.test(CONTEXT.buildContext('beach', { weather: WX, air: AQ, marine: MAR }, { state: 'Maharashtra', land: 2 })));
check('event context has EVENT COMFORT CONTEXT', /EVENT COMFORT CONTEXT/.test(CONTEXT.buildContext('event', { weather: WX, air: AQ, marine: MAR }, { state: 'Maharashtra', land: 2 })));

// system prompt rules
const sys = CONTEXT.systemPrompt(DATA.PERSONAS.beach);
check('system prompt locks the persona', /ACTIVE PERSONA:/.test(sys));
check('system prompt forbids agriculture for other personas', /NEVER talk about farming/.test(sys));
check('system prompt demands English answers', /always reply in ENGLISH ONLY/.test(sys));
check('system prompt accepts Hindi input', /Hindi \(Devanagari\), Hinglish or English/.test(sys));

// English-only answers, even for Hindi questions
const hinglish = /\b(karein|chahiye|nahi|batao|hoga|hoon|karke|dhyan|lagau|abhi|sawaal|jawab)\b/i;
const devanagari = /[\u0900-\u097F]/;
const hindiQs = ['मिट्टी', 'दौड़', 'स्कूल', 'यात्रा', 'प्रदूषण', 'यातायात', 'समुद्र', 'शादी'];
const notEnglish = [];
personaKeys.forEach((k, i) => {
  ENGINE.setPersona(k);
  const a = ENGINE.offline(hindiQs[i] + ' के बारे में बताओ');
  if (devanagari.test(a)) notEnglish.push(k + ':devanagari');
  if (hinglish.test(a)) notEnglish.push(k + ':' + (a.match(hinglish) || [''])[0]);
});
check('all 8 answers are pure English even for Hindi input', notEnglish.length === 0, notEnglish.join(', '));

// every persona answers in its own domain
const markers = {
  agri: /crop plan/i, run: /Running plan/i, school: /School commute/i, travel: /Travel brief/i,
  aqi: /Air Quality/i, commute: /Commute nowcast/i, beach: /Surf report/i, event: /Event planner brief/i,
};
const missing = [];
const answers = {};
personaKeys.forEach((k) => {
  ENGINE.setPersona(k);
  answers[k] = ENGINE.offline('please help me with this');
  if (!markers[k].test(answers[k])) missing.push(k);
});
check('every persona returns its own domain answer', missing.length === 0, missing.join(', '));
check('all 8 answers are distinct', new Set(Object.values(answers)).size === 8);

// cross-persona hint
ENGINE.setPersona('run');
check('cross-persona question surfaces a switch hint',
  /belongs to the .*persona/i.test(ENGINE.offline('mere crop me keeda lag raha hai')));

// inland city must not crash the beach persona
ENGINE.setMarine(null);
ENGINE.setPersona('beach');
const inland = ENGINE.offline('wave height batao');
check('beach persona handles an inland city', /Marine data is not available|coastal city/i.test(inland));

ENGINE.setMarine(MAR);

/* ======================================================================
   PART 2 — API integration tests
   ====================================================================== */
(async function apiTests() {
  console.log('── API integration tests ────────────────────────────────');

  const app = require(path.join(__dirname, '..', 'server', 'index.js'));
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async (p) => { const r = await fetch(base + p); return { status: r.status, body: await r.json().catch(() => null) }; };
  const post = async (p, b) => {
    const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    return { status: r.status, body: await r.json().catch(() => null) };
  };

  const health = await get('/api/health');
  check('GET /api/health -> 200', health.status === 200, String(health.status));
  check('health identifies the service', health.body && health.body.service === 'mausam-ai');
  check('health reports no AI provider when keys are blank', health.body && health.body.aiProvider === null, String(health.body && health.body.aiProvider));

  const personas = await get('/api/personas');
  check('GET /api/personas -> 200', personas.status === 200);
  check('personas payload has 8 entries', personas.body && Object.keys(personas.body.personas).length === 8);

  const noCity = await get('/api/weather');
  check('GET /api/weather without city -> 400', noCity.status === 400, String(noCity.status));

  const bogus = await get('/api/weather?city=zzzznotarealcity123');
  check('GET /api/weather with unknown city -> 404', bogus.status === 404, String(bogus.status));

  const noArgs = await get('/api/weather');
  check('GET /api/weather with no args -> 400 (asks for city or lat/lon)', noArgs.status === 400, String(noArgs.status));

  const badCoords = await get('/api/weather?lat=999&lon=0');
  check('GET /api/weather with out-of-range coords -> 400', badCoords.status === 400, String(badCoords.status));

  try {
    // Nagpur coordinates - the "my current location" path
    const byCoords = await get('/api/weather?lat=21.15&lon=79.09');
    check('GET /api/weather?lat&lon -> 200 (my-location path)', byCoords.status === 200 && byCoords.body.weather.temp != null,
      byCoords.status + ' ' + JSON.stringify(byCoords.body && byCoords.body.error));
    check('coordinate lookup returns a 7-day forecast',
      byCoords.body && Array.isArray(byCoords.body.weather.dtime) && byCoords.body.weather.dtime.length === 7,
      byCoords.body && String(byCoords.body.weather.dtime && byCoords.body.weather.dtime.length));
  } catch (e) {
    check('GET /api/weather?lat&lon -> 200 (my-location path)', false, 'network: ' + e.message);
  }

  let weatherOk = false;
  try {
    const w = await get('/api/weather?city=Panjim');
    weatherOk = w.status === 200 && w.body.weather && w.body.weather.temp != null;
    check('GET /api/weather (Panjim) -> 200 with temperature', weatherOk, w.status + ' ' + JSON.stringify(w.body && w.body.error));
    if (weatherOk) {
      check('weather payload carried through the alias lookup', !!w.body.location && /panjim/i.test(w.body.location.name), w.body.location && w.body.location.name);
      check('geocoding resolved inside India', w.body.location && w.body.location.countryCode === 'IN',
        w.body.location && (w.body.location.name + ', ' + w.body.location.country));
      check('weather payload has hourly data for nowcast', Array.isArray(w.body.weather.htime) && w.body.weather.htime.length > 12);
      check('weather payload has a 7-day forecast', Array.isArray(w.body.weather.dtime) && w.body.weather.dtime.length === 7);
      check('coastal city returns marine data', !!w.body.marine && w.body.marine.wave != null);
      check('air quality present', !!w.body.air && typeof w.body.air.aqi === 'number');
    }
  } catch (e) {
    check('GET /api/weather (Panjim) -> 200 with temperature', false, 'network: ' + e.message);
  }

  try {
    const inlandRes = await get('/api/weather?city=Nagpur');
    check('inland city returns null marine instead of failing', inlandRes.status === 200 && inlandRes.body.marine === null,
      inlandRes.status + ' marine=' + JSON.stringify(inlandRes.body && inlandRes.body.marine));
  } catch (e) {
    check('inland city returns null marine instead of failing', false, 'network: ' + e.message);
  }

  const badPersona = await post('/api/ai', { persona: 'nope', question: 'hi' });
  check('POST /api/ai with a bad persona -> 400', badPersona.status === 400, String(badPersona.status));

  const noQuestion = await post('/api/ai', { persona: 'run', question: '   ' });
  check('POST /api/ai without a question -> 400', noQuestion.status === 400, String(noQuestion.status));

  const aiRun = await post('/api/ai', { persona: 'run', question: 'What is the best time to run today?', city: 'Panjim' });
  check('POST /api/ai -> 200', aiRun.status === 200, String(aiRun.status));
  check('AI answer falls back to the offline knowledge base', aiRun.body && aiRun.body.source === 'offline', aiRun.body && aiRun.body.source);
  check('running answer stays in the running domain', aiRun.body && /Running plan/i.test(aiRun.body.answer));
  check('running answer never mentions crops', aiRun.body && !/Kharif|crop plan|sowing/i.test(aiRun.body.answer));

  const aiBeach = await post('/api/ai', { persona: 'beach', question: 'क्या मैं आज तैर सकता हूँ?', city: 'Panjim' });
  check('Hindi question is understood by the backend', aiBeach.status === 200 && /Surf report/i.test(aiBeach.body.answer));
  check('backend answer is English even for a Hindi question',
    aiBeach.body && !/[\u0900-\u097F]/.test(aiBeach.body.answer));

  const aiEvent = await post('/api/ai', { persona: 'event', question: 'shaadi ke liye aaj ka comfort index?', city: 'Panjim' });
  check('event persona answers with the Comfort Index', aiEvent.status === 200 && /Comfort Index/i.test(aiEvent.body.answer));

  await new Promise((r) => server.close(r));

  /* ==================================================================
     PART 3 - the generated standalone file boots on its own
     ================================================================== */
  console.log('── standalone build smoke test ──────────────────────────');

  const standaloneFile = path.join(__dirname, '..', 'standalone', 'mausam-ai.html');
  if (!fs.existsSync(standaloneFile)) {
    check('standalone build exists (run npm run build:standalone)', false, 'file missing');
  } else {
    const src = fs.readFileSync(standaloneFile, 'utf8');
    check('standalone has no external stylesheet link', src.indexOf('href="css/style.css"') === -1);
    check('standalone has no external script tags', src.indexOf('<script src=') === -1);
    check('standalone inlines the logo as a data URI', src.indexOf('data:image/png;base64') !== -1);

    const inline = src.match(/<script>([\s\S]*)<\/script>/);
    check('standalone contains one inline script bundle', !!inline);

    if (inline) {
      const els = {};
      const mk = () => ({
        innerHTML: '', textContent: '', value: '', className: '', hidden: false, scrollTop: 0,
        style: {}, dataset: {},
        classList: { add() {}, remove() {}, contains() { return false; } },
        appendChild() {}, addEventListener() {}, removeEventListener() {},
        querySelectorAll() { return []; }, closest() { return null; },
      });
      const defaults = { state: 'Maharashtra', state2: 'Maharashtra', season: 'all', focus: 'all', land: '2', city: 'Nagpur' };
      const store = {};
      const sandbox = {
        console: { log() {}, warn() {}, error() {} },
        setTimeout, clearTimeout, setInterval, clearInterval,
        Math, Date, JSON, parseInt, parseFloat, isNaN, Number, String, Array, Object, RegExp, Error,
        Promise, AbortController,
        localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } },
        navigator: { userAgent: 'node' },
      };
      sandbox.window = sandbox;
      sandbox.self = sandbox;
      // the app registers PWA listeners on window
      sandbox.addEventListener = () => {};
      sandbox.removeEventListener = () => {};
      sandbox.navigator = { userAgent: 'node', serviceWorker: undefined };
      sandbox.location = { protocol: 'file:', search: '', href: 'file:///standalone.html' };
      sandbox.URLSearchParams = URLSearchParams;
      sandbox.document = {
        readyState: 'complete',
        getElementById: (id) => {
          if (!els[id]) { els[id] = mk(); if (id in defaults) els[id].value = defaults[id]; }
          return els[id];
        },
        querySelectorAll: () => [],
        createElement: () => mk(),
        addEventListener: () => {},
      };
      // any network call simply fails - the app must degrade gracefully
      sandbox.fetch = () => Promise.reject(new Error('offline smoke test'));

      let bootError = null;
      try {
        vm.createContext(sandbox);
        vm.runInContext(inline[1], sandbox, { filename: 'standalone.js' });
      } catch (e) {
        bootError = e;
      }
      check('standalone bundle executes without throwing', !bootError, bootError && bootError.message);

      await new Promise((r) => setTimeout(r, 250));

      const grid = els.pgrid ? els.pgrid.innerHTML : '';
      check('standalone renders the 8 persona cards', (grid.match(/data-persona=/g) || []).length === 8,
        String((grid.match(/data-persona=/g) || []).length) + ' cards');
      check('standalone wires up the data + engine modules',
        !!sandbox.MAUSAM_DATA && !!sandbox.MAUSAM_ENGINE && !!sandbox.MAUSAM_GEO && !!sandbox.MAUSAM_CONTEXT);
      // ---- offline behaviour: the app must fall back to sample data -------
      const wout = els.wout ? els.wout.innerHTML : '';
      check('offline boot falls back to demo data instead of an empty screen',
        /DEMO DATA/i.test(wout), wout.slice(0, 80));
      check('demo banner is shown to the user', els.demoNote && els.demoNote.hidden === false);
      check('demo banner explains why', /no internet connection/i.test(els.demoNote ? els.demoNote.innerHTML : ''));

      // ---- 7-day forecast chart (pure function, no network needed) --------
      const APP = sandbox.MAUSAM_APP;
      check('app exposes a test hook', !!APP && typeof APP.forecastChart === 'function');

      if (APP && APP.forecastChart) {
        const fx = {
          city: 'Nagpur', state: 'Maharashtra',
          dtime: ['2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17'],
          dmax: [31, 28, 29, 30, 32, 32, 32],
          dmin: [24, 24, 23, 24, 24, 23, 24],
          dsum: [26.1, 16.1, 22.3, 1.7, 0.6, 1.5, 0.6],
          duv: [8, 8, 4, 8, 7, 7, 7],
          dcode: [2, 61, 80, 2, 0, 0, 1],
        };
        const svg = APP.forecastChart(fx);
        check('chart returns an <svg>', /^<svg /.test(svg) && /<\/svg>$/.test(svg), svg.slice(0, 40));
        check('chart has a viewBox (responsive)', /viewBox="0 0 \d+ \d+"/.test(svg));
        check('chart plots both temperature lines', (svg.match(/<polyline/g) || []).length === 2);
        check('chart fills the area under the max line', svg.indexOf('url(#fcMax)') !== -1);
        check('chart draws 7 rain bars', (svg.match(/<rect /g) || []).length === 7,
          String((svg.match(/<rect /g) || []).length) + ' bars');
        check('chart labels all 7 days', ['Today', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'].every((d) => svg.indexOf('>' + d + '<') !== -1));
        check('chart shows rain values', svg.indexOf('26.1') !== -1 && svg.indexOf('0.6') !== -1);
        check('chart has no undefined/NaN', !/undefined|NaN/.test(svg));
        check('chart handles a single day without crashing', /^<svg /.test(APP.forecastChart({
          dtime: ['2026-09-11'], dmax: [30], dmin: [20], dsum: [0], duv: [5], dcode: [0],
        })));
      }

      // ---- built-in sample dataset ----------------------------------------
      check('demo controls are exposed', !!APP && typeof APP.loadDemo === 'function');

      if (APP && APP.loadDemo) {
        APP.setDemoForced(true);
        check('demo flag can be turned on', APP.demoForced() === true);

        APP.loadDemo({ name: 'Demo City' }, 'forced');
        const st = APP.state();
        check('demo weather is generated', !!st.WX && st.WX.demo === true);
        check('demo dataset has 7 days', st.WX.dtime.length === 7, String(st.WX.dtime.length));
        check('demo dataset has 168 hourly points', st.WX.htime.length === 168, String(st.WX.htime.length));
        check('demo dataset has air quality', !!st.AQ && typeof st.AQ.aqi === 'number');
        check('demo dataset is realistic (temps in range)',
          st.WX.dmax.every((v) => v > 5 && v < 50) && st.WX.dmin.every((v) => v > 0 && v < 40));
        check('demo dataset has rain and UV per day',
          st.WX.dsum.length === 7 && st.WX.duv.length === 7);
        check('demo current temp is an hourly value',
          st.WX.temp === st.WX.htemp[st.WX.nowIdx]);
        check('chart renders from demo data', /^<svg /.test(APP.forecastChart(st.WX)));
        check('demo reason is reported as forced', /demo mode is switched on/i.test(els.demoNote.innerHTML));

        APP.setDemoForced(false);
        check('demo flag can be turned off', APP.demoForced() === false);
      }
    }
  }

  /* --------------------------------------------------------------- report */
  console.log('');
  if (failures.length) {
    console.log('FAILURES:');
    failures.forEach((f) => console.log('  ✗ ' + f));
  }
  const total = pass + failures.length;
  console.log(`${pass}/${total} checks passed`);
  process.exit(failures.length ? 1 : 0);
})();

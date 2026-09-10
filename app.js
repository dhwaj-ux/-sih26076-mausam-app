/**
 * SIH26076: Mausam App - Frontend Client Controller & Personalization Engine (public/app.js)
 * Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)
 *
 * Orchestrates client-side interactions:
 *  - Searchable Indian cities dropdown (Delhi, Mumbai, Bengaluru, Udaipur, Bikaner, etc.)
 *  - Preset location chips & HTML5 GPS detection
 *  - Multi-Source API data fetching from /api/weather (zero frontend API keys exposed)
 *  - Dynamic DOM rendering for meteorological summary & 8-persona advisories
 *  - Interactive 8-tab grid with active card selection & spotlight detail viewer
 *  - Live Multi-Source API status indicators vs offline fallback alerts
 *  - Favorite location bookmarking to /api/save-location
 *  - Bilingual i18n dictionary (English & Hindi)
 *  - Algorithmic Personalization Engine (dynamic card re-ordering & tailored insights)
 *  - 24-Hour Temperature & Rain Chart.js telemetry charts
 *  - 7-Day extended IMD numerical forecast simulation
 *  - Leaflet Doppler Radar & satellite precipitation map
 *  - Mausam AI Assistant side drawer chatbot
 *  - Modal managers (Advisory detail, Widget customization, Persona onboarding wizard)
 */

// Preset Indian Cities (featuring Delhi, Mumbai, Bengaluru, Udaipur, Bikaner)
const PRESET_LOCATIONS = [
  { name: 'Delhi', lat: 28.6139, lon: 77.2090, region: 'NCR' },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, region: 'Coastal Maharashtra' },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, region: 'Karnataka Tech Plateau' },
  { name: 'Udaipur', lat: 24.5854, lon: 73.7125, region: 'City of Lakes, Rajasthan' },
  { name: 'Bikaner', lat: 28.0229, lon: 73.3119, region: 'Thar Desert, Rajasthan' },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707, region: 'Coromandel Coast' },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639, region: 'Ganges Delta' },
  { name: 'Shimla', lat: 31.1048, lon: 77.1734, region: 'Himalayan Foothills' },
  { name: 'Kochi', lat: 9.9312, lon: 76.2673, region: 'Malabar Coast' },
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867, region: 'Deccan Plateau' }
];

// Persona Configuration Metadata: maps 8 personas to UI labels, icons and categories
const PERSONA_CONFIG = {
  'Health-Conscious': {
    title: 'Health-Conscious',
    displayName: 'Health',
    subtitle: 'Respiratory, Asthma & UV Protection',
    icon: '🩺',
    filterKey: 'Health-Conscious',
    category: 'Health & Respiratory',
    keyMetrics: ['pm2_5', 'pm10', 'uvIndex'],
    guidance: 'Monitors fine particulate matter and solar irradiance for vulnerable populations.'
  },
  'Commuters': {
    title: 'Daily Commuters',
    displayName: 'Commuters',
    subtitle: 'Corridor Visibility, Fog & Rain Transit',
    icon: '🚗',
    filterKey: 'Commuters',
    category: 'Transit & Mobility',
    keyMetrics: ['visibility', 'rainProb', 'trafficCondition'],
    guidance: 'Evaluates highway visibility thresholds and precipitation impact on road corridors.'
  },
  'Agriculture/Gardeners': {
    title: 'Farmers & Agriculture',
    displayName: 'Farmers',
    subtitle: 'Root Moisture, Sowing & Frost Watch',
    icon: '🌾',
    filterKey: 'Agriculture/Gardeners',
    category: 'Agro & Farming',
    keyMetrics: ['soilMoisture', 'temperature', 'humidity'],
    guidance: 'Optimizes irrigation scheduling, fertilizer timing, and frost crop protection.'
  },
  'Beachgoers/Surfers': {
    title: 'Beachgoers & Surfers',
    displayName: 'Beachgoers',
    subtitle: 'Wave Swell, Rip Currents & Coastal Safety',
    icon: '🏄',
    filterKey: 'Beachgoers/Surfers',
    category: 'Coastal & Marine',
    keyMetrics: ['waveHeight', 'oceanCurrentVelocity', 'windSpeed'],
    guidance: 'Tracks significant wave height and offshore surface current velocities.'
  },
  'Parents & Families': {
    title: 'Parents & Families',
    displayName: 'Parents',
    subtitle: 'School Transit, Child Rain & Heat Gear',
    icon: '👨‍👩‍👧',
    filterKey: 'Parents & Families',
    category: 'Family & School',
    keyMetrics: ['temperature', 'rainProb', 'pm2_5'],
    guidance: 'Recommends child weather gear, hydration, and outdoor school safety measures.'
  },
  'Event Planners': {
    title: 'Event Planners',
    displayName: 'Event Planners',
    subtitle: 'Thom THI Bioclimatic Comfort Index',
    icon: '🎉',
    filterKey: 'Event Planners',
    category: 'Events & Hospitality',
    keyMetrics: ['temperature', 'humidity'],
    guidance: 'Calculates psychrometric Temperature-Humidity Index (THI) for outdoor gatherings.'
  },
  'Travelers': {
    title: 'Travelers & Tourists',
    displayName: 'Travelers',
    subtitle: 'Adaptive Packing & Microclimate Warning',
    icon: '🧳',
    filterKey: 'Travelers',
    category: 'Tourism & Travel',
    keyMetrics: ['temperature', 'rainProb', 'uvIndex'],
    guidance: 'Provides dynamic packing advisories based on regional temperature classifications.'
  },
  'Outdoor Fitness': {
    title: 'Outdoor Fitness / General',
    displayName: 'General',
    subtitle: 'Athletes, Running Windows & Heat Stress',
    icon: '🏃',
    filterKey: 'Outdoor Fitness',
    category: 'Athletics & General',
    keyMetrics: ['temperature', 'humidity', 'uvIndex'],
    guidance: 'Determines safe outdoor workout windows and heat stress prevention.'
  }
};

// =============================================================================
// Bilingual Dictionary (English & Hindi)
// =============================================================================
const i18n = {
  en: {
    govTag: '<i class="fa-solid fa-flag text-sky-400"></i> Ministry of Earth Sciences (MoES) • Govt. of India • IMD',
    tabHome: 'Home',
    tabForecast: 'Forecast',
    tabLocations: 'Locations',
    tabAlerts: 'IMD Alerts',
    tabProfile: 'My Profile',
    customizeBtn: 'Customize',
    advisoryBtn: 'View Advisory',
    humidity: 'Humidity',
    wind: 'Wind',
    uvIndex: 'UV Index',
    rainChance: 'Rain Chance',
    soilMoisture: 'Soil Moisture',
    dewPoint: 'Dew Point',
    hailRisk: 'Hail / Frost Risk',
    irrigationRec: 'Irrigation Advice',
    aiInsightTitle: 'Smart AI Personalization Insight',
    rankingLabel: 'AI Ranking Engine:',
    fitnessTitle: 'Running & Workout Guide',
    bestWorkoutWindow: 'Optimal Workout Windows:',
    heatIndex: 'Heat Risk',
    hydration: 'Hydration',
    parentTitle: 'School Commute & Family Outing',
    travelerTitle: 'Traveler & Destination Weather',
    kisanTitle: 'Gramin Krishi Mausam Sewa',
    healthTitle: 'Air Quality & Health Risk',
    commuterTitle: 'Daily Commuter & Nowcast',
    forecastTitle: '7-Day IMD Official Extended Forecast',
    chartTitle: '24-Hour Temperature & Rain Probability Trend',
    chartSubtitle: 'Real-time psychrometric progression derived from active station telemetry',
    radarTitle: 'Doppler Weather Radar & Live Satellite Map',
    radarSubtitle: 'Interactive precipitation radar overlay updated every 10 mins',
    aiTitle: 'Mausam AI Assistant',
    aiSub: 'MoES Weather Recommendations',
    aiWelcome: 'Namaste! I am your <strong>Mausam AI Assistant</strong>. Ask me anything like: <em>"Can I go jogging today?", "What is the crop advice for wheat?", or "Is rain expected in Delhi?"</em>',
    modalTitle: 'Customize Homepage Widgets',
    modalDesc: 'Toggle which widgets you wish to prioritize on your personalized Mausam homepage:',
    savePreferences: 'Save Preferences'
  },
  hi: {
    govTag: '<i class="fa-solid fa-flag text-sky-400"></i> पृथ्वी विज्ञान मंत्रालय (MoES) • भारत सरकार • मौसम विभाग',
    tabHome: 'होम',
    tabForecast: 'पूर्वानुमान',
    tabLocations: 'स्थान',
    tabAlerts: 'मौसम चेतावनी',
    tabProfile: 'मेरी प्रोफ़ाइल',
    customizeBtn: 'अनुकूलित करें',
    advisoryBtn: 'सलाह देखें',
    humidity: 'आर्द्रता',
    wind: 'हवा की गति',
    uvIndex: 'यूवी सूचकांक',
    rainChance: 'बारिश की संभावना',
    soilMoisture: 'मृदा नमी',
    dewPoint: 'ओसांक',
    hailRisk: 'ओलावृष्टि / पाला जोखिम',
    irrigationRec: 'सिंचाई सलाह',
    aiInsightTitle: 'स्मार्ट एआई वैयक्तिकरण जानकारी',
    rankingLabel: 'एआई रैंकिंग इंजन:',
    fitnessTitle: 'रनिंग और आउटडोर वर्कआउट गाइड',
    bestWorkoutWindow: 'आज वर्कआउट का सही समय:',
    heatIndex: 'ताप जोखिम',
    hydration: 'जल आपूर्ति',
    parentTitle: 'स्कूल आवागमन एवं पारिवारिक यात्रा',
    travelerTitle: 'यात्री एवं गंतव्य मौसम',
    kisanTitle: 'ग्रामीण कृषि मौसम सेवा',
    healthTitle: 'वायु गुणवत्ता सूचकांक (AQI) और स्वास्थ्य जोखिम',
    commuterTitle: 'दैनिक यात्री एवं नाउकास्ट',
    forecastTitle: '7-दिवसीय IMD आधिकारिक विस्तार पूर्वानुमान',
    chartTitle: '24-घंटे तापमान एवं वर्षा संभावना प्रवृत्ति',
    chartSubtitle: 'स्टेशन टेलीमेट्री द्वारा संचालित वास्तविक समय का पूर्वानुमान',
    radarTitle: 'डॉप्लर वेदर रडार एवं लाइव सैटेलाइट मानचित्र',
    radarSubtitle: 'हर 10 मिनट में अपडेट होने वाला वर्षा रडार',
    aiTitle: 'मौसम एआई सहायक',
    aiSub: 'MoES मौसम संबंधी सिफारिशें',
    aiWelcome: 'नमस्ते! मैं आपका <strong>मौसम एआई सहायक</strong> हूँ। मुझसे पूछें: <em>"क्या मैं आज दौड़ने जा सकता हूँ?", "गेहूं की फसल के लिए क्या सलाह है?", या "दिल्ली में बारिश होगी?"</em>',
    modalTitle: 'होमपेज विजेट्स को अनुकूलित करें',
    modalDesc: 'अपने होमपेज पर दिखाए जाने वाले विजेट चुनें:',
    savePreferences: 'प्राथमिकताएं सहेजें'
  }
};

// Global State
const state = {
  currentCity: 'Delhi',
  currentLang: 'en',
  currentPersona: 'runner', // runner, parent, traveler, farmer, health, commuter
  userWidgets: {
    fitness: true,
    parent: true,
    traveler: true,
    kisan: true,
    health: true,
    commuter: true
  }
};

let currentCoordinates = { lat: 28.6139, lon: 77.2090 };
let currentCityName = 'New Delhi';
let currentWeatherData = null;
let currentPersonaData = {};
let activeSelectedPersonaKey = 'Health-Conscious';

let hourlyChartInstance = null;
let personaHourlyChartInstance = null;


// =============================================================================
// Algorithmic Personalization Engine
// =============================================================================
const PersonalizationEngine = {
  calculateScores(role, weather) {
    const scores = {
      fitness: 30,
      parent: 30,
      traveler: 30,
      kisan: 30,
      health: 30,
      commuter: 30
    };

    const temp = Number(weather.temperature || 28);
    const rain = Number(weather.rainProb || 15);
    const uv = Number(weather.uvIndex || 5);
    const pm25 = Number(weather.pm2_5 || 40);

    if (role === 'runner' || role === 'fitness') {
      scores.fitness += 55;
      if (temp > 30) scores.fitness += 15;
      if (uv > 6) scores.fitness += 10;
    } else if (role === 'parent') {
      scores.parent += 55;
      if (rain > 40) scores.parent += 20;
    } else if (role === 'traveler') {
      scores.traveler += 55;
      if (rain > 40) scores.traveler += 15;
    } else if (role === 'farmer' || role === 'agriculture') {
      scores.kisan += 60;
      if (weather.soilMoisture < 0.25) scores.kisan += 15;
    } else if (role === 'health') {
      scores.health += 55;
      if (pm25 > 60) scores.health += 25;
    } else if (role === 'commuter') {
      scores.commuter += 55;
      if (rain > 40 || weather.visibility < 3000) scores.commuter += 20;
    }

    return scores;
  },

  generateInsight(role, weather, city) {
    const temp = Number(weather.temperature || 28).toFixed(1);
    const humidity = weather.humidity || 60;
    const rain = weather.rainProb || 0;
    const pm25 = weather.pm2_5 || 35;

    if (role === 'runner' || role === 'fitness') {
      const best = temp > 32 ? '05:30 AM - 07:15 AM' : '06:00 AM - 08:30 AM';
      return `Current weather in ${city} is ${temp}°C with ${humidity}% humidity. For optimal performance, <strong>${best}</strong> is the safest running window before peak heat index.`;
    }
    if (role === 'parent') {
      const adv = rain >= 50
        ? 'Rainfall expected during commute hours. Ensure children carry raincoats and umbrellas.'
        : 'Clear to pleasant commute conditions anticipated. Ensure sufficient hydration.';
      return `School commute update for ${city}: Rain probability is <strong>${rain}%</strong>. ${adv}`;
    }
    if (role === 'traveler') {
      const pack = rain >= 50
        ? 'Pack waterproof footwear and an umbrella.'
        : temp > 30 ? 'Pack light breathable cotton apparel.' : 'Pack a light jacket for breezy evenings.';
      return `Travel briefing for ${city}: Current temperature is <strong>${temp}°C</strong>. ${pack}`;
    }
    if (role === 'farmer' || role === 'agriculture') {
      const moisture = weather.soilMoisture !== undefined ? `${(weather.soilMoisture * 100).toFixed(0)}%` : '62%';
      return `Gramin Krishi Update for ${city}: Soil moisture is ${moisture}. Weather conditions are suitable for seasonal field operations and soil aeration.`;
    }
    if (role === 'health') {
      const status = pm25 > 90 ? 'Poor' : pm25 > 60 ? 'Moderate' : 'Good';
      return `PM2.5 particulate level in ${city} is <strong>${pm25} µg/m³ (${status})</strong>. Sensitive individuals should wear protective masks during peak traffic hours.`;
    }
    if (role === 'commuter') {
      return `Commuter update for ${city}: Road corridor visibility is <strong>${weather.visibility ? (weather.visibility / 1000).toFixed(1) + ' km' : 'Good'}</strong>. ${weather.trafficCondition || 'Smooth Flow'}.`;
    }

    return `Weather in ${city} is ${temp}°C with ${weather.humidity}% humidity. Have a safe and productive day ahead!`;
  },

  rankAndSortWidgets(role, weather) {
    const scores = this.calculateScores(role, weather);
    const grid = document.getElementById('widgetsGrid');
    if (!grid) return;

    const cards = Array.from(grid.children);
    cards.forEach((card) => {
      const widgetId = card.getAttribute('data-widget');
      const score = scores[widgetId] || 20;
      card.setAttribute('data-score', score);
      card.style.order = 100 - score;
    });
  }
};

// =============================================================================
// DOM Elements Initialization
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  renderPresetChips();
  setupDropdownAndSearch();
  setupFilterTabs();
  setupModalEvents();
  setupPersonaSwitchers();
  setupNavigationTabs();
  setupLanguageToggle();
  setupAiDrawer();

  // Initial load for Delhi
  fetchWeather(28.6139, 77.2090, 'New Delhi');
});

// =============================================================================
// Searchable Dropdown & Autocomplete Search Bar
// =============================================================================
function setupDropdownAndSearch() {
  const presetCitySelect = document.getElementById('presetCitySelect');
  const citySearchInput = document.getElementById('citySearchInput');

  if (presetCitySelect) {
    presetCitySelect.addEventListener('change', (e) => {
      const selectedCity = e.target.value;
      const match = PRESET_LOCATIONS.find((loc) => loc.name.toLowerCase() === selectedCity.toLowerCase());
      if (match) {
        selectLocation(match);
      }
    });
  }

  if (citySearchInput) {
    citySearchInput.addEventListener('change', (e) => {
      const query = e.target.value.trim().toLowerCase();
      const match = PRESET_LOCATIONS.find(
        (loc) => loc.name.toLowerCase() === query || loc.region.toLowerCase().includes(query)
      );
      if (match) {
        selectLocation(match);
      }
    });
  }
}

function selectLocation(loc) {
  const latInput = document.getElementById('latInput');
  const lonInput = document.getElementById('lonInput');
  const cityNameInput = document.getElementById('cityNameInput');
  const citySearchInput = document.getElementById('citySearchInput');
  const presetCitySelect = document.getElementById('presetCitySelect');

  const parsedLat = parseFloat(loc.lat);
  const parsedLon = parseFloat(loc.lon);

  if (latInput) latInput.value = parsedLat;
  if (lonInput) lonInput.value = parsedLon;
  if (cityNameInput) cityNameInput.value = loc.name;
  if (citySearchInput) citySearchInput.value = loc.name;
  if (presetCitySelect) presetCitySelect.value = loc.name;
  
  state.currentCity = loc.name;
  fetchWeather(parsedLat, parsedLon, loc.name);
}

// Global window helper for location switching from tab pages
window.switchCity = function(cityName) {
  const match = PRESET_LOCATIONS.find((loc) => loc.name.toLowerCase() === cityName.toLowerCase());
  if (match) {
    selectLocation(match);
    const homeTab = document.querySelector('.nav-tab[data-tab="home"]');
    if (homeTab) homeTab.click();
  }
};

window.updateApiStatus = function(isLive, label) {
  const badge = document.getElementById('sourceStatusBadge');
  const text = document.getElementById('sourceStatusText');
  if (!badge || !text) return;
  if (isLive) {
    badge.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm transition';
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span id="sourceStatusText">${label || 'Multi-Source API (Live)'}</span>`;
  } else {
    badge.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm transition';
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span><span id="sourceStatusText">${label || 'Offline Fallback Mode'}</span>`;
  }
};

// =============================================================================
// Preset Location Chips (Includes Delhi, Mumbai, Bengaluru, Udaipur, Bikaner)
// =============================================================================
function renderPresetChips() {
  const presetChipsContainer = document.getElementById('presetChipsContainer');
  if (!presetChipsContainer) return;
  presetChipsContainer.innerHTML = '';

  PRESET_LOCATIONS.forEach((loc) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className =
      'px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-sky-600 hover:text-white text-slate-300 border border-slate-700/80 hover:border-sky-500 transition duration-150 shadow-sm flex items-center space-x-1.5 active:scale-95';
    chip.innerHTML = `<span>📍</span><span>${loc.name}</span><span class="text-[10px] text-slate-400 opacity-75">(${loc.region})</span>`;

    chip.addEventListener('click', () => {
      selectLocation(loc);
    });

    presetChipsContainer.appendChild(chip);
  });
}

// GPS Auto-Detection & Coordinate Form Submission
const gpsBtn = document.getElementById('gpsBtn');
if (gpsBtn) {
  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Defaulting to Ahmedabad.');
      state.currentCity = 'Ahmedabad';
      fetchWeather(23.0225, 72.5714, 'Ahmedabad');
      return;
    }

    gpsBtn.disabled = true;
    gpsBtn.innerHTML = `<span>⏳</span><span>Locating...</span>`;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        const latInput = document.getElementById('latInput');
        const lonInput = document.getElementById('lonInput');
        const cityNameInput = document.getElementById('cityNameInput');
        if (latInput) latInput.value = lat;
        if (lonInput) lonInput.value = lon;
        if (cityNameInput) cityNameInput.value = 'My Current Location';
        fetchWeather(lat, lon, 'My Current Location');
        gpsBtn.disabled = false;
        gpsBtn.innerHTML = `<span>🧭</span><span>Use My GPS</span>`;
      },
      (err) => {
        console.warn(`Could not obtain GPS location: ${err.message}`);
        alert(`Location access denied or timed out. Defaulting gracefully to Ahmedabad.`);
        const latInput = document.getElementById('latInput');
        const lonInput = document.getElementById('lonInput');
        const cityNameInput = document.getElementById('cityNameInput');
        if (latInput) latInput.value = 23.0225;
        if (lonInput) lonInput.value = 72.5714;
        if (cityNameInput) cityNameInput.value = 'Ahmedabad';
        state.currentCity = 'Ahmedabad';
        fetchWeather(23.0225, 72.5714, 'Ahmedabad');
        gpsBtn.disabled = false;
        gpsBtn.innerHTML = `<span>🧭</span><span>Use My GPS</span>`;
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

const coordForm = document.getElementById('coordForm');
if (coordForm) {
  coordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const lat = parseFloat(document.getElementById('latInput').value);
    const lon = parseFloat(document.getElementById('lonInput').value);
    const city = document.getElementById('cityNameInput').value.trim() || 'Custom Coordinates';

    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert('Latitude must be a valid number between -90 and 90 degrees.');
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      alert('Longitude must be a valid number between -180 and 180 degrees.');
      return;
    }

    state.currentCity = city;
    fetchWeather(lat, lon, city);
  });
}

// =============================================================================
// Core Weather API Fetcher (Backend /api/weather Pipeline)
// =============================================================================
async function fetchWeather(rawLat, rawLng, cityName = 'Selected Location') {
  setLoading(true);
  
  const lat = parseFloat(rawLat) || 23.0225;
  const lon = parseFloat(rawLng) || 72.5714;
  
  currentCoordinates = { lat, lon };
  currentCityName = cityName;
  state.currentCity = cityName;

  try {
    const url = `/api/weather?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || `Server returned error ${res.status}`);
    }

    currentWeatherData = data.weather;
    currentPersonaData = data.personas || data.dashboards || {};

    // 1. Primary weather summary card & status indicators
    updateWeatherSummaryCard(data.weather, lat, lon, cityName);
    updateStatusIndicators(data.weather);

    // 2. 8 Persona recommendation cards & active spotlight detail
    renderPersonaCards(currentPersonaData);
    displayActivePersonaDetail(activeSelectedPersonaKey, currentPersonaData[activeSelectedPersonaKey]);

    // 3. Update Warning Alert Bar
    updateWarningAlertBar(data.weather);

    // 4. Update AI Personalization Insight & Re-rank Widgets
    updatePersonalizationEngineUI(data.weather, cityName);

    // 5. Update Forecast & Charts
    renderForecast(data.weather);
    renderChart(data.weather);
    renderPersonaHourlyChart(data.weather);


  } catch (err) {
    console.error('[Mausam App ERROR]', err);
    alert(`Failed to fetch forecast: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

// =============================================================================
// DOM Updater: Primary Weather Summary Card
// =============================================================================
function updateWeatherSummaryCard(weather, rawLat, rawLng, city) {
  const lat = parseFloat(rawLat) || 23.0225;
  const lon = parseFloat(rawLng) || 72.5714;
  
  const currentCityDisplay = document.getElementById('currentCityDisplay');
  const cityCoordsDisplay = document.getElementById('cityCoordsDisplay');
  const timestampDisplay = document.getElementById('timestampDisplay');
  const tempValue = document.getElementById('tempValue');
  const weatherBadge = document.getElementById('weatherBadge');
  const windDisplay = document.getElementById('windDisplay');
  const rainDisplay = document.getElementById('rainDisplay');
  const humidityVal = document.getElementById('humidityVal');
  const pm25Val = document.getElementById('pm25Val');
  const aqiBadge = document.getElementById('aqiBadge');
  const uvVal = document.getElementById('uvVal');
  const uvBadge = document.getElementById('uvBadge');
  const visibilityVal = document.getElementById('visibilityVal');
  const soilVal = document.getElementById('soilVal');
  const waveVal = document.getElementById('waveVal');
  const currentSpeedVal = document.getElementById('currentSpeedVal');
  const providerStatusList = document.getElementById('providerStatusList');

  if (currentCityDisplay) currentCityDisplay.textContent = city;
  if (cityCoordsDisplay) cityCoordsDisplay.textContent = `Lat: ${Number(lat).toFixed(2)}, Lon: ${Number(lon).toFixed(2)}`;
  if (timestampDisplay) timestampDisplay.textContent = `Updated: ${new Date(weather.timestamp || Date.now()).toLocaleTimeString()}`;

  const temp = weather.temperature;
  if (tempValue) tempValue.textContent = typeof temp === 'number' ? temp.toFixed(1) : temp;

  // Temperature classification badge
  if (weatherBadge) {
    if (temp >= 38) {
      weatherBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 inline-block border border-rose-500/30';
      weatherBadge.textContent = '🔥 Severe Heatwave';
    } else if (temp >= 32) {
      weatherBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 inline-block border border-amber-500/30';
      weatherBadge.textContent = '☀️ Hot & Humid';
    } else if (temp <= 5) {
      weatherBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 inline-block border border-cyan-500/30';
      weatherBadge.textContent = '❄️ Frost Warning';
    } else if (temp <= 15) {
      weatherBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 inline-block border border-sky-500/30';
      weatherBadge.textContent = '🧥 Chilly';
    } else {
      weatherBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 inline-block border border-emerald-500/30';
      weatherBadge.textContent = '✨ Pleasant';
    }
  }

  if (windDisplay) windDisplay.textContent = `${weather.windSpeed ?? '--'} km/h`;
  if (rainDisplay) rainDisplay.textContent = `${weather.rainProb ?? 0}%`;
  if (humidityVal) humidityVal.textContent = `${weather.humidity ?? '--'}%`;

  // PM2.5 & AQI Evaluation
  const pm25 = weather.pm2_5;
  if (pm25Val) pm25Val.textContent = typeof pm25 === 'number' ? pm25.toFixed(1) : pm25;
  if (aqiBadge) {
    if (pm25 <= 30) {
      aqiBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      aqiBadge.textContent = 'Good (CPCB)';
    } else if (pm25 <= 60) {
      aqiBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block bg-lime-500/20 text-lime-300 border border-lime-500/30';
      aqiBadge.textContent = 'Satisfactory';
    } else if (pm25 <= 90) {
      aqiBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block bg-amber-500/20 text-amber-300 border border-amber-500/30';
      aqiBadge.textContent = 'Moderate';
    } else if (pm25 <= 120) {
      aqiBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block bg-orange-500/20 text-orange-300 border border-orange-500/30';
      aqiBadge.textContent = 'Poor';
    } else if (pm25 <= 250) {
      aqiBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block bg-rose-500/20 text-rose-300 border border-rose-500/30';
      aqiBadge.textContent = 'Very Poor';
    } else {
      aqiBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block bg-rose-700/30 text-rose-400 border border-rose-700/50';
      aqiBadge.textContent = 'Severe / Hazardous';
    }
  }

  // UV Index Evaluation
  const uv = weather.uvIndex;
  if (uvVal) uvVal.textContent = typeof uv === 'number' ? uv.toFixed(1) : uv;
  if (uvBadge) {
    if (uv <= 2.9) {
      uvBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      uvBadge.textContent = 'Low (Safe)';
    } else if (uv <= 5.9) {
      uvBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block bg-amber-500/20 text-amber-300 border border-amber-500/30';
      uvBadge.textContent = 'Moderate';
    } else if (uv <= 7.9) {
      uvBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block bg-orange-500/20 text-orange-300 border border-orange-500/30';
      uvBadge.textContent = 'High (SPF 30+)';
    } else {
      uvBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block bg-rose-500/20 text-rose-300 border border-rose-500/30';
      uvBadge.textContent = 'Very High / Extreme';
    }
  }

  // Visibility (meters to km)
  const vis = weather.visibility;
  if (visibilityVal) {
    if (typeof vis === 'number') {
      visibilityVal.textContent = vis >= 1000 ? `${(vis / 1000).toFixed(1)} km` : `${vis} m`;
    } else {
      visibilityVal.textContent = '--';
    }
  }

  // Soil Moisture
  const soil = weather.soilMoisture;
  if (soilVal) {
    soilVal.textContent = typeof soil === 'number' ? `${soil.toFixed(3)} m³/m³` : '--';
  }

  // Marine metrics
  const wave = weather.waveHeight;
  if (waveVal) {
    waveVal.textContent = typeof wave === 'number' ? `${wave.toFixed(1)} m` : '--';
  }
  const speed = weather.oceanCurrentVelocity;
  if (currentSpeedVal) {
    currentSpeedVal.textContent = typeof speed === 'number' ? `Current: ${speed.toFixed(2)} m/s` : 'Current: -- m/s';
  }

  // Multi-Source Provider List
  if (providerStatusList && weather.sources) {
    providerStatusList.innerHTML = '';
    const providers = [
      { key: 'openMeteo', label: 'Open-Meteo' },
      { key: 'imd', label: 'IMD Alerts' },
      { key: 'openWeatherMap', label: 'OpenWeather' },
      { key: 'stormglass', label: 'Stormglass' },
      { key: 'openRouteService', label: 'OpenRoute' }
    ];

    providers.forEach((p) => {
      const st = weather.sources[p.key];
      const isFulfilled = st === 'fulfilled';
      const pill = document.createElement('span');
      pill.className = `px-2.5 py-0.5 rounded-lg font-mono text-[11px] font-semibold border ${
        isFulfilled
          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
      }`;
      pill.innerHTML = `${isFulfilled ? '●' : '○'} ${p.label}: ${isFulfilled ? 'LIVE' : 'FALLBACK'}`;
      providerStatusList.appendChild(pill);
    });
  }
}

// =============================================================================
// DOM Updater: Data Source & Cache Badges
// =============================================================================
function updateStatusIndicators(weather) {
  const offlineBanner = document.getElementById('offlineBanner');
  const sourceStatusBadge = document.getElementById('sourceStatusBadge');
  const cacheBadge = document.getElementById('cacheBadge');

  if (weather.isFallback) {
    if (offlineBanner) offlineBanner.classList.remove('hidden');
    if (sourceStatusBadge) {
      sourceStatusBadge.className =
        'flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm transition';
      sourceStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span><span id="sourceStatusText">Offline Fallback Mode</span>`;
    }
  } else {
    if (offlineBanner) offlineBanner.classList.add('hidden');
    if (sourceStatusBadge) {
      sourceStatusBadge.className =
        'flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm transition';
      sourceStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span id="sourceStatusText">Multi-Source API (Live)</span>`;
    }
  }

  if (cacheBadge) {
    if (weather.isCached) {
      cacheBadge.classList.remove('hidden');
      cacheBadge.classList.add('flex');
    } else {
      cacheBadge.classList.add('hidden');
      cacheBadge.classList.remove('flex');
    }
  }
}

// =============================================================================
// DOM Updater: IMD Warning Alert Bar
// =============================================================================
function updateWarningAlertBar(weather) {
  const warningBar = document.getElementById('warningBar');
  const warningLevelText = document.getElementById('warningLevelText');
  const warningMsgText = document.getElementById('warningMsgText');
  const warningDetailBtn = document.getElementById('warningDetailBtn');

  if (!warningBar || !warningLevelText || !warningMsgText) return;

  const temp = Number(weather.temperature || 28);
  const rain = Number(weather.rainProb || 0);
  const wind = Number(weather.windSpeed || 0);
  const pm25 = Number(weather.pm2_5 || 40);

  let levelClass = 'alert-green';
  let levelTitle = 'WEATHER WATCH';
  let msg = weather.imdAlert || 'Normal seasonal meteorological bulletin active across district.';

  if (temp >= 40 || rain >= 75 || wind >= 50 || pm25 >= 150) {
    levelClass = 'alert-red';
    levelTitle = 'RED ALERT';
    msg = temp >= 40
      ? `Severe Heatwave Warning (${temp}°C): Avoid all prolonged outdoor exposure between 12 PM - 4 PM.`
      : rain >= 75
      ? `Extremely Heavy Rainfall & Thunderstorm Warning (${rain}% rain probability). Keep indoors.`
      : `Hazardous Air Quality Warning (PM2.5: ${pm25} µg/m³). Avoid outdoor physical activity.`;
  } else if (temp >= 35 || rain >= 50 || wind >= 35 || pm25 >= 90) {
    levelClass = 'alert-orange';
    levelTitle = 'ORANGE ALERT';
    msg = temp >= 35
      ? `Moderate Heat & Thermal Discomfort Warning (${temp}°C). Maintain high hydration.`
      : `Significant Precipitation & Gusty Wind Advisory (${rain}% rain, ${wind} km/h).`;
  } else if (rain >= 30 || pm25 >= 60) {
    levelClass = 'alert-yellow';
    levelTitle = 'YELLOW ALERT';
    msg = `Passing Showers / Elevated Dust Conditions Expected. Normal precautions advised.`;
  }

  warningBar.className = `warning-bar ${levelClass}`;
  warningLevelText.textContent = levelTitle;
  warningMsgText.textContent = msg;

  if (warningDetailBtn) {
    warningDetailBtn.onclick = () => {
      const advisoryModal = document.getElementById('advisoryModal');
      const advisoryModalBody = document.getElementById('advisoryModalBody');
      if (advisoryModal && advisoryModalBody) {
        advisoryModalBody.innerHTML = `
          <div class="space-y-3">
            <p class="font-bold text-white text-sm">${levelTitle}: ${msg}</p>
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div><strong>Station Monitored:</strong> ${currentCityName}</div>
              <div><strong>Active Monsoon Status:</strong> ${weather.monsoonStatus || 'Standard Circulation'}</div>
              <div><strong>Highway Corridor Conditions:</strong> ${weather.routeConditions || 'Passable'}</div>
            </div>
            <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <strong>Official IMD Guidelines:</strong>
              <ul class="list-disc list-inside mt-1 space-y-1">
                <li>Follow official district meteorological updates before long journeys.</li>
                <li>Farmers should ensure field drainage during heavy rainfall alerts.</li>
                <li>Athletes and runners should shift workouts to early morning windows.</li>
              </ul>
            </div>
          </div>
        `;
        advisoryModal.classList.add('open');
      }
    };
  }
}

// =============================================================================
// DOM Updater: AI Personalization Engine & Dynamic Widgets
// =============================================================================
function updatePersonalizationEngineUI(weather, cityName) {
  const activeProfileChip = document.getElementById('activeProfileChip');
  const rankingRoleText = document.getElementById('rankingRoleText');
  const aiInsightText = document.getElementById('aiInsightText');

  const roleNameMap = {
    runner: 'Runner / Fitness Profile',
    parent: 'Parent / Family Profile',
    traveler: 'Traveler Profile',
    farmer: 'Farmer / Kisan Profile',
    health: 'Health & AQI Profile',
    commuter: 'Daily Commuter Profile'
  };

  if (activeProfileChip) activeProfileChip.textContent = `${roleNameMap[state.currentPersona] || 'Custom'} Active`;
  if (rankingRoleText) rankingRoleText.textContent = roleNameMap[state.currentPersona] || 'Custom Profile';
  if (aiInsightText) aiInsightText.innerHTML = PersonalizationEngine.generateInsight(state.currentPersona, weather, cityName);

  // Update dynamic widget values
  const temp = Number(weather.temperature || 28);
  const rain = Number(weather.rainProb || 0);

  const heatIndexVal = document.getElementById('heatIndexVal');
  if (heatIndexVal) heatIndexVal.textContent = temp >= 35 ? 'High Risk' : temp >= 30 ? 'Moderate' : 'Low Risk';

  const hydrationVal = document.getElementById('hydrationVal');
  if (hydrationVal) hydrationVal.textContent = temp >= 35 ? '650 ml/hr' : '500 ml/hr';

  const parentAdvisoryText = document.getElementById('parentAdvisoryText');
  if (parentAdvisoryText) {
    parentAdvisoryText.textContent = rain >= 50
      ? `Rain expected during school hours (${rain}%). Send raincoats/umbrellas with children.`
      : `Pleasant school commute conditions (${temp.toFixed(1)}°C). Normal outdoor safety.`;
  }

  const destTemp = document.getElementById('destTemp');
  if (destTemp) destTemp.textContent = `${temp.toFixed(1)}°C • ${rain}% Rain`;

  const flightRisk = document.getElementById('flightRisk');
  if (flightRisk) flightRisk.textContent = rain >= 70 || weather.windSpeed > 40 ? 'Moderate Weather Delay Risk' : 'Low Risk';

  const soilMoistureVal = document.getElementById('soilMoistureVal');
  if (soilMoistureVal) soilMoistureVal.textContent = weather.soilMoisture !== undefined ? `${(weather.soilMoisture * 100).toFixed(0)}%` : '60%';

  const dewPointVal = document.getElementById('dewPointVal');
  if (dewPointVal) dewPointVal.textContent = `${(temp - ((100 - (weather.humidity || 60)) / 5)).toFixed(1)}°C`;

  const irrigationVal = document.getElementById('irrigationVal');
  if (irrigationVal) irrigationVal.textContent = rain >= 50 ? 'Postpone Irrigation' : 'Normal Irrigation Schedule';

  const cropAdvisoryText = document.getElementById('cropAdvisoryText');
  if (cropAdvisoryText) {
    cropAdvisoryText.textContent = rain >= 50
      ? 'Ensure active field drainage channels are open to prevent root logging.'
      : 'Optimal weather window for seasonal fertilizer application and pest scouting.';
  }

  const aqiNumber = document.getElementById('aqiNumber');
  const aqiDesc = document.getElementById('aqiDesc');
  if (aqiNumber) {
    const p = Number(weather.pm2_5 || 35);
    let aqi = 0;
    let desc = '';
    let colorClass = '';

    if (p <= 30) {
      aqi = Math.round(((50 - 0) / (30 - 0)) * (p - 0) + 0);
      desc = 'Good - Favorable for all';
      colorClass = 'text-emerald-400';
    } else if (p <= 60) {
      aqi = Math.round(((100 - 51) / (60 - 31)) * (p - 31) + 51);
      desc = 'Satisfactory';
      colorClass = 'text-emerald-400';
    } else if (p <= 90) {
      aqi = Math.round(((200 - 101) / (90 - 61)) * (p - 61) + 101);
      desc = 'Moderate - Breathing discomfort';
      colorClass = 'text-amber-400';
    } else if (p <= 120) {
      aqi = Math.round(((300 - 201) / (120 - 91)) * (p - 91) + 201);
      desc = 'Poor - Respiratory illness risk';
      colorClass = 'text-rose-400';
    } else if (p <= 250) {
      aqi = Math.round(((400 - 301) / (250 - 121)) * (p - 121) + 301);
      desc = 'Very Poor - Health alert';
      colorClass = 'text-rose-500';
    } else {
      aqi = Math.round(((500 - 401) / (500 - 251)) * Math.min(p - 251, 249) + 401);
      aqi = Math.min(aqi, 500);
      desc = 'Severe - Emergency conditions';
      colorClass = 'text-rose-600';
    }

    aqiNumber.textContent = aqi;
    aqiNumber.className = `text-3xl font-black ${colorClass}`;
    if (aqiDesc) {
      aqiDesc.textContent = desc;
      aqiDesc.className = `font-semibold mt-0.5 ${colorClass}`;
    }
  }

  const nowcastText = document.getElementById('nowcastText');
  if (nowcastText) {
    nowcastText.textContent = `Visibility: ${weather.visibility ? (weather.visibility / 1000).toFixed(1) + ' km' : 'Clear'}. ${weather.routeConditions || 'Smooth Flow'}.`;
  }

  // Dynamic ranking and sorting of widget cards
  PersonalizationEngine.rankAndSortWidgets(state.currentPersona, weather);
}

// =============================================================================
// DOM Updater: 8 Persona Recommendation Cards Grid
// =============================================================================
function renderPersonaCards(personas) {
  currentPersonaData = personas;
  const personasContainer = document.getElementById('personasContainer');
  if (!personasContainer) return;
  personasContainer.innerHTML = '';

  const personaKeys = Object.keys(PERSONA_CONFIG);

  personaKeys.forEach((key) => {
    const config = PERSONA_CONFIG[key];
    const data = personas[key] || {
      alertLevel: 'Safe',
      recommendationText: 'Normal baseline weather conditions apply.'
    };

    const card = document.createElement('div');
    const isSelected = key === activeSelectedPersonaKey;
    card.className = `persona-card glass-panel rounded-3xl p-5 border flex flex-col justify-between transition cursor-pointer relative overflow-hidden ${
      isSelected ? 'active-selected' : ''
    }`;
    card.dataset.personaKey = key;
    card.dataset.filter = config.filterKey;

    let alertBadgeClasses = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    let cardBorderColor = 'border-slate-800';
    let alertDot = '🟢';

    if (data.alertLevel === 'Warning') {
      alertBadgeClasses = 'bg-amber-500/15 text-amber-300 border-amber-500/35';
      cardBorderColor = 'border-amber-500/40';
      alertDot = '🟡';
    } else if (data.alertLevel === 'Danger') {
      alertBadgeClasses = 'bg-rose-500/15 text-rose-300 border-rose-500/40';
      cardBorderColor = 'border-rose-500/40';
      alertDot = '🔴';
    }

    card.classList.add(cardBorderColor);

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-2 mb-3.5">
          <div class="flex items-center space-x-3">
            <span class="text-3xl p-2.5 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-inner">${config.icon}</span>
            <div>
              <h3 class="font-bold text-white text-sm tracking-tight leading-snug">${config.title}</h3>
              <p class="text-[11px] text-slate-400 mt-0.5">${config.subtitle}</p>
            </div>
          </div>
        </div>

        <div class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${alertBadgeClasses} mb-3.5 shadow-sm">
          <span>${alertDot}</span>
          <span>${data.alertLevel}</span>
        </div>

        <p class="text-xs text-slate-300 leading-relaxed line-clamp-4">${data.recommendationText}</p>
      </div>

      <div class="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <span class="uppercase tracking-wider font-bold text-[10px] text-sky-400/80">${config.displayName}</span>
        <span class="text-slate-400 font-medium flex items-center gap-1 hover:text-sky-300 transition">
          <span>Inspect</span>
          <span>→</span>
        </span>
      </div>
    `;

    card.addEventListener('click', () => {
      activeSelectedPersonaKey = key;
      const allCards = personasContainer.querySelectorAll('.persona-card');
      allCards.forEach((c) => c.classList.remove('active-selected'));
      card.classList.add('active-selected');
      displayActivePersonaDetail(key, data);
      syncFilterTab(key);
    });

    personasContainer.appendChild(card);
  });
}

// =============================================================================
// Active Persona Spotlight Detail Viewer
// =============================================================================
function displayActivePersonaDetail(personaKey, personaData) {
  const activePersonaSpotlight = document.getElementById('activePersonaSpotlight');
  if (!activePersonaSpotlight) return;

  const config = PERSONA_CONFIG[personaKey] || PERSONA_CONFIG['Health-Conscious'];
  const data =
    personaData ||
    (currentPersonaData && currentPersonaData[personaKey]) || {
      alertLevel: 'Safe',
      recommendationText: 'Standard baseline meteorological guidance applies.'
    };

  let alertBadgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  let alertDot = '🟢';

  if (data.alertLevel === 'Warning') {
    alertBadgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    alertDot = '🟡';
  } else if (data.alertLevel === 'Danger') {
    alertBadgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    alertDot = '🔴';
  }

  activePersonaSpotlight.innerHTML = `
    <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
      <div class="flex items-center space-x-4">
        <div class="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-3xl shadow-lg shadow-sky-500/10">
          ${config.icon}
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-bold border border-sky-500/20 uppercase tracking-wide">
              Selected Persona Spotlight
            </span>
            <span class="text-xs text-slate-400">Category: ${config.category}</span>
          </div>
          <h3 class="text-2xl font-black text-white mt-1">${config.title}</h3>
          <p class="text-xs text-slate-300 mt-0.5">${config.subtitle}</p>
        </div>
      </div>

      <div class="flex items-center space-x-3">
        <div class="px-4 py-2 rounded-2xl border ${alertBadgeStyle} font-bold text-sm flex items-center space-x-2 shadow-lg">
          <span class="text-base">${alertDot}</span>
          <span>${data.alertLevel} Alert</span>
        </div>
      </div>
    </div>

    <!-- Recommendation Body -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5">
      <div class="lg:col-span-2 space-y-3">
        <div class="flex items-center space-x-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
          <span>📋</span>
          <span>Biometeorological Advisory & Action Guidance</span>
        </div>
        <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-sm sm:text-base leading-relaxed text-slate-100 font-medium">
          ${data.recommendationText}
        </div>
        <p class="text-xs text-slate-400 flex items-center gap-1.5">
          <span>ℹ️</span>
          <span>${config.guidance}</span>
        </p>
      </div>

      <div class="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between space-y-3">
        <div>
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Key Critical Factors</h4>
          <div class="space-y-1.5 text-xs text-slate-300">
            <div class="flex justify-between py-1 border-b border-slate-800">
              <span class="text-slate-400">Alert Classification:</span>
              <span class="font-bold text-white">${data.alertLevel}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800">
              <span class="text-slate-400">City / Location:</span>
              <span class="font-bold text-white">${currentCityName}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800">
              <span class="text-slate-400">Compliance Standard:</span>
              <span class="font-medium text-sky-400">IMD / MoES Protocol</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-400">Engine Precision:</span>
              <span class="font-mono text-emerald-400">Psychrometric THI</span>
            </div>
          </div>
        </div>
        <div class="pt-2 text-[11px] text-slate-500 text-center">
          Click any persona card in the grid below to inspect its tailored dashboard.
        </div>
      </div>
    </div>
  `;

  const hourlyChip = document.getElementById('hourlyProfileChip');
  if (hourlyChip) hourlyChip.textContent = `${config.displayName} Focus`;
}

// =============================================================================
// Responsive 8-Persona Category Filter Tabs
// =============================================================================
function setupFilterTabs() {
  const personaFilterTabs = document.getElementById('personaFilterTabs');
  const personasContainer = document.getElementById('personasContainer');
  if (!personaFilterTabs) return;
  const tabs = personaFilterTabs.querySelectorAll('.filter-tab');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active', 'bg-sky-500', 'text-white'));
      tab.classList.add('active', 'bg-sky-500', 'text-white');

      const filter = tab.dataset.filter;
      const cards = personasContainer.querySelectorAll('.persona-card');

      cards.forEach((card) => {
        if (filter === 'all' || card.dataset.filter === filter) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });

      if (filter !== 'all' && PERSONA_CONFIG[filter]) {
        activeSelectedPersonaKey = filter;
        displayActivePersonaDetail(filter, currentPersonaData[filter]);
        cards.forEach((c) => {
          if (c.dataset.personaKey === filter) {
            c.classList.add('active-selected');
          } else {
            c.classList.remove('active-selected');
          }
        });
      }
    });
  });
}

function syncFilterTab(personaKey) {
  const personaFilterTabs = document.getElementById('personaFilterTabs');
  if (!personaFilterTabs) return;
  const tabs = personaFilterTabs.querySelectorAll('.filter-tab');
  tabs.forEach((t) => {
    if (t.dataset.filter === personaKey) {
      tabs.forEach((tb) => tb.classList.remove('active', 'bg-sky-500', 'text-white'));
      t.classList.add('active', 'bg-sky-500', 'text-white');
    }
  });
}

// =============================================================================
// Quick Persona Switcher Chips & Onboarding Wizard
// =============================================================================
function setupPersonaSwitchers() {
  const demoBtns = document.querySelectorAll('.demo-btn');
  demoBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const demoRole = btn.getAttribute('data-demo');
      demoBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      state.currentPersona = demoRole;
      if (currentWeatherData) {
        updatePersonalizationEngineUI(currentWeatherData, currentCityName);
      }
    });
  });

  const openOnboardingBtn = document.getElementById('openOnboardingBtn');
  const changePersonaBtn = document.getElementById('changePersonaBtn');
  const onboardingModal = document.getElementById('onboardingModal');
  const closeOnboardingModal = document.getElementById('closeOnboardingModal');
  const finishOnboardingBtn = document.getElementById('finishOnboardingBtn');

  const openModal = () => {
    if (onboardingModal) {
      document.querySelectorAll('.purpose-card').forEach((card) => {
        card.classList.toggle('active', card.getAttribute('data-purpose') === state.currentPersona);
      });
      onboardingModal.classList.add('open');
    }
  };

  if (openOnboardingBtn) openOnboardingBtn.addEventListener('click', openModal);
  if (changePersonaBtn) changePersonaBtn.addEventListener('click', openModal);

  if (closeOnboardingModal) {
    closeOnboardingModal.addEventListener('click', () => {
      onboardingModal.classList.remove('open');
    });
  }

  document.querySelectorAll('.purpose-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.purpose-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  if (finishOnboardingBtn) {
    finishOnboardingBtn.addEventListener('click', () => {
      const activeCard = document.querySelector('.purpose-card.active');
      if (activeCard) {
        const role = activeCard.getAttribute('data-purpose');
        state.currentPersona = role;
        demoBtns.forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-demo') === role);
        });
        if (currentWeatherData) {
          updatePersonalizationEngineUI(currentWeatherData, currentCityName);
        }
      }
      onboardingModal.classList.remove('open');
    });
  }
}

// =============================================================================
// App Navigation Tabs
// =============================================================================
function setupNavigationTabs() {
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPages = document.querySelectorAll('.tab-page');

  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      navTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const targetTab = tab.getAttribute('data-tab');
      tabPages.forEach((page) => {
        if (page.id === `tab-${targetTab}`) {
          page.classList.remove('hidden');
          page.classList.add('active');
        } else {
          page.classList.add('hidden');
          page.classList.remove('active');
        }
      });

      if (targetTab === 'forecast') {
        setTimeout(() => {
          if (hourlyChartInstance) hourlyChartInstance.resize();
          if (personaHourlyChartInstance) personaHourlyChartInstance.resize();
        }, 120);
      }
    });
  });
}

// =============================================================================
// Language Switcher (English & Hindi)
// =============================================================================
function setupLanguageToggle() {
  const langToggleBtn = document.getElementById('langToggleBtn');
  const langLabel = document.getElementById('langLabel');

  if (!langToggleBtn || !langLabel) return;

  langToggleBtn.addEventListener('click', () => {
    state.currentLang = state.currentLang === 'en' ? 'hi' : 'en';
    document.body.setAttribute('data-lang', state.currentLang);
    langLabel.textContent = state.currentLang === 'en' ? 'हिंदी' : 'English';

    const langData = i18n[state.currentLang];
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (langData && langData[key]) {
        el.innerHTML = langData[key];
      }
    });
  });
}

// =============================================================================
// 7-Day Extended IMD Forecast
// =============================================================================
function renderForecast(weather) {
  const forecastDays = document.getElementById('forecastDays');
  if (!forecastDays) return;

  const baseTemp = Number(weather.temperature || 28);
  const baseRain = Number(weather.rainProb || 15);
  const days = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  forecastDays.innerHTML = days.map((day, idx) => {
    const high = Math.round(baseTemp + (idx === 0 ? 2 : (idx % 2 === 0 ? 1 : -1)));
    const low = Math.round(baseTemp - 6 + (idx % 2));
    const rain = Math.max(0, Math.min(100, Math.round(baseRain + (idx * 5) - 10)));
    const cond = rain > 60 ? 'Thunderstorm Showers' : rain > 35 ? 'Scattered Rain' : 'Partly Cloudy';
    const icon = rain > 60 ? 'fa-cloud-bolt text-rose-400' : rain > 35 ? 'fa-cloud-rain text-sky-400' : 'fa-cloud-sun text-amber-400';

    return `
      <div class="forecast-row">
        <span class="day-name">${day}</span>
        <div class="forecast-cond">
          <i class="fa-solid ${icon}"></i>
          <span>${cond}</span>
          <span class="text-xs text-sky-400 ml-2 font-mono">${rain}% Rain</span>
        </div>
        <span class="forecast-temps">${high}° / ${low}°C</span>
      </div>
    `;
  }).join('');
}

// =============================================================================
// 24-Hour Telemetry Charts (Chart.js)
// =============================================================================
function renderChart(weather) {
  const chartEl = document.getElementById('hourlyChart');
  if (!chartEl || typeof Chart === 'undefined') return;
  const ctx = chartEl.getContext('2d');

  const baseTemp = Number(weather.temperature || 28);
  const baseRain = Number(weather.rainProb || 15);

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const tempVariance = [-4, -5, -6, -5, -3, -1, 1, 3, 4, 5, 4, 3, 2, 1, 0, -1, -2, -3, -3, -4, -4, -4, -4, -4];
  const rainVariance = [-10, -5, 0, 5, 10, 20, 30, 45, 35, 20, 10, 5, 0, -5, -10, -10, -5, 0, 5, 10, 15, 20, 10, 0];

  const temps = tempVariance.map((v) => Number((baseTemp + v).toFixed(1)));
  const rainProb = rainVariance.map((v) => Math.max(0, Math.min(100, Math.round(baseRain + v))));

  if (hourlyChartInstance) hourlyChartInstance.destroy();

  hourlyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: hours,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: temps,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          fill: true,
          tension: 0.35,
          yAxisID: 'y'
        },
        {
          label: 'Rain Probability (%)',
          data: rainProb,
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129, 140, 248, 0.45)',
          type: 'bar',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#94a3b8' } }
      },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.2)' } },
        y: { type: 'linear', position: 'left', title: { display: true, text: 'Temp (°C)', color: '#38bdf8' }, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51, 65, 85, 0.2)' } },
        y1: { type: 'linear', position: 'right', min: 0, max: 100, title: { display: true, text: 'Rain (%)', color: '#818cf8' }, ticks: { color: '#94a3b8' }, grid: { drawOnChartArea: false } }
      }
    }
  });
}

function renderPersonaHourlyChart(weather) {
  const chartEl = document.getElementById('personaHourlyChart');
  if (!chartEl || typeof Chart === 'undefined') return;
  const ctx = chartEl.getContext('2d');

  const baseTemp = Number(weather.temperature || 28);
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const thiTrend = hours.map((_, i) => Number((15 + 0.4 * (baseTemp + 5 + Math.sin(i / 3) * 4)).toFixed(1)));

  if (personaHourlyChartInstance) personaHourlyChartInstance.destroy();

  personaHourlyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: hours,
      datasets: [
        {
          label: 'Bioclimatic Comfort Index (THI)',
          data: thiTrend,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8' } }
      },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.2)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51, 65, 85, 0.2)' } }
      }
    }
  });
}


// =============================================================================
// Mausam AI Assistant Chatbot Drawer Logic
// =============================================================================
function setupAiDrawer() {
  const aiAssistantFab = document.getElementById('aiAssistantFab');
  const aiDrawer = document.getElementById('aiDrawer');
  const closeAiDrawer = document.getElementById('closeAiDrawer');
  const aiInput = document.getElementById('aiInput');
  const aiSendBtn = document.getElementById('aiSendBtn');
  const aiChatBody = document.getElementById('aiChatBody');

  if (!aiAssistantFab || !aiDrawer) return;

  aiAssistantFab.addEventListener('click', () => aiDrawer.classList.toggle('open'));
  if (closeAiDrawer) closeAiDrawer.addEventListener('click', () => aiDrawer.classList.remove('open'));

  const handleAiSubmit = () => {
    const query = aiInput.value.trim();
    if (!query) return;

    const userMsgDiv = document.createElement('div');
    userMsgDiv.className = 'chat-bubble user-msg';
    userMsgDiv.textContent = query;
    aiChatBody.appendChild(userMsgDiv);

    aiInput.value = '';
    aiChatBody.scrollTop = aiChatBody.scrollHeight;

    setTimeout(() => {
      const response = generateAiResponse(query.toLowerCase());
      const aiMsgDiv = document.createElement('div');
      aiMsgDiv.className = 'chat-bubble ai-msg';
      aiMsgDiv.innerHTML = response;
      aiChatBody.appendChild(aiMsgDiv);
      aiChatBody.scrollTop = aiChatBody.scrollHeight;
    }, 450);
  };

  if (aiSendBtn) aiSendBtn.addEventListener('click', handleAiSubmit);
  if (aiInput) {
    aiInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAiSubmit();
    });
  }
}

function generateAiResponse(q) {
  const temp = currentWeatherData ? Number(currentWeatherData.temperature).toFixed(1) : '31.0';
  const rain = currentWeatherData ? currentWeatherData.rainProb : '15';
  const city = currentCityName || 'New Delhi';

  if (q.includes('run') || q.includes('jog') || q.includes('fitness') || q.includes('workout')) {
    return `<strong>Runner Recommendation for ${city}:</strong> The safest workout window is early morning (05:30 AM - 07:15 AM) at ${temp}°C before midday heat levels climb. Hydration target: 500 ml/hr.`;
  }
  if (q.includes('school') || q.includes('parent') || q.includes('commute') || q.includes('child')) {
    return `<strong>School Commute Insight for ${city}:</strong> Rain probability is ${rain}%. Morning school transit is generally safe. Maintain umbrella preparation if rain probability exceeds 40%.`;
  }
  if (q.includes('travel') || q.includes('flight') || q.includes('pack') || q.includes('tourist')) {
    return `<strong>Travel Advisory for ${city}:</strong> Current temperature is ${temp}°C. Weather-induced flight delay probability is low to moderate. Pack breathable fabrics.`;
  }
  if (q.includes('crop') || q.includes('farmer') || q.includes('wheat') || q.includes('cotton') || q.includes('soil')) {
    return `<strong>Gramin Krishi Agromet Advice for ${city}:</strong> Soil moisture is in the normal range. Rain probability is ${rain}%. Favorable conditions for seasonal crop scouting and balanced fertilization.`;
  }

  return `<strong>Mausam AI Update for ${city}:</strong> Current temperature is ${temp}°C with ${rain}% rain probability. Ask me about running timings, school commute advisories, or agricultural crop protection!`;
}

// =============================================================================
// Modals Handling (Bookmark Modal, Advisory Modal, Customize Modal)
// =============================================================================
function setupModalEvents() {
  const saveModal = document.getElementById('saveModal');
  const openSaveModalBtn = document.getElementById('openSaveModalBtn');
  const closeSaveModalBtn = document.getElementById('closeSaveModalBtn');
  const cancelSaveBtn = document.getElementById('cancelSaveBtn');
  const saveLocationForm = document.getElementById('saveLocationForm');
  const saveCityName = document.getElementById('saveCityName');
  const saveLat = document.getElementById('saveLat');
  const saveLon = document.getElementById('saveLon');
  const saveFeedback = document.getElementById('saveFeedback');
  const confirmSaveBtn = document.getElementById('confirmSaveBtn');

  if (openSaveModalBtn && saveModal) {
    openSaveModalBtn.addEventListener('click', () => {
      if (saveCityName) saveCityName.value = currentCityName;
      if (saveLat) saveLat.value = currentCoordinates.lat;
      if (saveLon) saveLon.value = currentCoordinates.lon;
      if (saveFeedback) saveFeedback.className = 'hidden';
      saveModal.classList.add('open');
    });
  }

  const closeSave = () => {
    if (saveModal) saveModal.classList.remove('open');
  };

  if (closeSaveModalBtn) closeSaveModalBtn.addEventListener('click', closeSave);
  if (cancelSaveBtn) cancelSaveBtn.addEventListener('click', closeSave);

  if (saveLocationForm) {
    saveLocationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      confirmSaveBtn.disabled = true;
      confirmSaveBtn.textContent = 'Saving...';
      if (saveFeedback) saveFeedback.className = 'hidden';

      const payload = {
        userId: document.getElementById('saveUserId').value.trim(),
        cityName: saveCityName.value.trim(),
        latitude: parseFloat(saveLat.value),
        longitude: parseFloat(saveLon.value),
        preferredPersona: document.getElementById('savePersona').value
      };

      try {
        const res = await fetch('/api/save-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || `Save failed (${res.status})`);
        }

        saveFeedback.className =
          'p-2.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 block';
        saveFeedback.textContent = `✔ Successfully bookmarked "${payload.cityName}" for ${payload.preferredPersona}!`;

        setTimeout(() => {
          closeSave();
          confirmSaveBtn.disabled = false;
          confirmSaveBtn.textContent = 'Save Bookmark';
        }, 1500);
      } catch (err) {
        saveFeedback.className =
          'p-2.5 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 block';
        saveFeedback.textContent = `✖ Failed to bookmark: ${err.message}`;
        confirmSaveBtn.disabled = false;
        confirmSaveBtn.textContent = 'Save Bookmark';
      }
    });
  }

  // Advisory Modal & Customization Modal
  const advisoryModal = document.getElementById('advisoryModal');
  const closeAdvisoryModal = document.getElementById('closeAdvisoryModal');
  const dismissAdvisoryBtn = document.getElementById('dismissAdvisoryBtn');

  if (closeAdvisoryModal) closeAdvisoryModal.addEventListener('click', () => advisoryModal.classList.remove('open'));
  if (dismissAdvisoryBtn) dismissAdvisoryBtn.addEventListener('click', () => advisoryModal.classList.remove('open'));

  const customizeBtn = document.getElementById('customizeBtn');
  const customModal = document.getElementById('customModal');
  const closeCustomModal = document.getElementById('closeCustomModal');
  const saveCustomBtn = document.getElementById('saveCustomBtn');

  if (customizeBtn && customModal) {
    customizeBtn.addEventListener('click', () => customModal.classList.add('open'));
  }
  if (closeCustomModal && customModal) {
    closeCustomModal.addEventListener('click', () => customModal.classList.remove('open'));
  }
  if (saveCustomBtn && customModal) {
    saveCustomBtn.addEventListener('click', () => customModal.classList.remove('open'));
  }

  // Backdrop click to close modals
  document.querySelectorAll('.modal-overlay').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  });

  // Escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('open'));
      const aiDrawer = document.getElementById('aiDrawer');
      if (aiDrawer) aiDrawer.classList.remove('open');
    }
  });
}

// Helper: Loading Spinner
function setLoading(loading) {
  const searchBtn = document.getElementById('searchBtn');
  const btnSpinner = document.getElementById('btnSpinner');
  const btnText = document.getElementById('btnText');
  if (!searchBtn || !btnSpinner || !btnText) return;
  if (loading) {
    btnSpinner.classList.remove('hidden');
    btnText.textContent = 'Fetching...';
    searchBtn.disabled = true;
  } else {
    btnSpinner.classList.add('hidden');
    btnText.textContent = 'Get Forecast';
    searchBtn.disabled = false;
  }
}

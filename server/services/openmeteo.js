/**
 * Open-Meteo client.
 *
 * Everything here is free and needs no API key:
 *   - Forecast API  : weather (current + hourly + daily)
 *   - Air Quality   : US AQI, PM2.5, PM10
 *   - Marine API    : wave height / period / swell / sea temp / tide
 *   - Geocoding     : city name -> latitude / longitude
 *
 * Responses are normalised into the exact shapes the shared logic engine
 * (public/js/engine.js) expects, so the browser and the server agree.
 */
'use strict';

const ENDPOINTS = {
  geocode: process.env.OPEN_METEO_GEOCODE || 'https://geocoding-api.open-meteo.com/v1/search',
  forecast: process.env.OPEN_METEO_FORECAST || 'https://api.open-meteo.com/v1/forecast',
  air: process.env.OPEN_METEO_AIR || 'https://air-quality-api.open-meteo.com/v1/air-quality',
  marine: process.env.OPEN_METEO_MARINE || 'https://marine-api.open-meteo.com/v1/marine',
};

const GEO = require('../../public/js/geo.js');

const CACHE_TTL_MS = (Number(process.env.CACHE_TTL_SECONDS) || 600) * 1000;
const HOME_COUNTRY = (process.env.HOME_COUNTRY || 'IN').trim().toUpperCase();
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 400) {
    // drop the oldest entry - keeps memory bounded on long-running servers
    cache.delete(cache.keys().next().value);
  }
  return value;
}

async function getJSON(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'mausam-ai/1.0 (SIH26076 prototype)' },
    });
    if (!res.ok) throw new Error(`upstream ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * City name -> { name, state, country, lat, lon }
 *
 * Searches India first (the geocoder supports a countryCode filter) and only
 * falls back to a global search if nothing Indian matches, so a traveller can
 * still look up "London" or "Dubai".
 */
async function geocode(city) {
  const key = `geo:${HOME_COUNTRY}:${city.toLowerCase()}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const query = GEO.queryFor(city);
  const base = `${ENDPOINTS.geocode}?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;

  let data = null;
  if (HOME_COUNTRY) {
    data = await getJSON(`${base}&countryCode=${HOME_COUNTRY}`).catch(() => null);
  }
  if (!data || !data.results || !data.results.length) {
    data = await getJSON(base).catch(() => null);
  }
  if (!data || !data.results || !data.results.length) return null;

  const p = GEO.pickPlace(data.results, query) || data.results[0];
  return cacheSet(key, GEO.shape(p));
}

/** Current hour index inside the hourly arrays. */
function hourIndex(hourly, currentTime) {
  if (!hourly || !hourly.time) return 0;
  const key = String(currentTime || '').slice(0, 13);
  const idx = hourly.time.findIndex((t) => t.slice(0, 13) === key);
  return idx < 0 ? 0 : idx;
}

/** Full weather bundle for a location. */
async function weatherBundle(lat, lon) {
  const key = `wx:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const forecastUrl =
    `${ENDPOINTS.forecast}?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day' +
    '&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,uv_index' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,weather_code' +
    '&timezone=auto&forecast_days=7';

  const airUrl =
    `${ENDPOINTS.air}?latitude=${lat}&longitude=${lon}` +
    '&current=us_aqi,pm2_5,pm10&hourly=us_aqi&timezone=auto&forecast_days=3';

  const marineUrl =
    `${ENDPOINTS.marine}?latitude=${lat}&longitude=${lon}` +
    '&current=wave_height,wave_direction,wave_period,swell_wave_height,sea_surface_temperature' +
    '&hourly=wave_height,wave_period,swell_wave_height,sea_surface_temperature,sea_level_height_msl' +
    '&timezone=auto&forecast_days=7';

  const [forecast, air, marine] = await Promise.all([
    getJSON(forecastUrl),
    getJSON(airUrl).catch(() => null),
    getJSON(marineUrl).catch(() => null),
  ]);

  const c = forecast.current;
  const h = forecast.hourly;
  const d = forecast.daily;

  const weather = {
    temp: c.temperature_2m,
    hum: c.relative_humidity_2m,
    feels: c.apparent_temperature,
    rain: c.precipitation,
    wind: c.wind_speed_10m,
    code: c.weather_code,
    isDay: c.is_day,
    dmax: d.temperature_2m_max,
    dmin: d.temperature_2m_min,
    dsum: d.precipitation_sum,
    duv: d.uv_index_max,
    dcode: d.weather_code,
    dtime: d.time,
    htime: h.time,
    htemp: h.temperature_2m,
    hfeels: h.apparent_temperature,
    hhum: h.relative_humidity_2m,
    hrain: h.precipitation,
    hprob: h.precipitation_probability,
    hcode: h.weather_code,
    hwind: h.wind_speed_10m,
    huv: h.uv_index,
    nowIdx: hourIndex(h, c.time),
  };
  weather.rain3 = (d.precipitation_sum || []).slice(0, 3).reduce((a, b) => a + (b || 0), 0);

  let airOut = null;
  if (air && air.current && air.current.us_aqi != null) {
    airOut = {
      aqi: Math.round(air.current.us_aqi),
      pm25: air.current.pm2_5,
      pm10: air.current.pm10,
      htime: air.hourly ? air.hourly.time : [],
      haqi: air.hourly ? air.hourly.us_aqi : [],
    };
  }

  // Marine only returns data for ocean grid points; inland cities come back null.
  let marineOut = null;
  if (marine && marine.current && marine.current.wave_height != null) {
    marineOut = {
      wave: marine.current.wave_height,
      dir: marine.current.wave_direction,
      per: marine.current.wave_period,
      swell: marine.current.swell_wave_height,
      sst: marine.current.sea_surface_temperature,
      htime: marine.hourly ? marine.hourly.time : [],
      hwave: marine.hourly ? marine.hourly.wave_height : [],
      hper: marine.hourly ? marine.hourly.wave_period : [],
      hswell: marine.hourly ? marine.hourly.swell_wave_height : [],
      hlevel: marine.hourly ? marine.hourly.sea_level_height_msl : [],
    };
  }

  return cacheSet(key, { weather, air: airOut, marine: marineOut });
}

/** Everything the frontend needs for one city, in a single payload. */
async function lookup(city) {
  const place = await geocode(city);
  if (!place) return null;
  const bundle = await weatherBundle(place.lat, place.lon);
  return {
    location: place,
    weather: { ...bundle.weather, city: place.name, state: place.state, lat: place.lat, lon: place.lon },
    air: bundle.air,
    marine: bundle.marine,
  };
}

module.exports = { geocode, weatherBundle, lookup, ENDPOINTS };

/**
 * MAUSAM AI — geocoding helpers, shared by the browser and the Node backend.
 *
 * Why this exists:
 *   • A plain lookup for "Panaji" returns a village in Guatemala, and "Goa"
 *     returns a place in the Philippines. We always try India first.
 *   • Open-Meteo lists some Indian cities under an older name ("Panjim", not
 *     "Panaji"), so we keep a small alias table.
 *   • Results are scored (exact name, Indian match, population) instead of
 *     blindly taking the first hit.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MAUSAM_GEO = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Old / alternate spellings common in India -> the name the geocoder knows. */
  var CITY_ALIASES = {
    panaji: 'Panjim',
    bangalore: 'Bengaluru',
    bombay: 'Mumbai',
    calcutta: 'Kolkata',
    madras: 'Chennai',
    mysore: 'Mysuru',
    trivandrum: 'Thiruvananthapuram',
    pondicherry: 'Puducherry',
    cochin: 'Kochi',
    ernakulam: 'Kochi',
    banaras: 'Varanasi',
    benares: 'Varanasi',
    gurgaon: 'Gurugram',
    simla: 'Shimla',
    poona: 'Pune',
    calicut: 'Kozhikode',
    mangalore: 'Mangaluru',
    baroda: 'Vadodara',
    allahabad: 'Prayagraj',
    orissa: 'Odisha'
  };

  /** Strip diacritics and case so "Panāji" and "Panaji" compare equal. */
  function normalizeName(s) {
    var v = String(s == null ? '' : s).trim().toLowerCase();
    if (v.normalize) v = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return v;
  }

  /** What to actually send to the geocoder for a user-typed city. */
  function queryFor(city) {
    var n = normalizeName(city);
    return CITY_ALIASES[n] || city;
  }

  /** Score a result set and return the most likely intended place. */
  function pickPlace(results, query) {
    if (!results || !results.length) return null;
    var q = normalizeName(query);
    var best = null;
    var bestScore = -Infinity;

    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var name = normalizeName(r.name);
      var score = 0;

      if (name === q) score += 100;
      else if (name.indexOf(q) === 0) score += 55;
      else if (name.indexOf(q) !== -1) score += 25;

      if (r.country_code === 'IN') score += 45;      // India-first for this app
      if (r.feature_code === 'PPLC') score += 12;    // national capital
      else if (r.feature_code === 'PPLA') score += 8; // state capital
      score += Math.log10((r.population || 0) + 1) * 6;

      if (score > bestScore) { bestScore = score; best = r; }
    }
    return best;
  }

  function shape(p) {
    return {
      name: p.name,
      state: p.admin1 || '',
      country: p.country || '',
      countryCode: p.country_code || '',
      lat: p.latitude,
      lon: p.longitude
    };
  }

  return {
    CITY_ALIASES: CITY_ALIASES,
    normalizeName: normalizeName,
    queryFor: queryFor,
    pickPlace: pickPlace,
    shape: shape
  };
});

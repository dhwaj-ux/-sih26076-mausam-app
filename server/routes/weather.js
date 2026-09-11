/** GET /api/weather?city=...  or  ?lat=..&lon=..
 *  Returns location + weather + air quality + marine.
 */
'use strict';

const express = require('express');
const openmeteo = require('../services/openmeteo');

const router = express.Router();

router.get('/weather', async (req, res, next) => {
  const city = String(req.query.city || '').trim();
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  try {
    // ---- by coordinates (used for "my current location") ------------------
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({ error: 'lat/lon out of range' });
      }
      const bundle = await openmeteo.weatherBundle(lat, lon);
      return res.json({
        location: { name: '', state: '', country: '', lat, lon },
        weather: { ...bundle.weather, city: '', state: '', lat, lon },
        air: bundle.air,
        marine: bundle.marine,
      });
    }

    // ---- by city name ----------------------------------------------------
    if (!city) {
      return res.status(400).json({ error: 'provide either "city" or "lat" + "lon"' });
    }
    const found = await openmeteo.lookup(city);
    if (!found) return res.status(404).json({ error: `city not found: ${city}` });
    return res.json(found);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

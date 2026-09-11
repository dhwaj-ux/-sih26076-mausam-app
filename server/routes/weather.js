/** GET /api/weather?city=...  ->  location + weather + air quality + marine */
'use strict';

const express = require('express');
const openmeteo = require('../services/openmeteo');

const router = express.Router();

router.get('/weather', async (req, res, next) => {
  const city = String(req.query.city || '').trim();
  if (!city) return res.status(400).json({ error: 'query parameter "city" is required' });

  try {
    const bundle = await openmeteo.lookup(city);
    if (!bundle) return res.status(404).json({ error: `city not found: ${city}` });
    res.json(bundle);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

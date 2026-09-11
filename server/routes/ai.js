/**
 * POST /api/ai
 * body: { persona, question, city?, profile? }
 *
 * 1. Fetches live weather for the city (cached, free, no key).
 * 2. Builds a persona-scoped context and asks the configured LLM.
 * 3. If no LLM is configured / the call fails, answers from the built-in
 *    offline knowledge base instead. The response always contains an answer,
 *    so the demo can never go blank.
 */
'use strict';

const express = require('express');
const engine = require('../../public/js/engine.js');
const DATA = require('../../public/js/data.js');
const openmeteo = require('../services/openmeteo');
const llm = require('../services/llm');
const { buildContext } = require('../services/context');

const router = express.Router();

router.post('/ai', async (req, res, next) => {
  const body = req.body || {};
  const persona = String(body.persona || 'agri');
  const question = String(body.question || '').trim();
  const city = String(body.city || '').trim();
  const profile = {
    state: body.profile && body.profile.state ? body.profile.state : 'Maharashtra',
    land: body.profile && body.profile.land != null ? body.profile.land : 2,
  };

  if (!DATA.PERSONAS[persona]) return res.status(400).json({ error: `unknown persona: ${persona}` });
  if (!question) return res.status(400).json({ error: 'question is required' });
  if (question.length > 600) return res.status(413).json({ error: 'question too long (max 600 chars)' });

  let bundle = { location: null, weather: null, air: null, marine: null };
  if (city) {
    try {
      const found = await openmeteo.lookup(city);
      if (found) bundle = found;
    } catch (err) {
      // weather is optional for the answer - just continue without it
      console.warn('[ai] weather lookup failed:', err.message);
    }
  }

  // Engine needs live state for the offline fallback too.
  engine.setWeather(bundle.weather);
  engine.setAir(bundle.air);
  engine.setMarine(bundle.marine);
  engine.setPersona(persona);
  engine.setProfile(profile.state, profile.land);

  const llmResult = await llm.ask({
    persona: DATA.PERSONAS[persona],
    question,
    context: buildContext(persona, bundle, profile),
  });

  const answer = llmResult.html || engine.offline(question);

  res.json({
    persona,
    question,
    location: bundle.location,
    answer,
    source: llmResult.html ? 'llm' : 'offline',
    provider: llmResult.provider,
    error: llmResult.html ? undefined : llmResult.error,
  });
});

module.exports = router;

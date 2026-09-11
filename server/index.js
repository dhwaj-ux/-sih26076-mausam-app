/**
 * MAUSAM — application server.
 *
 *   Frontend : static files served from /public (HTML + CSS + vanilla JS)
 *   Backend  : this Express app
 *                GET  /api/health
 *                GET  /api/personas
 *                GET  /api/weather?city=
 *                POST /api/ai
 *
 * Run:  npm install && npm start      ->  http://localhost:3000
 */
'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');

const weatherRoutes = require('./routes/weather');
const aiRoutes = require('./routes/ai');
const personaRoutes = require('./routes/personas');
const llm = require('./services/llm');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

// Tiny request logger - handy during a live demo
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---- health -----------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    service: 'mausam-ai',
    version: '1.0.0',
    status: 'ok',
    aiProvider: llm.activeProvider(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// ---- API --------------------------------------------------------------------
app.use('/api', weatherRoutes);
app.use('/api', aiRoutes);
app.use('/api', personaRoutes);

// ---- static frontend --------------------------------------------------------
app.use(express.static(PUBLIC_DIR, { extensions: ['html'], maxAge: '1h' }));

app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// ---- 404 + error handling ---------------------------------------------------
app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'not found' });
  res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(502).json({ error: 'upstream request failed', detail: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('');
    console.log('  🌦️  MAUSAM — personalised weather homepage (SIH26076)');
    console.log(`  ▶  http://localhost:${PORT}`);
    console.log(`  ▶  AI provider: ${llm.activeProvider() || 'offline knowledge base (no key configured)'}`);
    console.log('  ▶  Weather/AQI/Marine data: Open-Meteo (free, no key)');
    console.log('');
  });
}

module.exports = app;

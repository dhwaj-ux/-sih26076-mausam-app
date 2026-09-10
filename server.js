// Load environment variables FIRST — before any other module reads process.env
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');

const swaggerDocument = require('./swagger.json');
const { 
  mockData, User, VALID_PERSONAS, validateCoordinates, 
  validateCoordinatesMiddleware, helmetMiddleware, apiRateLimiter, 
  morganMiddleware, generatePersonaDashboards, weatherService 
} = require('./appService');

const app = express();

app.use(helmetMiddleware);
app.use(morganMiddleware);
app.use(cors());
app.use(express.json());

app.use('/api/', apiRateLimiter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  if (req.accepts('html') && !req.xhr && req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
  res.status(200).json({
    name: 'SIH26076 Mausam App - API Service',
    status: 'online',
    version: '1.0.0',
    documentation: 'GET /api-docs',
    endpoints: {
      docs: 'GET /api-docs',
      health: 'GET /health',
      weather: 'GET /api/weather?latitude=:lat&longitude=:lon',
      saveLocation: 'POST /api/save-location'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/api/weather', validateCoordinatesMiddleware, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.validatedCoordinates;
    const weatherData = await weatherService(latitude, longitude);
    const personaDashboards = generatePersonaDashboards(weatherData);

    return res.status(200).json({
      success: true,
      coordinates: { latitude, longitude },
      weather: weatherData,
      personas: personaDashboards,
      dashboards: personaDashboards
    });
  } catch (error) {
    console.error('[Router ERROR] Failed processing /api/weather:', error);
    next(error);
  }
});

app.post('/api/save-location', async (req, res, next) => {
  try {
    const body = req.body || {};
    const userId = body.userId || body.user_id;
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return res.status(400).json({
        success: false, statusCode: 400, error: 'Bad Request: Validation Failed',
        message: 'userId is required and must be a non-empty string.'
      });
    }

    const cityName = body.cityName || body.city || body.location?.cityName || body.location?.city;
    if (!cityName || typeof cityName !== 'string' || cityName.trim() === '') {
      return res.status(400).json({
        success: false, statusCode: 400, error: 'Bad Request: Validation Failed',
        message: 'cityName is required and must be a non-empty string.'
      });
    }

    const rawLat = body.latitude !== undefined ? body.latitude : (body.location?.latitude ?? body.lat ?? body.location?.lat);
    const rawLon = body.longitude !== undefined ? body.longitude : (body.location?.longitude ?? body.lon ?? body.lng ?? body.location?.lon ?? body.location?.lng);

    const coordValidation = validateCoordinates({ latitude: rawLat, longitude: rawLon });
    if (!coordValidation.success) {
      return res.status(400).json(coordValidation);
    }
    const { latitude, longitude } = coordValidation.data;

    const preferredPersona = body.preferredPersona || body.persona || body.preferred_persona || 'Health-Conscious';
    if (!VALID_PERSONAS.includes(preferredPersona)) {
      return res.status(400).json({
        success: false, statusCode: 400, error: 'Bad Request: Validation Failed',
        message: `Invalid preferredPersona. Must be one of: ${VALID_PERSONAS.join(', ')}`
      });
    }

    const newLocationEntry = { cityName: cityName.trim(), latitude, longitude, addedAt: new Date() };
    const userDoc = new User({ userId: userId.trim(), savedLocations: [newLocationEntry], preferredPersona });
    await userDoc.validate();

    if (mongoose.connection.readyState === 1) {
      const updatedUser = await User.findOneAndUpdate(
        { userId: userId.trim() },
        { $set: { preferredPersona }, $push: { savedLocations: newLocationEntry } },
        { new: true, upsert: true, runValidators: true }
      );
      return res.status(201).json({ success: true, message: 'Location saved.', data: updatedUser });
    }

    return res.status(201).json({
      success: true, message: 'Location validated (standalone).',
      data: {
        userId: userDoc.userId, savedLocations: userDoc.savedLocations,
        preferredPersona: userDoc.preferredPersona
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, statusCode: 400, error: 'Validation Failed', message: error.message });
    }
    next(error);
  }
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use((req, res) => {
  res.status(404).json({ success: false, statusCode: 404, error: 'Not Found', message: `Cannot ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ success: false, statusCode: status, error: err.name || 'Error', message: err.message || 'An error occurred.' });
});

const PORT = parseInt(process.env.PORT, 10) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || null;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI).then(() => {
      console.log(`[Database] Connected successfully to MongoDB: ${MONGODB_URI}`);
  }).catch((err) => {
      console.warn(`[Database WARNING] Could not connect to MongoDB (${err.message}). Running in standalone mode.`);
  });
}

const server = app.listen(PORT, () => {
  console.log('================================================================================');
  console.log(` SIH26076: MAUSAM APP - MAIN EXPRESS SERVER ONLINE`);
  console.log(` Listening on: http://localhost:${PORT}`);
  console.log('================================================================================');
});

function gracefulShutdown(signal) {
  server.close(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = { app, server };

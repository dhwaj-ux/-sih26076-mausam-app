# SIH26076 — Mausam App
### AI-Personalized Weather Intelligence Platform · Ministry of Earth Sciences (MoES) / IMD

> A resilient, multi-source weather microservice with an 8-persona recommendation engine, live AQI tracking, and a bilingual responsive dashboard — built for Smart India Hackathon 2026.

---

## 🌐 Languages & Technologies

### Backend

| Technology | Version | Role |
|---|---|---|
| **Node.js** | v24.x | JavaScript runtime — CommonJS module system |
| **Express.js** | v5.x | HTTP server, RESTful API routing, middleware stack |
| **Axios** | v1.x | HTTP client for all 5 external API provider calls with 5 s strict timeout |
| **Zod** | v4.x | Runtime input validation — coordinate schema enforcement |
| **Mongoose** | v9.x | MongoDB ODM — User schema, saved locations model |
| **Helmet** | v8.x | Security middleware — HTTP header hardening (XSS, clickjacking, MIME sniffing) |
| **express-rate-limit** | v8.x | API rate limiting — 100 req / 15 min per IP |
| **Morgan** | v1.x | Apache combined-format HTTP request logger |
| **node-cache** | v5.x | In-memory TTL cache — 10-minute weather data memoization |
| **swagger-ui-express** | v5.x | Interactive OpenAPI 3.0 documentation at `/api-docs` |
| **dotenv** | v17.x | Environment variable loading from `backend/.env` |

### Frontend

| Technology | Role |
|---|---|
| **HTML5** | Semantic single-page dashboard shell |
| **CSS3 + Custom Properties** | Glassmorphic UI, CSS animations, responsive grid |
| **Tailwind CSS** (CDN) | Utility-first layout, spacing, color, dark-mode classes |
| **Vanilla JavaScript (ES2022)** | Client controller — all DOM updates, API calls, state management |
| **Chart.js** | 24-hour temperature/rain telemetry chart & 7-day forecast chart |
| **Font Awesome** | Icon set (weather icons, UI controls) |
| **Google Fonts (Inter, Outfit)** | Typography |

### External Data Providers

| Provider | Data Type | Auth |
|---|---|---|
| **OpenWeatherMap API** | Temperature, humidity, visibility, PM2.5, PM10, UV Index | `OWM_KEY` |
| **Open-Meteo API** | Soil moisture, wind speed, rain probability, secondary AQI | Free (no key) |
| **Stormglass API** | Wave height, ocean current velocity | `STORMGLASS_KEY` |
| **OpenRouteService / Mapbox** | Traffic condition, route weather advisory | `ORS_KEY` / `MAPBOX_KEY` |
| **IMD Public Feed** | National weather alerts, monsoon status | Public (no key) |

---

## 📁 File Inventory & Purpose

```
sih26076-mausam-app/
├── .gitignore                 ← Excludes node_modules/, backend/.env from GitHub
├── .env.example               ← Safe template: lists required API keys without values
├── package.json               ← Project metadata, npm start → node backend/server.js
├── package-lock.json          ← Locked dependency tree for reproducible installs
│
├── backend/
│   ├── server.js              ← [ENTRY POINT] Express app + all API routes
│   ├── appService.js          ← [CORE ENGINE] All backend business logic (consolidated)
│   ├── swagger.json           ← OpenAPI 3.0 spec for /api-docs interactive docs
│   └── .env                   ← Secret API keys (gitignored — never pushed to GitHub)
│
└── frontend/
    ├── index.html             ← [DASHBOARD] Responsive SPA shell
    ├── app.js                 ← [CONTROLLER] Client-side logic & persona engine
    └── styles.css             ← [STYLING] Glassmorphic UI + custom animations
```

### Backend Files

#### `backend/server.js` — Express Application & API Router
The single consolidated entry point for the entire backend. Responsibilities:
- Bootstraps the Express app with security middleware (Helmet, Rate Limiter, Morgan, CORS)
- Mounts the Swagger UI documentation at `GET /api-docs`
- Serves `frontend/index.html` for browser requests to `GET /`
- Defines `GET /api/weather` — validates coordinates via Zod, calls the weather aggregator, runs the persona engine, returns unified JSON
- Defines `POST /api/save-location` — validates and persists user bookmarks to MongoDB (or validates in-memory in standalone mode)
- Handles all 404 and 500 error responses
- Manages MongoDB connection and graceful shutdown on `SIGINT`/`SIGTERM`

#### `backend/appService.js` — Consolidated Core Service Module
A single, self-contained module exporting every backend utility. Originally split across `mockData.js`, `dbModel.js`, `validator.js`, `security.js`, `personaLogic.js`, and `weatherService.js` — now merged for GitHub simplicity. Contains:

**Weather Service** — Multi-Source Aggregator:
- Fires all 5 external API calls concurrently via `Promise.allSettled()`
- Enforces a 5 s strict timeout per provider via Axios
- Performs field-by-field graceful fallback: if OpenWeatherMap fails, individual fields (temperature, PM2.5, etc.) fall back to Open-Meteo or `mockData` — never crashing the entire response
- Tracks provider status (`fulfilled` / `fallback`) in the `sources` object
- Caches normalized results for 10 minutes via `node-cache` keyed by `lat_lon`
- Returns the standardized weather JSON schema (18 meteorological fields + metadata)

**Persona Logic Engine:**
- Accepts normalized weather data and applies psychrometric calculations (THI, Heat Index, apparent temperature)
- Evaluates 8 independent rule sets and outputs `alertLevel` (`Safe` / `Warning` / `Danger`) + `recommendationText` for each persona
- Personas: Health-Conscious, Outdoor Fitness, Beachgoers/Surfers, Agriculture/Gardeners, Commuters, Parents & Families, Event Planners, Travelers

**Input Validator (Zod):**
- Coerces and strictly validates `latitude` (−90 to 90) and `longitude` (−180 to 180)
- Supports shorthand aliases: `lat`, `lon`, `lng`
- Rejects empty strings, non-numeric values, and out-of-range coordinates
- Returns standardized HTTP 400 JSON on failure via Express middleware

**Database Schema (Mongoose):**
- `User` schema: `userId` (indexed), `savedLocations[]` (cityName, lat, lon, addedAt), `preferredPersona`
- Auto timestamps (`createdAt`, `updatedAt`)
- `VALID_PERSONAS` array enforced as an enum on the preferredPersona field

**Security Middleware (Helmet + Rate Limiter + Morgan):**
- `helmetMiddleware`: Sets `X-Content-Type-Options`, `X-Frame-Options`, `HSTS`, relaxed CSP for Swagger UI
- `apiRateLimiter`: 100 req / 15 min per IP on all `/api/*` routes, returns RFC-compliant `RateLimit-*` headers
- `morganMiddleware`: Combined Apache logging, auto-skipped during tests

**Mock Fallback Data:**
- Realistic baseline meteorological values for all 18 fields
- Used automatically when all 5 providers fail (total network blackout scenario)

#### `backend/swagger.json` — OpenAPI 3.0 Specification
Defines the full interactive API contract for `/health`, `GET /api/weather`, and `POST /api/save-location` — including query parameter schemas, request/response shapes, and persona enum definitions. Rendered via `swagger-ui-express` at `/api-docs`.

---

### Frontend Files

#### `frontend/index.html` — Dashboard Shell
A single-page HTML5 document serving as the full UI shell. Key sections:
- **Navigation tab bar**: Home / Forecast / Locations / IMD Alerts / My Profile
- **Search & Preset chips**: 8 Indian city quick-select pills (Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Shimla, Kochi, Hyderabad + more)
- **GPS Auto-detect button**: triggers `navigator.geolocation.getCurrentPosition()`
- **Primary weather card**: temperature, biometeorological classification badge, 6-metric parameter grid (humidity, PM2.5+AQI badge, UV Index, visibility, soil moisture, wave height)
- **8-Persona recommendation grid**: color-coded Safe/Warning/Danger cards with category filter tabs
- **Active Persona spotlight**: expanded detail card for the selected persona
- **Warning banner**: IMD alert level bar (Green/Yellow/Orange/Red)
- **Fallback banner**: shows when all APIs are offline and mock data is serving
- **Cache badge**: shows `⚡ Cached` when data is served from 10-min in-memory cache
- **Source status badge**: live green pulse vs amber fallback indicator
- **Forecast tab**: Chart.js 24-hour telemetry + 7-day outlook
- **Locations tab**: regional IMD observatory grid with direct city switching
- **AI Assistant drawer**: slide-in chatbot for weather Q&A
- **Bookmark modal**: saves current city + persona preference to `/api/save-location`
- **Tailwind CDN + Font Awesome + Google Fonts** loaded via CDN

#### `frontend/app.js` — Client-Side Controller & Personalization Engine
~1,600-line Vanilla JS orchestrator. Key systems:

- **`PRESET_LOCATIONS`** — City coordinate dictionary (25+ Indian cities with lat/lon)
- **`i18n` dictionary** — Bilingual English/Hindi strings for all UI labels, tab names, and persona titles
- **`appState`** — Central reactive state object: current city, language, persona, widget preferences
- **`fetchWeather(lat, lon, cityName)`** — Core async function calling `GET /api/weather`, handling errors, triggering all DOM updaters
- **`updateWeatherSummaryCard(weather)`** — Renders temperature, classification badge, humidity, AQI (with CPCB piecewise AQI formula), UV, visibility, soil moisture, wave height
- **`updateStatusIndicators(weather)`** — Toggles online/fallback badge and cache indicator
- **`renderPersonaCards(personas)`** — Generates all 8 persona cards with dynamic alert-level color classes
- **`displayActivePersonaDetail(key, persona)`** — Renders the expanded spotlight section
- **`updateWarningBar(weather)`** — Calculates alert level from temp/rain/wind/PM2.5 thresholds and sets the IMD warning bar color
- **`renderChart(weather)`** — Builds Chart.js 24-hour temperature & rain probability chart
- **`Personalization Engine`** — Algorithmic re-ranker: scores each persona card by the user's active profile and dynamically reorders the 8 cards to surface the most relevant one first
- **GPS button** — `navigator.geolocation.getCurrentPosition()` with error fallback to Ahmedabad
- **Preset chip listeners** — City switching with `parseFloat()` safety on all coordinates
- **Bookmark modal handler** — POSTs to `/api/save-location` with userId, city, persona
- **AI Chatbot** — Slide-in assistant drawer with weather-aware canned responses

**AQI Calculation (CPCB Piecewise Linear Formula):**

$$AQI = \frac{AQI_{hi} - AQI_{lo}}{PM_{hi} - PM_{lo}} \times (PM_{2.5} - PM_{lo}) + AQI_{lo}$$

Applied across 6 breakpoints: Good (0–30), Satisfactory (31–60), Moderate (61–90), Poor (91–120), Very Poor (121–250), Severe (251+).

#### `frontend/styles.css` — Glassmorphic UI Stylesheet
~1,250 lines of custom CSS complementing Tailwind. Key systems:
- **CSS Custom Properties** — 20+ design tokens: MoES navy/blue/teal brand palette, alert color system (green/yellow/orange/red), typography variables
- **Glassmorphic panels** — `backdrop-filter: blur()` + semi-transparent backgrounds for the card surfaces
- **Persona card states** — `.persona-card`, `.active-selected` highlight ring, alert-level color variants
- **Animation keyframes** — pulse for live status dot, fade-in for card transitions, shimmer for loading skeletons
- **Responsive grid** — CSS Grid + Flexbox layouts adapting from mobile (1 col) to desktop (3 col)
- **Warning bar variants** — `.alert-green`, `.alert-yellow`, `.alert-orange`, `.alert-red` themed strips
- **Tab page visibility** — `.tab-page`, `.hidden` toggle system for multi-tab navigation

---

## 🏗️ Architecture Summary

```
Browser Request
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│               frontend/index.html (SPA Shell)           │
│  Tailwind CSS + Font Awesome + Chart.js loaded via CDN  │
│  ─────────────────────────────────────────────────────  │
│              frontend/app.js (Controller)               │
│  1. User selects city / clicks GPS / types coordinates  │
│  2. parseFloat() sanitizes input → fetchWeather() fires │
│  3. GET /api/weather?latitude=X&longitude=Y             │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP fetch()
                         ▼
┌─────────────────────────────────────────────────────────┐
│              backend/server.js (Express API)            │
│  ─────────────────────────────────────────────────────  │
│  [Middleware Chain]                                     │
│  Helmet → Morgan → CORS → JSON parser → Rate Limiter   │
│                         │                               │
│  [Route: GET /api/weather]                              │
│  Zod validator (appService) ──► validates lat/lon       │
│  weatherService (appService) ──► 5 concurrent calls:    │
│    ├── OpenWeatherMap (temp, humidity, PM2.5, UV)       │
│    ├── Open-Meteo (soil, wind, rain, AQI)               │
│    ├── Stormglass (wave height, ocean current)          │
│    ├── OpenRouteService (traffic, route advisory)       │
│    └── IMD Feed (national alert, monsoon status)        │
│  Promise.allSettled() ──► field-by-field fallback       │
│  node-cache (10 min) ──► cache hit? serve instantly     │
│  generatePersonaDashboards() ──► 8 persona outputs      │
│  ──► returns unified JSON (weather + personas)          │
└────────────────────────┬────────────────────────────────┘
                         │ JSON response
                         ▼
┌─────────────────────────────────────────────────────────┐
│              frontend/app.js (DOM Rendering)            │
│  ─────────────────────────────────────────────────────  │
│  updateWeatherSummaryCard()  → temp, AQI, UV, humidity  │
│  updateStatusIndicators()    → live/fallback/cache badge│
│  updateWarningBar()          → IMD alert level color    │
│  renderPersonaCards()        → 8 persona recommendation │
│  displayActivePersonaDetail()→ expanded spotlight card  │
│  renderChart()               → Chart.js telemetry graph │
│  Personalization Engine      → re-ranks cards by profile│
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **`Promise.allSettled()` over `Promise.all()`** | One failing provider never crashes the request — all 5 run in parallel and each fails independently |
| **Field-by-field fallback** | If OWM fails, only that provider's unique fields (UV Index) fall back — Open-Meteo's fields (soil moisture) are unaffected |
| **10-min in-memory cache** | Eliminates redundant external API calls during hackathon demos and protects against rate limits |
| **No API keys on frontend** | All external API calls happen server-side — the browser only ever calls `/api/weather` on our own backend |
| **Standalone DB mode** | The app runs fully without MongoDB — schema validation still runs in-memory, no crash if `MONGODB_URI` is missing |
| **Zod coercion** | Query strings are always `string` type — Zod coerces `"28.61"` to `28.61` before validation |
| **Consolidated `appService.js`** | All 6 original backend modules merged into one file for minimal GitHub footprint and simpler deployment |

---

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/sih26076-mausam-app.git
cd sih26076-mausam-app

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example backend/.env
# Edit backend/.env and add your OWM_KEY

# 4. Start the server
npm start

# 5. Open in browser
# http://localhost:3000
```

> **Note:** The app works without any API keys — it automatically falls back to realistic baseline mock data if keys are missing or the network is unavailable.

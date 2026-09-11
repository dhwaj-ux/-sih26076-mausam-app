# 🌦️ MAUSAM AI

**Personalised homepage for the MAUSAM mobile application**
Smart India Hackathon **SIH26076** · Ministry of Earth Sciences (MoES) · India Meteorological Department (IMD)

<p>
  <img alt="Node 18+" src="https://img.shields.io/badge/node-18%2B-brightgreen">
  <img alt="Tests" src="https://img.shields.io/badge/tests-80%2F80%20passing-brightgreen">
  <img alt="Cost" src="https://img.shields.io/badge/running%20cost-%E2%82%B90-blue">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-lightgrey">
  <img alt="Personas" src="https://img.shields.io/badge/personas-8-orange">
</p>

> **Try it in 5 seconds:** open [`standalone/mausam-ai.html`](standalone/mausam-ai.html) in any browser —
> the whole app (CSS, JS, logo) is inlined in that single file. No install, no server.

📊 **Pitch deck:** [`docs/SIH26076_MAUSAM_AI_PitchDeck.pptx`](docs/SIH26076_MAUSAM_AI_PitchDeck.pptx)

An AI-powered, **persona-adaptive** weather homepage. The page rebuilds itself for whoever is
looking at it — a farmer, a runner, a parent, a traveller, an asthma patient, a daily commuter,
a surfer or an event planner — and each persona gets its own data, its own alerts and its own
domain-expert AI advisor.

---

## ✨ What it does

| | |
|---|---|
| 🎭 **8 personas** | Agriculture · Running & Workout · School & Family · Traveler · Air Quality & Health · Commuter · Beach & Surf · Event Planner |
| 🌦️ **Live weather** | Current + hourly + 5-day forecast, UV, wind, humidity |
| 🌫️ **Live air quality** | US AQI, PM2.5, PM10 with a colour-coded risk scale |
| ⏱️ **Nowcast** | Next 4–24 hours of rain probability and intensity, hour by hour |
| 🌊 **Marine** | Wave height, period, swell, direction, sea temperature, tide highs/lows |
| 🌡️ **Comfort Index** | A 0–100 outdoor-event score built from temp, humidity, rain, wind and UV |
| 🧠 **Smart windows** | Scores every hour and returns the best time to run / travel / hold an event |
| 🤖 **AI advisor** | Answers any question, grounded in the live data, **always in English** |
| 🗣️ **Multilingual input** | Understands **Hindi (Devanagari)**, **Hinglish** and **English** |
| 🛟 **Never fails** | Falls back to a built-in offline knowledge base — the demo can never go blank |

---

## 🚀 Quick start

### Option 1 — just open the website (no install, no server)

```
standalone/mausam-ai.html
```

Double-click it. Everything (CSS, JS, logo) is inlined into that one file. It needs internet for
live weather, and works entirely offline using the built-in knowledge base if the network is down.

> Regenerate it any time with `npm run build:standalone`

### Option 2 — run the full stack (frontend + backend)

```bash
npm install          # installs express + dotenv
cp .env.example .env # optional: add a free AI key
npm start            # → http://localhost:3000
```

For development with auto-reload:

```bash
npm run dev
```

### Option 3 — run the tests

```bash
npm test      # 80 checks: engine unit tests + API integration + standalone smoke test
npm run proof # boots the server and shows frontend + backend both responding
```

---

## 🏗️ Project structure

```
mausam-ai/
├── docs/                          # ── PRESENTATION
│   ├── SIH26076_MAUSAM_AI_PitchDeck.pptx
│   └── mausam-ai-preview.html
├── server/                        # ── BACKEND (Node.js + Express)
│   ├── index.js                   #    app bootstrap, static hosting, routes, error handling
│   ├── routes/
│   │   ├── weather.js             #    GET  /api/weather?city=
│   │   ├── ai.js                  #    POST /api/ai
│   │   └── personas.js            #    GET  /api/personas
│   └── services/
│       ├── openmeteo.js           #    weather + AQI + marine + geocoding (cached)
│       ├── llm.js                 #    Gemini / Groq / OpenRouter adapter — key stays server-side
│       └── context.js             #    re-export of the shared context builder
│
├── public/                        # ── FRONTEND (vanilla JS, no framework)
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── data.js                #    8 personas, 32 states, 17 crop guides (shared with server)
│   │   ├── engine.js              #    all weather maths + the offline answer engine (shared)
│   │   ├── geo.js                 #    geocoding helpers: aliases, India-first, scoring (shared)
│   │   ├── context.js             #    persona-scoped LLM context + system prompt (shared)
│   │   └── app.js                 #    UI, rendering, chat, backend detection
│   ├── assets/                    #    logo mark, wordmark, favicon
│   └── manifest.webmanifest
│
├── scripts/build-standalone.js    # inlines everything into one .html
├── standalone/                    # generated single-file website
├── test/
│   ├── run-tests.js               # 80 checks: unit + API + standalone smoke test
│   └── proof.js                   # proves frontend + backend both respond
├── .github/workflows/ci.yml       # CI: builds + tests on Node 18 / 20 / 22
├── .env.example
├── render.yaml                    # one-click deploy blueprint
├── LICENSE
└── package.json
```

**Key design point:** `data.js`, `engine.js`, `geo.js` and `context.js` are **isomorphic** — the
exact same files run in the browser *and* on the server. There is one source of truth for the
persona logic, so the offline and online answers can never disagree.

---

## 🔌 API reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service status + which AI provider is active |
| `GET` | `/api/personas` | Persona catalogue + state/crop reference data |
| `GET` | `/api/weather?city=Panjim` | Location + weather + air quality + marine bundle |
| `POST` | `/api/ai` | Persona-scoped AI answer |

**`POST /api/ai`**

```jsonc
// request
{
  "persona": "run",
  "question": "What is the best time to run today?",
  "city": "Panjim",
  "profile": { "state": "Goa", "land": 2 }
}

// response
{
  "persona": "run",
  "question": "What is the best time to run today?",
  "location": { "name": "Panjim", "state": "Goa", "country": "India" },
  "answer": "<b>Best window:</b> 06:00 – 07:00 …",
  "source": "llm",            // or "offline" when no key is configured
  "provider": "gemini"
}
```

The endpoint **always** returns an answer. If no LLM key is configured, or the provider call
fails, it silently answers from the built-in knowledge base and reports `source: "offline"`.

---

## ⚙️ Configuration

Everything is optional — **the app runs with zero configuration**. Copy `.env.example` to `.env`
and fill in what you have.

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | Server port |
| `LLM_PROVIDER` | *(blank)* | `gemini` \| `groq` \| `openrouter` — blank = offline knowledge base |
| `GEMINI_API_KEY` | | Free at [aistudio.google.com](https://aistudio.google.com) |
| `GROQ_API_KEY` | | Free at [console.groq.com](https://console.groq.com) |
| `OPENROUTER_API_KEY` | | Free models at [openrouter.ai](https://openrouter.ai) |
| `HOME_COUNTRY` | `IN` | Country to prefer in geocoding |
| `CACHE_TTL_SECONDS` | `600` | In-memory cache for upstream weather calls |

### Weather data costs nothing

| Data | Source | Key needed |
|---|---|---|
| Forecast (current/hourly/5-day) | Open-Meteo Forecast API | ❌ |
| Air quality (AQI, PM2.5, PM10) | Open-Meteo Air Quality API | ❌ |
| Marine (waves, swell, tide, sea temp) | Open-Meteo Marine API | ❌ |
| Geocoding | Open-Meteo Geocoding API | ❌ |
| AI answers | Gemini / Groq / OpenRouter | ✅ optional (free tier) |

**Running cost of the whole prototype: ₹0.**

---

## 🤖 How the AI works

```
persona + live weather + AQI + marine + profile
                    │
                    ▼
      persona-scoped CONTEXT block          ← only this persona's data
                    │
                    ▼
   hard-locked system prompt (rules 1–6)
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
  LLM (Gemini/Groq)      offline knowledge base
       └────────────┬────────────┘
                    ▼
        answer, always in English
```

**Rule 2 of the system prompt is important.** An earlier version always sent the full agriculture
context to the model, so every persona answered like a crop advisory. The context is now scoped
per persona, and the prompt explicitly forbids agriculture for non-agriculture personas. There is
a regression test for exactly this (`context: no agriculture leakage into other personas`).

**Rule 5 makes the output deterministic in language:** the model understands Hindi, Hinglish and
English, but the final answer is always written in English.

---

## 🧪 Tests

```bash
npm test
```

80 checks across three parts:

1. **Engine unit tests** — comfort index bands, surf/sea ratings, tide detection, best-window
   selection, persona routing (Hindi + Hinglish + English), context scoping, English-only output.
2. **API integration tests** — boots the real Express app and exercises every endpoint, including
   graceful degradation for unknown cities and inland locations.
3. **Standalone smoke test** — loads the generated single-file build into a stubbed DOM and
   verifies it boots, renders all 8 persona cards and degrades gracefully with no network.

---

## 🎯 Mapping to the problem statement

The official SIH26076 statement names eight user personas the homepage must personalise for.

| PS persona | Module | Status |
|---|---|---|
| Health-conscious — AQI, pollen, UV, humidity | Air Quality & Health Risk | ✅ Built |
| Outdoor fitness — sunrise/sunset, best running hours | Running & Workout Guide | ✅ Built |
| Beachgoers & surfers — sea, tides, waves, water temp | Beachgoers & Surfers | ✅ Built |
| Travelers — saved destinations, alerts, packing | Traveler & Destination Weather | ✅ Built |
| Parents & families — school commute, rain alerts | School Commute & Family Outing | ✅ Built |
| Agriculture & gardeners — soil, rainfall, frost | Agriculture & Crop Advisory | ✅ Built |
| Commuters — weather + traffic, visibility, fog | Daily Commuter & Nowcast | ✅ Built |
| Event planners — extended forecast, rain %, comfort index | Event Planners & Gatherings | ✅ Built |

**Pollen count** is listed in the PS but Open-Meteo only serves pollen data for Europe, so it is
the one item left on the roadmap.

---

## ☁️ Deployment

**Render / Railway / Fly.io**

```
Build command : npm install
Start command : npm start
```
Set `PORT` (usually injected automatically) and any `*_API_KEY` you want in the dashboard.

**Docker**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN node scripts/build-standalone.js
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
```

**Static hosting only** (Netlify, Vercel, GitHub Pages) — deploy the `standalone/` folder. You get
the full UI and live weather; AI answers use the offline knowledge base (there is no backend to
hold the key).

---

## 🎬 30-second demo script

1. **Home** → type a city → press **Get**. Live weather, AQI and (for coastal cities) marine data appear.
2. Open the **AI Advisor** tab → click any **persona card**.
3. The chat announces *“Persona switched → …”* and the suggested questions change.
4. Ask the judge to type **anything, in any language** — e.g. `मेरी मिट्टी कौन सी है?` or
   `shaadi ke liye aaj ka comfort index?`
5. The advisor answers **in English**, scoped to the active persona.

Try switching to *Running* and asking about crops — it will tell you that question belongs to a
different persona. That single interaction demonstrates the whole personalisation engine.

---

## 📄 Licence

MIT. Weather data © [Open-Meteo](https://open-meteo.com) (CC-BY-4.0).
Logo and name depict the IMD / MoES **MAUSAM** app; used here for a hackathon prototype.

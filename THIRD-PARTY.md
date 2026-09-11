# Third-party notices

## Weather, air-quality, marine and geocoding data

All environmental data used by this project comes from **Open-Meteo**
(<https://open-meteo.com>) and is licensed under
[CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).

| Dataset | Endpoint |
|---|---|
| Weather forecast (current / hourly / 5-day) | `api.open-meteo.com/v1/forecast` |
| Air quality (US AQI, PM2.5, PM10) | `air-quality-api.open-meteo.com/v1/air-quality` |
| Marine (waves, swell, tide, sea temperature) | `marine-api.open-meteo.com/v1/marine` |
| Geocoding (city → coordinates) | `geocoding-api.open-meteo.com/v1/search` |

No API key is required for any of the above. Please credit Open-Meteo if you
reuse this project.

## AI providers

The optional AI layer can talk to Google Gemini, Groq or OpenRouter. Each has
its own terms of service, and any API key you supply remains your own
responsibility. The application works without any of them by using the
built-in offline knowledge base.

## Brand and logo

The **MAUSAM** name and the weather-application logo depict the official
weather application of the **India Meteorological Department (IMD)**,
Ministry of Earth Sciences, Government of India.

They are used here solely within a Smart India Hackathon (SIH26076) prototype
and remain the property of their respective owners. This repository is not
affiliated with, endorsed by, or an official product of IMD or MoES.

import express from "express";
import fetch from "node-fetch";

const DEFAULT_OPEN_METEO_BASE = "https://api.open-meteo.com/v1";

const normaliseNumber = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const mapOpenMeteoWeather = (payload) => {
  const current = payload?.current ?? {};
  const dailyForecasts = Array.isArray(payload?.daily?.time)
    ? payload.daily.time.map((time, index) => ({
        isoDate: time,
        iconCode: normaliseNumber(payload.daily?.weather_code?.[index]),
        iconPhrase: null,
        highTemp: normaliseNumber(payload.daily?.temperature_2m_max?.[index]),
        lowTemp: normaliseNumber(payload.daily?.temperature_2m_min?.[index]),
        precipitationMm: normaliseNumber(payload.daily?.precipitation_sum?.[index]),
        humidity: null,
      }))
    : [];

  return {
    location: "Lokasi koordinat",
    condition: null,
    iconCode: normaliseNumber(current.weather_code),
    temperature: normaliseNumber(current.temperature_2m),
    highTemp: normaliseNumber(dailyForecasts[0]?.highTemp),
    lowTemp: normaliseNumber(dailyForecasts[0]?.lowTemp),
    humidity: normaliseNumber(current.relative_humidity_2m),
    rainfall: normaliseNumber(current.precipitation),
    pressure: normaliseNumber(current.pressure_msl),
    windSpeed: normaliseNumber(current.wind_speed_10m),
    dailyForecasts,
  };
};

export const createWeatherRouter = ({
  fetchImpl = fetch,
  logger = console,
  openMeteoBase = process.env.OPEN_METEO_BASE_URL || DEFAULT_OPEN_METEO_BASE,
} = {}) => {
  const router = express.Router();

  const respondWithOpenMeteo = async (res, lat, lon) => {
    try {
      const url = `${openMeteoBase}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,pressure_msl,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto`;
      const response = await fetchImpl(url);
      if (!response.ok) {
        logger.error?.("weather_provider_failed", {
          provider: "open-meteo",
          status: response.status,
        });
        return res.status(502).json({ error: "weather_provider_unavailable" });
      }
      return res.json(mapOpenMeteoWeather(await response.json()));
    } catch (error) {
      logger.error?.("weather_provider_failed", {
        provider: "open-meteo",
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return res.status(502).json({ error: "weather_provider_unavailable" });
    }
  };

  router.get("/", async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "lat & lon required" });
    }

    return respondWithOpenMeteo(res, lat, lon);
  });

  return router;
};

export default createWeatherRouter();

// routes/weather.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();
const ACCUWEATHER_BASE = "https://dataservice.accuweather.com";

const buildLocationLabel = (locationData) => {
  if (!locationData) return "Lokasi tidak diketahui";

  const locality = locationData.LocalizedName;
  const admin = locationData.AdministrativeArea?.LocalizedName;
  const country = locationData.Country?.LocalizedName;

  return [locality, admin, country].filter(Boolean).join(", ");
};

const normaliseNumber = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

router.get("/", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat & lon required" });

  const apiKey = process.env.ACCUWEATHER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing AccuWeather API key" });
  }

  try {
    const locationUrl = `${ACCUWEATHER_BASE}/locations/v1/cities/geoposition/search?apikey=${apiKey}&q=${lat},${lon}&language=id-id`;
    const locationResp = await fetch(locationUrl);
    if (!locationResp.ok) {
      const errorText = await locationResp.text();
      console.error("❌ AccuWeather location lookup failed", locationResp.status, errorText);
      return res.status(500).json({ error: "Failed to resolve location" });
    }
    const locationData = await locationResp.json();
    const locationKey = locationData?.Key;

    if (!locationKey) {
      console.warn("⚠️ AccuWeather location key missing for", lat, lon, locationData);
      return res.status(404).json({ error: "Unable to resolve AccuWeather location key" });
    }

    const [currentResp, forecastResp] = await Promise.all([
      fetch(
        `${ACCUWEATHER_BASE}/currentconditions/v1/${locationKey}?apikey=${apiKey}&language=id-id&details=true`
      ),
      fetch(
        `${ACCUWEATHER_BASE}/forecasts/v1/daily/5day/${locationKey}?apikey=${apiKey}&language=id-id&details=true&metric=true`
      ),
    ]);

    if (!currentResp.ok) {
      const errorText = await currentResp.text();
      console.error("❌ AccuWeather current conditions failed", currentResp.status, errorText);
      return res.status(500).json({ error: "Failed to fetch current conditions" });
    }

    if (!forecastResp.ok) {
      const errorText = await forecastResp.text();
      console.error("❌ AccuWeather forecast failed", forecastResp.status, errorText);
      return res.status(500).json({ error: "Failed to fetch forecast" });
    }

    const currentData = await currentResp.json();
    const forecastData = await forecastResp.json();

    const current = Array.isArray(currentData) ? currentData[0] : currentData;
    const forecastArray = Array.isArray(forecastData?.DailyForecasts)
      ? forecastData.DailyForecasts
      : [];
    const firstForecast = forecastArray[0];

    const dailyForecasts = forecastArray.map((day) => ({
      isoDate: day?.Date ?? null,
      iconCode: day?.Day?.Icon ?? day?.Night?.Icon ?? null,
      iconPhrase: day?.Day?.IconPhrase ?? day?.Night?.IconPhrase ?? null,
      highTemp: normaliseNumber(day?.Temperature?.Maximum?.Value),
      lowTemp: normaliseNumber(day?.Temperature?.Minimum?.Value),
      precipitationMm:
        normaliseNumber(day?.Day?.TotalLiquid?.Value) ??
        normaliseNumber(day?.Night?.TotalLiquid?.Value) ??
        null,
      humidity:
        normaliseNumber(day?.Day?.RelativeHumidity?.Average) ??
        normaliseNumber(day?.Night?.RelativeHumidity?.Average) ??
        null,
    }));

    const formatted = {
      location: buildLocationLabel(locationData),
      condition: current?.WeatherText ?? null,
      iconCode: current?.WeatherIcon ?? null,
      temperature: normaliseNumber(current?.Temperature?.Metric?.Value),
      highTemp: normaliseNumber(firstForecast?.Temperature?.Maximum?.Value),
      lowTemp: normaliseNumber(firstForecast?.Temperature?.Minimum?.Value),
      humidity: normaliseNumber(current?.RelativeHumidity),
      rainfall: normaliseNumber(current?.PrecipitationSummary?.Past24Hours?.Metric?.Value),
      pressure: normaliseNumber(current?.Pressure?.Metric?.Value),
      windSpeed: normaliseNumber(current?.Wind?.Speed?.Metric?.Value),
      dailyForecasts,
    };

    res.json(formatted);
  } catch (err) {
    console.error("❌ Weather route error:", err);
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});

export default router;

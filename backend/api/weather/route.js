// routes/weather.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();
const ACCUWEATHER_BASE = "https://dataservice.accuweather.com";
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";

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

const fetchOpenMeteoWeather = async (lat, lon) => {
  const url = `${OPEN_METEO_BASE}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,pressure_msl,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Open-Meteo response ${response.status}: ${text}`);
  }

  const payload = await response.json();
  const current = payload?.current ?? {};

  const dailyForecasts = Array.isArray(payload?.daily?.time)
    ? payload.daily.time.map((time, index) => ({
        isoDate: time,
        highTemp: normaliseNumber(payload.daily?.temperature_2m_max?.[index]),
        lowTemp: normaliseNumber(payload.daily?.temperature_2m_min?.[index]),
        precipitationMm: normaliseNumber(payload.daily?.precipitation_sum?.[index]),
      }))
    : [];

  return {
    source: "open-meteo",
    locationLabel: `Koordinat ${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}`,
    current: {
      temperature: normaliseNumber(current?.temperature_2m),
      humidity: normaliseNumber(current?.relative_humidity_2m),
      rainfall: normaliseNumber(current?.precipitation),
      pressure: normaliseNumber(current?.pressure_msl),
      windSpeed: normaliseNumber(current?.wind_speed_10m),
    },
    dailyForecasts,
  };
};

const mapFallbackWeather = (fallbackData) => {
  const firstForecast = Array.isArray(fallbackData?.dailyForecasts)
    ? fallbackData.dailyForecasts[0]
    : null;

  return {
    location: fallbackData?.locationLabel ?? "Lokasi tidak diketahui",
    condition: null,
    iconCode: null,
    temperature: normaliseNumber(fallbackData?.current?.temperature),
    highTemp: normaliseNumber(firstForecast?.highTemp),
    lowTemp: normaliseNumber(firstForecast?.lowTemp),
    humidity: normaliseNumber(fallbackData?.current?.humidity),
    rainfall: normaliseNumber(fallbackData?.current?.rainfall),
    pressure: normaliseNumber(fallbackData?.current?.pressure),
    windSpeed: normaliseNumber(fallbackData?.current?.windSpeed),
    dailyForecasts: Array.isArray(fallbackData?.dailyForecasts)
      ? fallbackData.dailyForecasts.map((day) => ({
          isoDate: day?.isoDate ?? null,
          iconCode: null,
          iconPhrase: null,
          highTemp: normaliseNumber(day?.highTemp),
          lowTemp: normaliseNumber(day?.lowTemp),
          precipitationMm: normaliseNumber(day?.precipitationMm),
          humidity: null,
        }))
      : [],
  };
};

const respondWithFallback = async (res, lat, lon, reason) => {
  try {
    console.warn(`⚠️ Using Open-Meteo fallback for weather (${reason})`);
    const fallback = await fetchOpenMeteoWeather(lat, lon);
    return res.json(mapFallbackWeather(fallback));
  } catch (fallbackError) {
    console.error("❌ Open-Meteo fallback failed:", fallbackError);
    return res.status(500).json({ error: "Failed to fetch weather" });
  }
};

router.get("/", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon)
    return res.status(400).json({ error: "lat & lon required" });

  const apiKey = process.env.ACCUWEATHER_API_KEY;
  if (!apiKey) {
    return respondWithFallback(res, lat, lon, "API key missing");
  }

  try {
    const locationUrl = `${ACCUWEATHER_BASE}/locations/v1/cities/geoposition/search?apikey=${apiKey}&q=${lat},${lon}&language=id-id`;
    const locationResp = await fetch(locationUrl);
    if (!locationResp.ok) {
      const errorText = await locationResp.text();
      console.error(
        "❌ AccuWeather location lookup failed",
        locationResp.status,
        errorText
      );
      return respondWithFallback(res, lat, lon, "location lookup failure");
    }
    const locationData = await locationResp.json();
    const locationKey = locationData?.Key;

    if (!locationKey) {
      console.warn(
        "⚠️ AccuWeather location key missing for",
        lat,
        lon,
        locationData
      );
      return respondWithFallback(res, lat, lon, "missing location key");
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
      console.error(
        "❌ AccuWeather current conditions failed",
        currentResp.status,
        errorText
      );
      return respondWithFallback(res, lat, lon, "current conditions failure");
    }

    if (!forecastResp.ok) {
      const errorText = await forecastResp.text();
      console.error(
        "❌ AccuWeather forecast failed",
        forecastResp.status,
        errorText
      );
      return respondWithFallback(res, lat, lon, "forecast failure");
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
      rainfall: normaliseNumber(
        current?.PrecipitationSummary?.Past24Hours?.Metric?.Value
      ),
      pressure: normaliseNumber(current?.Pressure?.Metric?.Value),
      windSpeed: normaliseNumber(current?.Wind?.Speed?.Metric?.Value),
      dailyForecasts,
    };

    res.json(formatted);
  } catch (err) {
    console.error("❌ Weather route error:", err);
    return respondWithFallback(res, lat, lon, "unexpected error");
  }
});

export default router;

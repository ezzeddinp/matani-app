// routes/weather.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat & lon required" });

  try {
    // 1Fetch weather data dari Open-Meteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    const weatherResp = await fetch(weatherUrl);
    const weatherData = await weatherResp.json();

    // Reverse geocoding via OpenCage
    const geoUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${process.env.OPENCAGE_API_KEY}&language=id`;
    const geoResp = await fetch(geoUrl);
    const geoData = await geoResp.json();

    // Ambil nama lokasi (city/town/village/state)
    const components = geoData.results?.[0]?.components || {};
    const location =
      components.city ||
      components.town ||
      components.village ||
      components.state ||
      components.country ||
      "Unknown";

    // Format hasil
    const formatted = {
      location,
      temperature: weatherData.current?.temperature_2m ?? null,
      highTemp: weatherData.daily?.temperature_2m_max?.[0] ?? null,
      lowTemp: weatherData.daily?.temperature_2m_min?.[0] ?? null,
      humidity: weatherData.current?.relative_humidity_2m ?? null,
      rainfall: weatherData.current?.precipitation ?? 0,
      pressure: weatherData.current?.surface_pressure ?? null,
      windSpeed: weatherData.current?.wind_speed_10m ?? null,
    };

    res.json(formatted);
  } catch (err) {
    console.error("❌ Weather route error:", err);
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});

export default router;

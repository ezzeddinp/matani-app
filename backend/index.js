import cors from "cors";
import "dotenv/config";
import express from "express";

// Simple mock routes instead of importing
const ndviRoute = express.Router();
const weatherRoute = express.Router();

// NDVI route
ndviRoute.get("/", (req, res) => {
  console.log("🌱 NDVI endpoint accessed");
  const mockData = {
    interval: "2025-09-28",
    ndvi_min: -1.0,
    ndvi_max: 1.0,
    ndvi_mean: 0.1907,
    ndvi_stdev: 0.2402,
  };
  res.json(mockData);
});

// Weather route
weatherRoute.get("/", (req, res) => {
  console.log("🌦 Weather endpoint accessed");

  const { lat, lon } = req.query;
  console.log(`🌍 Weather requested for coordinates: ${lat}, ${lon}`);

  if (!lat || !lon) {
    return res.status(400).json({
      error: "Parameter lat dan lon diperlukan",
    });
  }

  // Untuk demo, kita gunakan koordinat untuk menentukan lokasi
  let locationName = "Jakarta, Indonesia"; // Default

  // Simple location detection based on coordinates
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (latitude > -7 && latitude < -6 && longitude > 106 && longitude < 107) {
    locationName = "Jakarta, Indonesia";
  } else if (
    latitude > -8 &&
    latitude < -7 &&
    longitude > 110 &&
    longitude < 111
  ) {
    locationName = "Yogyakarta, Indonesia";
  } else if (
    latitude > -7 &&
    latitude < -6 &&
    longitude > 107 &&
    longitude < 108
  ) {
    locationName = "Bekasi, Indonesia";
  } else {
    // Use reverse geocoding approximation
    locationName = `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;
  }

  // Mock weather data berdasarkan lokasi user
  const mockData = {
    location: locationName,
    temperature: Math.round(25 + Math.random() * 10), // 25-35°C
    highTemp: Math.round(28 + Math.random() * 8), // 28-36°C
    lowTemp: Math.round(20 + Math.random() * 5), // 20-25°C
    humidity: Math.round(60 + Math.random() * 30), // 60-90%
    rainfall: `${(Math.random() * 20).toFixed(1)} mm`,
    pressure: `${Math.round(1000 + Math.random() * 30)} hPa`,
    windSpeed: `${(Math.random() * 25).toFixed(1)} km/h`,
  };

  console.log(`✅ Weather data generated for ${locationName}:`, mockData);
  res.json(mockData);
});

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware (taruh di awal supaya semua request ke-log)
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Routes
app.use("/ndvi", ndviRoute);
app.use("/weather", weatherRoute);

app.get("/", (req, res) => {
  console.log("📍 Root endpoint accessed");
  res.json({ message: "Matani Backend API is running!" });
});

// Listen sekali aja, pakai 0.0.0.0 biar bisa diakses dari HP
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend running at:`);
  console.log(`   👉 Local:   http://localhost:${PORT}`);
  console.log(`   👉 Network: http://192.168.x.x:${PORT}`); // ganti IP sesuai ipconfig/getifaddr
  console.log("📋 Available endpoints:");
  console.log(`   GET  /`);
  console.log(`   GET  /ndvi`);
  console.log(`   GET  /weather`);
});

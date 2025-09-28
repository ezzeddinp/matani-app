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
    ndvi_stdev: 0.2402
  };
  res.json(mockData);
});

// Weather route  
weatherRoute.get("/", (req, res) => {
  console.log("🌦 Weather endpoint accessed");
  const mockData = {
    location: "Sleman, Yogyakarta",
    temperature: 23,
    highTemp: 26,
    lowTemp: 20,
    humidity: 76,
    rainfall: "5 mm",
    pressure: "1019 hPa",
    windSpeed: "18 km/h"
  };
  res.json(mockData);
});

const app = express();
const PORT = 5000;

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

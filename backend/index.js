import cors from "cors";
import "dotenv/config";
import express from "express";

import aiRoute from "./api/ai/route.js";
import ndviRoute from "./api/ndvi/utils.js";
import weatherRoute from "./api/weather/route.js";

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
app.use("/ai", aiRoute);

app.get("/", (req, res) => {
  console.log("📍 Root endpoint accessed");
  res.json({ message: "Matani Backend API is running!" });
});

// Listen sekali aja, pakai 0.0.0.0 biar bisa diakses dari HP
app.listen(PORT, "0.0.0.0", (error) => {
  if (error) {
    throw error;
  }
  console.log(`🚀 Backend running at:`);
  console.log(`   👉 Local:   http://localhost:${PORT}`);
  console.log(`   👉 Network: http://192.168.x.x:${PORT}`); // ganti IP sesuai ipconfig/getifaddr
  console.log("📋 Available endpoints:");
  console.log(`   GET  /`);
  console.log(`   GET  /ndvi`);
  console.log(`   GET  /weather`);
  console.log(`   POST /ai/summary`);
});

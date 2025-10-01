import cors from "cors";
import "dotenv/config";
import express from "express";
import ndviRoute from "./api/ndvi/utils.js";

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/ndvi", ndviRoute);

app.get("/", (req, res) => {
  console.log("📍 Root endpoint accessed");
  res.json({ message: "Matani Backend API is running!" });
});

// Add logging middleware for all requests
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
  console.log("📋 Available endpoints:");
  console.log(`   GET  http://localhost:${PORT}/`);
  console.log(`   GET  http://localhost:${PORT}/ndvi`);
});

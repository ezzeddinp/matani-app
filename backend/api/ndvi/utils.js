import { Router } from "express";
import fetch from "node-fetch";
import { getSentinelToken } from "../../sentinelAuth.js";

const router = Router();

const NDVI_NDMI_EVALSCRIPT = [
  "//VERSION=3",
  "function setup() {",
  "  return {",
  '    input: ["B04", "B08", "B11", "dataMask"],',
  "    output: [",
  '      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },',
  '      { id: "ndmi", bands: 1, sampleType: "FLOAT32" },',
  '      { id: "dataMask", bands: 1 }',
  "    ]",
  "  };",
  "}",
  "function evaluatePixel(s) {",
  "  const ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);",
  "  const ndmi = (s.B08 - s.B11) / (s.B08 + s.B11);",
  "  return { ndvi: [ndvi], ndmi: [ndmi], dataMask: [s.dataMask] };",
  "}",
].join("\n");

router.get("/", async (req, res) => {
  console.log("🚀 Starting NDVI request...");

  try {
    // Ambil parameter bbox dari query string
    const bboxParam = req.query.bbox;
    let bbox;

    if (bboxParam) {
      // Parse bbox dari parameter
      bbox = bboxParam.split(",").map((coord) => parseFloat(coord));
      console.log("📍 Using bbox from request:", bbox);

      if (bbox.length !== 4 || bbox.some(isNaN)) {
        console.error(
          "❌ Invalid bbox format. Expected: west,south,east,north"
        );
        return res.status(400).json({
          error: "Invalid bbox format. Expected: west,south,east,north",
        });
      }
    } else {
      // Default bbox (Jakarta area)
      bbox = [106.7, -6.3, 106.9, -6.1];
      console.log("📍 Using default bbox (Jakarta):", bbox);
    }

    console.log("📡 Getting Sentinel Hub token...");
    const token = await getSentinelToken();
    console.log("✅ Token obtained successfully");

    console.log("🌍 Preparing request to Sentinel Hub Statistics API...");
    const requestBody = {
      input: {
        bounds: { bbox: bbox }, // Menggunakan bbox dinamis
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              timeRange: {
                from: "2025-09-01T00:00:00Z",
                to: "2025-09-05T23:59:59Z",
              },
            },
          },
        ],
      },
      aggregation: {
        timeRange: {
          from: "2025-09-01T00:00:00Z",
          to: "2025-09-05T23:59:59Z",
        },
        aggregationInterval: { of: "P1D" },
        evalscript: NDVI_NDMI_EVALSCRIPT,
      },
    };

    console.log("📊 Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(
      "https://services.sentinel-hub.com/api/v1/statistics",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log("📈 Response status:", response.status);
    console.log(
      "📈 Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      console.error(
        "❌ API request failed:",
        response.status,
        response.statusText
      );
      const errorText = await response.text();
      console.error("❌ Error response:", errorText);
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("📋 Raw response data:", JSON.stringify(data, null, 2));

    // Format output sesuai kebutuhan
    console.log("🔄 Processing response data...");
    if (data.data && data.data.length > 0) {
      console.log(`✅ Found ${data.data.length} data entries`);

      const formattedData = data.data.map((item, index) => {
        console.log(`📊 Processing entry ${index + 1}:`, {
          interval: item.interval,
          hasOutputs: !!item.outputs,
          hasNdvi: !!(item.outputs && item.outputs.ndvi),
        });

        const interval = item.interval.from.split("T")[0]; // ambil tanggal saja
        const ndviStats = item.outputs.ndvi.bands.B0.stats;
        const ndmiStats = item.outputs.ndmi?.bands?.B0?.stats;

        const formatted = {
          interval: interval,
          ndvi_min: Math.round(ndviStats.min * 10000) / 10000, // 4 decimal places
          ndvi_max: Math.round(ndviStats.max * 10000) / 10000,
          ndvi_mean: Math.round(ndviStats.mean * 10000) / 10000,
          ndvi_stdev: Math.round(ndviStats.stDev * 10000) / 10000,
          ndmi_min: ndmiStats
            ? Math.round(ndmiStats.min * 10000) / 10000
            : null,
          ndmi_max: ndmiStats
            ? Math.round(ndmiStats.max * 10000) / 10000
            : null,
          ndmi_mean: ndmiStats
            ? Math.round(ndmiStats.mean * 10000) / 10000
            : null,
          ndmi_stdev: ndmiStats
            ? Math.round(ndmiStats.stDev * 10000) / 10000
            : null,
        };

        console.log(`📈 Formatted entry ${index + 1}:`, formatted);
        return formatted;
      });

      console.log("🎉 Successfully processed all data, sending response...");
      res.json(formattedData);
    } else {
      console.log("⚠️ No data available in response");
      res.json({ error: "No data available" });
    }
  } catch (err) {
    console.error("❌ NDVI API Error occurred:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    res.status(500).json({
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

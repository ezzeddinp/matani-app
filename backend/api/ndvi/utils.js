import { Router } from "express";
import fetch from "node-fetch";
import { getSentinelToken } from "../../sentinelAuth.js";

const DEFAULT_CDSE_STATISTICS_URL =
  "https://sh.dataspace.copernicus.eu/statistics/v1";
const DEMONSTRATION_TIME_RANGE = {
  from: "2025-09-01T00:00:00Z",
  to: "2025-09-05T23:59:59Z",
};

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

const roundStat = (value) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.round(value * 10000) / 10000
    : null;

const formatEntry = (item) => {
  const interval = item?.interval?.from?.split("T")?.[0];
  const ndvi = item?.outputs?.ndvi?.bands?.B0?.stats;
  const ndmi = item?.outputs?.ndmi?.bands?.B0?.stats;
  if (!interval || !ndvi) return null;

  return {
    interval,
    ndvi_min: roundStat(ndvi.min),
    ndvi_max: roundStat(ndvi.max),
    ndvi_mean: roundStat(ndvi.mean),
    ndvi_stdev: roundStat(ndvi.stDev),
    ndmi_min: roundStat(ndmi?.min),
    ndmi_max: roundStat(ndmi?.max),
    ndmi_mean: roundStat(ndmi?.mean),
    ndmi_stdev: roundStat(ndmi?.stDev),
  };
};

export const createNdviRouter = ({
  fetchImpl = fetch,
  getToken = getSentinelToken,
  statisticsUrl = process.env.SENTINEL_STATISTICS_URL ||
    DEFAULT_CDSE_STATISTICS_URL,
  logger = console,
} = {}) => {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const bboxParam = req.query.bbox;
      const bbox = bboxParam
        ? String(bboxParam)
            .split(",")
            .map((coordinate) => Number.parseFloat(coordinate))
        : [106.7, -6.3, 106.9, -6.1];

      if (bbox.length !== 4 || bbox.some((coordinate) => !Number.isFinite(coordinate))) {
        return res.status(400).json({
          error: "Invalid bbox format. Expected: west,south,east,north",
        });
      }

      const token = await getToken();
      const requestBody = {
        input: {
          bounds: { bbox },
          data: [
            {
              type: "sentinel-2-l2a",
              dataFilter: { timeRange: DEMONSTRATION_TIME_RANGE },
            },
          ],
        },
        aggregation: {
          timeRange: DEMONSTRATION_TIME_RANGE,
          aggregationInterval: { of: "P1D" },
          evalscript: NDVI_NDMI_EVALSCRIPT,
        },
      };

      const response = await fetchImpl(statisticsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        logger.error?.("satellite_provider_failed", { status: response.status });
        return res.status(502).json({ error: "satellite_provider_unavailable" });
      }

      const payload = await response.json();
      const formatted = Array.isArray(payload?.data)
        ? payload.data.map(formatEntry).filter(Boolean)
        : [];

      if (formatted.length === 0) {
        return res.json({ error: "No data available" });
      }

      logger.info?.("satellite_provider_complete", { entries: formatted.length });
      return res.json(formatted);
    } catch (error) {
      logger.error?.("satellite_provider_failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return res.status(502).json({ error: "satellite_provider_unavailable" });
    }
  });

  return router;
};

export default createNdviRouter();

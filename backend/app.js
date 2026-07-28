import crypto from "node:crypto";
import cors from "cors";
import express from "express";

import aiRoute from "./api/ai/route.js";
import ndviRoute from "./api/ndvi/utils.js";
import weatherRoute from "./api/weather/route.js";
import { loadConfig } from "./config.js";
import {
  createAuthMiddleware,
  createInFlightGuard,
  createQuotaObserver,
  createRateLimiter,
  createRequestValidator,
  verifySupabaseAccessToken,
} from "./security.js";

export const createApp = ({
  config = loadConfig(),
  verifyAccessToken = verifySupabaseAccessToken,
  routers = { ndvi: ndviRoute, weather: weatherRoute, ai: aiRoute },
  now = Date.now,
} = {}) => {
  const app = express();
  const quota = createQuotaObserver();
  app.locals.quotaSnapshot = quota.snapshot;

  app.use((req, res, next) => {
    req.requestId = req.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
    res.set("X-Request-Id", req.requestId);
    const startedAt = Date.now();
    res.once("finish", () => {
      console.info(JSON.stringify({
        event: "http_request",
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
        userId: req.auth?.id ?? null,
      }));
    });
    next();
  });

  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsAllowedOrigins.includes(origin)) return callback(null, true);
      const error = new Error("CORS_ORIGIN_DENIED");
      error.statusCode = 403;
      return callback(error);
    },
    allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "X-Request-Id"],
    methods: ["GET", "POST", "OPTIONS"],
    maxAge: 600,
  }));
  app.use(express.json({ limit: config.maxJsonBytes }));
  app.get("/", (_req, res) => res.json({ message: "Matani Backend API is running!", status: "ok" }));

  const protectedMiddleware = [
    createAuthMiddleware({ config, verifyAccessToken }),
    createRateLimiter({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMax, now }),
    createRequestValidator(config),
    createInFlightGuard(),
    quota.middleware,
  ];
  app.use("/ndvi", ...protectedMiddleware, routers.ndvi);
  app.use("/weather", ...protectedMiddleware, routers.weather);
  app.use("/ai", ...protectedMiddleware, routers.ai);

  app.use((error, _req, res, _next) => {
    const status = error?.statusCode === 403 ? 403 : 500;
    console.error(JSON.stringify({
      event: "request_error",
      status,
      code: error?.message === "CORS_ORIGIN_DENIED" ? "cors_origin_denied" : "internal_error",
    }));
    res.status(status).json({
      error: status === 403 ? "cors_origin_denied" : "internal_server_error",
    });
  });
  return app;
};

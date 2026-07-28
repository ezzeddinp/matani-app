const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseOrigins = (value) =>
  (value ?? "http://localhost:8081,http://localhost:19006")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const loadConfig = (env = process.env) => ({
  nodeEnv: env.NODE_ENV ?? "development",
  port: parsePositiveInteger(env.PORT, 5001),
  supabaseUrl: env.SUPABASE_URL?.replace(/\/$/, "") ?? "",
  supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY ?? "",
  corsAllowedOrigins: parseOrigins(env.CORS_ALLOWED_ORIGINS),
  rateLimitWindowMs: parsePositiveInteger(env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: parsePositiveInteger(env.RATE_LIMIT_MAX, 30),
  maxJsonBytes: parsePositiveInteger(env.MAX_JSON_BYTES, 65_536),
  maxBboxAreaHa: parsePositiveInteger(env.MAX_BBOX_AREA_HA, 1_000),
  aiSummaryEnabled: env.AI_SUMMARY_ENABLED === "true",
});

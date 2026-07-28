import crypto from "node:crypto";

const bearerToken = (header) => {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? "");
  return match?.[1]?.trim() ?? "";
};

export const verifySupabaseAccessToken = async (token, config, fetchImpl = fetch) => {
  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    const error = new Error("AUTH_CONFIGURATION_UNAVAILABLE");
    error.statusCode = 503;
    throw error;
  }

  const response = await fetchImpl(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.supabasePublishableKey,
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    const error = new Error("INVALID_ACCESS_TOKEN");
    error.statusCode = 401;
    throw error;
  }
  const user = await response.json();
  if (!user?.id) {
    const error = new Error("INVALID_ACCESS_TOKEN");
    error.statusCode = 401;
    throw error;
  }
  return { id: user.id, role: user.role ?? "authenticated" };
};

export const createAuthMiddleware = ({ config, verifyAccessToken }) => async (req, res, next) => {
  const token = bearerToken(req.get("authorization"));
  if (!token) return res.status(401).json({ error: "authentication_required" });

  try {
    req.auth = await verifyAccessToken(token, config);
    if (!req.auth?.id) return res.status(401).json({ error: "invalid_access_token" });
    return next();
  } catch (error) {
    const status = error?.statusCode === 503 ? 503 : 401;
    return res.status(status).json({
      error: status === 503 ? "authentication_unavailable" : "invalid_access_token",
    });
  }
};

export const createRateLimiter = ({ windowMs, max, now = Date.now }) => {
  const buckets = new Map();
  return (req, res, next) => {
    const key = `${req.auth.id}:${req.baseUrl || req.path}`;
    const timestamp = now();
    const current = buckets.get(key);
    const bucket =
      !current || timestamp - current.startedAt >= windowMs
        ? { startedAt: timestamp, count: 0 }
        : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      res.set("Retry-After", String(Math.ceil((windowMs - (timestamp - bucket.startedAt)) / 1000)));
      return res.status(429).json({ error: "rate_limit_exceeded" });
    }
    return next();
  };
};

export const createInFlightGuard = () => {
  const active = new Set();
  return (req, res, next) => {
    const bodyHash = crypto.createHash("sha256").update(JSON.stringify(req.body ?? null)).digest("hex");
    const identity =
      req.get("idempotency-key")?.trim() ||
      crypto.createHash("sha256").update(`${req.method}:${req.originalUrl}:${bodyHash}`).digest("hex");
    const key = `${req.auth.id}:${identity}`;
    if (active.has(key)) {
      return res.status(409).json({ error: "equivalent_request_in_progress" });
    }
    active.add(key);
    const release = () => active.delete(key);
    res.once("finish", release);
    res.once("close", release);
    return next();
  };
};

const approximateBboxAreaHa = ([west, south, east, north]) => {
  const latitude = ((south + north) / 2) * (Math.PI / 180);
  const widthMetres = (east - west) * 111_320 * Math.max(0.01, Math.cos(latitude));
  const heightMetres = (north - south) * 110_574;
  return Math.abs(widthMetres * heightMetres) / 10_000;
};

export const createRequestValidator = (config) => (req, res, next) => {
  if (req.baseUrl === "/weather") {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ error: "invalid_weather_coordinates" });
    }
  }
  if (req.baseUrl === "/ndvi") {
    const bbox = String(req.query.bbox ?? "").split(",").map(Number);
    const valid =
      bbox.length === 4 &&
      bbox.every(Number.isFinite) &&
      bbox[0] >= -180 && bbox[2] <= 180 &&
      bbox[1] >= -90 && bbox[3] <= 90 &&
      bbox[0] < bbox[2] && bbox[1] < bbox[3];
    if (!valid) return res.status(400).json({ error: "invalid_bbox" });
    if (approximateBboxAreaHa(bbox) > config.maxBboxAreaHa) {
      return res.status(413).json({ error: "bbox_area_limit_exceeded" });
    }
  }
  if (req.baseUrl === "/ai") {
    if (!config.aiSummaryEnabled) return res.status(503).json({ error: "ai_summary_disabled" });
    const cards = req.body?.lahanCards;
    if (!Array.isArray(cards) || cards.length > 50) {
      return res.status(400).json({ error: "invalid_lahan_cards" });
    }
  }
  return next();
};

export const createQuotaObserver = () => {
  const counters = new Map();
  const middleware = (req, _res, next) => {
    const key = `${req.auth.id}:${req.baseUrl}`;
    counters.set(key, (counters.get(key) ?? 0) + 1);
    req.quotaAdmission = { key, admittedAt: new Date().toISOString() };
    next();
  };
  return { middleware, snapshot: () => Object.fromEntries(counters.entries()) };
};

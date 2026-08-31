import express from "express";

const defaultWindow = (now = new Date()) => {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return {
    from: new Date(end.valueOf() - 31 * 86_400_000).toISOString(),
    to: end.toISOString(),
  };
};

const parseWindow = (body, maxDays, now) => {
  if (body?.from === undefined && body?.to === undefined) {
    return { ...defaultWindow(now()), isDefault: true };
  }
  const from = new Date(body?.from);
  const to = new Date(body?.to);
  const duration = to.valueOf() - from.valueOf();
  if (
    !Number.isFinite(from.valueOf()) ||
    !Number.isFinite(to.valueOf()) ||
    duration <= 0 ||
    duration > maxDays * 86_400_000
  ) {
    return null;
  }
  return { from: from.toISOString(), to: to.toISOString(), isDefault: false };
};

export const createMeasurementRouter = ({
  worker,
  defer = null,
  maxWindowDays = 31,
  now = () => new Date(),
} = {}) => {
  const router = express.Router();
  router.post("/request", async (req, res) => {
    const lahanId = req.body?.lahanId;
    if (typeof lahanId !== "string") {
      return res.status(400).json({ error: "invalid_lahan_id" });
    }
    const window = parseWindow(req.body, maxWindowDays, now);
    if (!window) return res.status(400).json({ error: "invalid_measurement_window" });
    const suppliedKey = req.get("idempotency-key")?.trim();
    const initialKey = `initial:${lahanId}`;
    const idempotencyKey = window.isDefault
      ? suppliedKey === initialKey
        ? initialKey
        : `latest:${lahanId}:${window.from}:${window.to}`
      : suppliedKey || null;
    try {
      const request = {
        lahanId,
        userId: req.auth.id,
        from: window.from,
        to: window.to,
        idempotencyKey,
      };

      if (defer && worker.enqueue && worker.process) {
        const queued = await worker.enqueue(request);
        const task = worker.process(queued).catch((error) => {
          console.error(
            JSON.stringify({
              event: "measurement_background_failed",
              requestId: req.requestId ?? null,
              jobId: queued.job?.id ?? null,
              code: error instanceof Error ? error.message : "unknown",
              diagnosticCode: error?.diagnosticCode ?? null,
            }),
          );
        });
        defer(task);
        return res.status(202).json({
          jobId: queued.job.id,
          status: queued.job.status ?? "queued",
          observationId: null,
          qualityStatus: null,
          rejectionReason: queued.job.error_code ?? null,
          reused: queued.job.status !== "queued",
        });
      }

      const result = await worker.request(request);
      const status = result.status === "processing" ? 202 : 200;
      return res.status(status).json(result);
    } catch (error) {
      if (error?.statusCode === 404) {
        return res.status(404).json({ error: "measurement_field_not_found" });
      }
      if (error?.statusCode === 503) {
        return res.status(503).json({ error: "measurement_configuration_unavailable" });
      }
      if (error?.statusCode === 429) {
        return res.status(429).json({ error: "measurement_provider_rate_limited" });
      }
      return res.status(502).json({ error: "measurement_provider_unavailable" });
    }
  });
  return router;
};

export default createMeasurementRouter({
  worker: {
    async request() {
      const error = new Error("MEASUREMENT_ADMIN_CONFIGURATION_UNAVAILABLE");
      error.statusCode = 503;
      throw error;
    },
  },
});

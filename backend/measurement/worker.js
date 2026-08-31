import { geometryHash, validateFieldGeometry } from "./geometry.js";
import { MEASUREMENT_VERSIONS } from "./cdse-process-adapter.js";

const safeErrorCode = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("cdse-")) return "provider-unavailable";
  if (message.startsWith("process-")) return "provider-response-invalid";
  if (message.startsWith("geometry-") || message.startsWith("polygon-")) {
    return "geometry-unusable";
  }
  return "measurement-processing-failed";
};

const safeErrorMessage = (error) => {
  const code = safeErrorCode(error);
  if (code === "provider-unavailable") return "Satellite provider was unavailable.";
  if (code === "provider-response-invalid") return "Satellite provider response was invalid.";
  if (code === "geometry-unusable") return "Field geometry could not be processed.";
  return "Measurement processing failed.";
};

const safeDiagnosticCode = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  return /^(?:cdse-(?:token|catalog|process)-(?:network|timeout|failed-[1-5][0-9]{2})|process-[a-z0-9-]+|catalog-acquisition-date-invalid|unsupported-measurement-index)$/.test(
    message,
  )
    ? message
    : "measurement-unclassified-failure";
};

const runtimeStage = ({ jobId, stage }) => {
  console.info(JSON.stringify({ event: "measurement_stage", jobId, stage }));
};

export const createMeasurementWorker = ({ admin, provider } = {}) => {
  const enqueue = async ({ lahanId, userId, from, to, idempotencyKey }) => {
    const field = await admin.loadField({ lahanId, userId });
    const geometry = validateFieldGeometry(field.geojson);
    const cacheIdentity = [
      lahanId,
      geometryHash(geometry),
      from,
      to,
      MEASUREMENT_VERSIONS.algorithm,
      MEASUREMENT_VERSIONS.evalscript,
      MEASUREMENT_VERSIONS.masking,
      MEASUREMENT_VERSIONS.executor,
    ].join(":");
    const effectiveIdempotencyKey = idempotencyKey === `initial:${lahanId}`
      ? idempotencyKey
      : cacheIdentity;
    const enqueued = await admin.enqueue({
      lahanId,
      userId,
      from,
      to,
      idempotencyKey: effectiveIdempotencyKey,
    });
    const queuedJob = Array.isArray(enqueued) ? enqueued[0] : enqueued;
    if (!queuedJob?.id) {
      const error = new Error("MEASUREMENT_JOB_ENQUEUE_INVALID");
      error.statusCode = 503;
      throw error;
    }

    return {
      job: queuedJob,
      geometry,
      userId,
      from: queuedJob.request_window_start ?? from,
      to: queuedJob.request_window_end ?? to,
    };
  };

  const process = async ({ job: queuedJob, geometry, userId, from, to }) => {
    const claim = await admin.claim({ jobId: queuedJob.id, userId });
    const job = claim?.job ?? null;
    if (!claim?.claimed || !job?.id) {
      return {
        jobId: job?.id ?? null,
        status: job?.status ?? "unavailable",
        observationId: null,
        qualityStatus: null,
        rejectionReason: job?.error_code ?? null,
        reused: true,
      };
    }

    let result;
    try {
      runtimeStage({ jobId: job.id, stage: "provider_started" });
      result = await provider.measure({
        geometry,
        from,
        to,
        onStage: (stage) => runtimeStage({ jobId: job.id, stage }),
      });
      runtimeStage({ jobId: job.id, stage: "provider_completed" });
    } catch (error) {
      await admin.fail({
        jobId: job.id,
        errorCode: safeErrorCode(error),
        errorMessage: safeErrorMessage(error),
      });
      const routed = new Error(safeErrorCode(error));
      routed.statusCode = error?.statusCode === 429 ? 429 : 502;
      routed.diagnosticCode = safeDiagnosticCode(error);
      throw routed;
    }

    try {
      const observationId = await admin.complete({ jobId: job.id, result });
      runtimeStage({ jobId: job.id, stage: "persistence_completed" });
      return {
        jobId: job.id,
        status: "succeeded",
        observationId,
        qualityStatus: result.quality_status,
        rejectionReason: result.rejection_reason,
        acquisitionStart: result.acquisition_start,
        reused: false,
      };
    } catch (error) {
      await admin.fail({
        jobId: job.id,
        errorCode: "measurement-persistence-failed",
        errorMessage: "Measurement persistence failed.",
      });
      const routed = new Error("measurement-persistence-failed");
      routed.statusCode = 502;
      routed.diagnosticCode = /^measurement-database-failed-[1-5][0-9]{2}$/.test(
        error instanceof Error ? error.message : "",
      )
        ? error.message
        : "measurement-database-unclassified-failure";
      throw routed;
    }
  };

  return {
    enqueue,
    process,
    async request(args) {
      return process(await enqueue(args));
    },
  };
};

const sanitizedAdminError = (label, status) => {
  const error = new Error(`${label}-failed-${status}`);
  error.statusCode = status;
  return error;
};

export const createSupabaseMeasurementAdmin = ({
  supabaseUrl,
  adminKey,
  fetchImpl = fetch,
  timeoutMs = 10_000,
} = {}) => {
  const assertConfigured = () => {
    if (!supabaseUrl || !adminKey) {
      const error = new Error("MEASUREMENT_ADMIN_CONFIGURATION_UNAVAILABLE");
      error.statusCode = 503;
      throw error;
    }
  };

  const request = async (path, options = {}) => {
    assertConfigured();
    const headers = new Headers(options.headers);
    headers.set("apikey", adminKey);
    if (!adminKey.startsWith("sb_secret_")) {
      headers.set("Authorization", `Bearer ${adminKey}`);
    }
    if (options.body) headers.set("Content-Type", "application/json");
    const response = await fetchImpl(`${supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw sanitizedAdminError("measurement-database", response.status);
    const body = await response.text();
    return body ? JSON.parse(body) : null;
  };

  const rpc = (name, body) =>
    request(`rpc/${name}`, { method: "POST", body: JSON.stringify(body) });

  return {
    async loadField({ lahanId, userId }) {
      const query = new URLSearchParams({
        select: "id,user_id,name,geojson,area_ha,category",
        id: `eq.${lahanId}`,
        user_id: `eq.${userId}`,
        limit: "1",
      });
      const rows = await request(`lahan_with_info?${query}`);
      const field = rows?.[0] ?? null;
      if (!field) {
        const error = new Error("MEASUREMENT_FIELD_NOT_FOUND");
        error.statusCode = 404;
        throw error;
      }
      if (typeof field.geojson === "string") field.geojson = JSON.parse(field.geojson);
      return field;
    },

    enqueue({ lahanId, userId, from, to, idempotencyKey }) {
      return rpc("enqueue_measurement_job", {
        p_lahan_id: lahanId,
        p_user_id: userId,
        p_request_window_start: from,
        p_request_window_end: to,
        p_idempotency_key: idempotencyKey,
      });
    },

    claim({ jobId, userId }) {
      return rpc("claim_measurement_job", {
        p_job_id: jobId,
        p_user_id: userId,
      });
    },

    complete({ jobId, result }) {
      return rpc("complete_measurement_job", {
        p_job_id: jobId,
        p_result: result,
      });
    },

    fail({ jobId, errorCode, errorMessage }) {
      return rpc("fail_measurement_job", {
        p_job_id: jobId,
        p_error_code: errorCode,
        p_error_message: errorMessage,
      });
    },
  };
};

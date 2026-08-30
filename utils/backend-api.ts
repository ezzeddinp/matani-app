import { supabase } from "@/hooks/supabase";
import { API_BASE_CANDIDATES } from "@/hooks/config";

export const BACKEND_DEPLOYMENT_PROTECTED = "BACKEND_DEPLOYMENT_PROTECTED";
export const BACKEND_NON_JSON_RESPONSE = "BACKEND_NON_JSON_RESPONSE";

export class BackendResponseError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly requestUrl: string
  ) {
    super(code);
    this.name = "BackendResponseError";
  }
}

const isVercelProtectionResponse = (response: Response, body: string) =>
  response.url.includes("vercel.com/sso-api") ||
  /vercel authentication|_vercel_sso_nonce|sso-api/i.test(body);

export const readBackendJson = async <T>(response: Response): Promise<T> => {
  const body = await response.text();
  const requestUrl = response.url || "backend";

  if (isVercelProtectionResponse(response, body)) {
    throw new BackendResponseError(
      BACKEND_DEPLOYMENT_PROTECTED,
      response.status,
      requestUrl
    );
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new BackendResponseError(
      BACKEND_NON_JSON_RESPONSE,
      response.status,
      requestUrl
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new BackendResponseError(
      BACKEND_NON_JSON_RESPONSE,
      response.status,
      requestUrl
    );
  }

  if (!response.ok) {
    const errorCode =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : `BACKEND_HTTP_${response.status}`;
    throw new BackendResponseError(errorCode, response.status, requestUrl);
  }

  return payload as T;
};

export const describeBackendError = (error: unknown) => {
  if (error instanceof BackendResponseError) {
    if (error.code === BACKEND_DEPLOYMENT_PROTECTED) {
      return "Backend publik sedang dilindungi Vercel dan tidak dapat diakses aplikasi.";
    }
    if (error.code === BACKEND_NON_JSON_RESPONSE) {
      return "Backend mengembalikan respons yang tidak valid.";
    }
    return `Backend menolak permintaan (${error.code}).`;
  }
  return error instanceof Error ? error.message : String(error);
};

export const retainMostUsefulBackendError = (
  currentMessage: string,
  error: unknown
) => {
  const nextMessage = describeBackendError(error);
  if (currentMessage.includes("dilindungi Vercel")) {
    return currentMessage;
  }
  return nextMessage;
};

const fetchWithAccessToken = (
  input: string,
  init: RequestInit,
  accessToken: string
) => {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(input, { ...init, headers });
};

export const authenticatedBackendFetch = async (
  input: string,
  init: RequestInit = {}
): Promise<Response> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("AUTH_SESSION_REQUIRED");

  const response = await fetchWithAccessToken(input, init, accessToken);
  if (response.status !== 401) {
    return response;
  }

  const { data: refreshed, error: refreshError } =
    await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session?.access_token) {
    return response;
  }

  return fetchWithAccessToken(input, init, refreshed.session.access_token);
};

export type MeasurementRequestResult = {
  jobId: string | null;
  status: "queued" | "processing" | "succeeded" | "failed" | "unavailable";
  observationId: string | null;
  qualityStatus: "passed" | "rejected" | "unavailable" | null;
  rejectionReason: string | null;
  acquisitionStart?: string | null;
  reused: boolean;
};

export const requestLahanMeasurement = async (
  lahanId: string,
  options: { initial?: boolean } = {}
): Promise<MeasurementRequestResult> => {
  let lastError: unknown = new Error("MEASUREMENT_BACKEND_UNAVAILABLE");
  const seen = new Set<string>();
  const idempotencyKey = options.initial
    ? `initial:${lahanId}`
    : `refresh:${lahanId}`;
  for (const baseUrl of API_BASE_CANDIDATES) {
    const normalized = baseUrl.replace(/\/$/, "");
    const candidates = [`${normalized}/measurements/request`];
    if (!/\/api\/?$/.test(normalized)) {
      candidates.push(`${normalized}/api/measurements/request`);
    }
    for (const url of candidates) {
      if (seen.has(url)) continue;
      seen.add(url);
      try {
        const response = await authenticatedBackendFetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({ lahanId }),
        });
        return await readBackendJson<MeasurementRequestResult>(response);
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError;
};

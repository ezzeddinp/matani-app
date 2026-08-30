const headerValue = (headers, name) => headers[name.toLowerCase()] ?? "";

const parseHeaders = (buffer) => {
  const headers = {};
  for (const line of buffer.toString("utf8").split("\r\n")) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    headers[line.slice(0, separator).trim().toLowerCase()] = line
      .slice(separator + 1)
      .trim();
  }
  return headers;
};

export const parseMultipartBuffer = (buffer, contentType) => {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType ?? "");
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
  if (!boundary) throw new Error("process-response-boundary-missing");

  const marker = Buffer.from(`--${boundary}`);
  const nextMarker = Buffer.from(`\r\n--${boundary}`);
  const headerSeparator = Buffer.from("\r\n\r\n");
  const parts = [];
  let cursor = buffer.indexOf(marker);
  while (cursor >= 0) {
    cursor += marker.length;
    if (buffer.slice(cursor, cursor + 2).toString() === "--") break;
    if (buffer.slice(cursor, cursor + 2).toString() === "\r\n") cursor += 2;
    const headersEnd = buffer.indexOf(headerSeparator, cursor);
    if (headersEnd < 0) throw new Error("process-response-headers-invalid");
    const headers = parseHeaders(buffer.slice(cursor, headersEnd));
    const bodyStart = headersEnd + headerSeparator.length;
    const bodyEnd = buffer.indexOf(nextMarker, bodyStart);
    if (bodyEnd < 0) throw new Error("process-response-part-incomplete");
    parts.push({ headers, body: buffer.slice(bodyStart, bodyEnd) });
    cursor = bodyEnd + 2;
  }
  return parts;
};

export const extractProcessParts = async (response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const error = new Error(`cdse-process-failed-${response.status}`);
    error.statusCode = response.status;
    error.retryAfterSeconds = Number(response.headers.get("retry-after")) || null;
    throw error;
  }
  if (!contentType.toLowerCase().includes("multipart/mixed")) {
    throw new Error("process-response-not-multipart");
  }
  const raw = Buffer.from(await response.arrayBuffer());
  const parts = parseMultipartBuffer(raw, contentType);
  const result = { raster: null, userdata: null };
  for (const part of parts) {
    const type = headerValue(part.headers, "content-type").toLowerCase();
    const disposition = headerValue(part.headers, "content-disposition").toLowerCase();
    if (type.includes("application/json") || disposition.includes("userdata")) {
      try {
        result.userdata = JSON.parse(part.body.toString("utf8"));
      } catch {
        throw new Error("process-userdata-invalid-json");
      }
    } else if (type.includes("image/tiff") || disposition.includes(".tif")) {
      result.raster = part.body;
    }
  }
  if (!result.raster || !result.userdata) {
    throw new Error("process-response-required-part-missing");
  }
  return result;
};


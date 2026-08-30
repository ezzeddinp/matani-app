import { readFile } from "node:fs/promises";

const parseEnv = (content) =>
  Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const rawValue = line.slice(separator + 1).trim();
        const value =
          (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
          (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue;
        return [line.slice(0, separator).trim(), value];
      })
  );

const readEnv = async (path) => {
  try {
    return parseEnv(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
};

const decodeJwtRole = (value) => {
  if (!value?.startsWith("eyJ")) return null;
  try {
    const payload = value.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
    return typeof parsed.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
};

const classifySupabaseKey = (value) => {
  if (!value) return "missing";
  if (value.startsWith("sb_publishable_")) return "publishable";
  if (value.startsWith("sb_secret_")) return "secret";
  return decodeJwtRole(value) ?? "unknown";
};

const client = await readEnv(".env");
const server = await readEnv("backend/.env");
const findings = [];
let unsafe = false;

const publicSecretPattern = /(SECRET|SERVICE_ROLE|PRIVATE|CLIENT_SECRET|GENERATIVE_AI|ACCUWEATHER)/i;
for (const name of Object.keys(client)) {
  if (name.startsWith("EXPO_PUBLIC_") && publicSecretPattern.test(name)) {
    unsafe = true;
    findings.push(`${name}: unsafe public secret name`);
  }
}

const clientKeyClass = classifySupabaseKey(
  client.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
const serverKeyClass = classifySupabaseKey(server.SUPABASE_PUBLISHABLE_KEY);
const serverAdminKeyClass = classifySupabaseKey(
  server.SUPABASE_SECRET_KEY || server.SUPABASE_SERVICE_ROLE_KEY
);
if (!["publishable", "anon", "missing"].includes(clientKeyClass)) unsafe = true;
if (!["publishable", "anon", "missing"].includes(serverKeyClass)) unsafe = true;
if (!["secret", "service_role", "missing"].includes(serverAdminKeyClass)) unsafe = true;

findings.push(`client Supabase key class: ${clientKeyClass}`);
findings.push(`backend Supabase key class: ${serverKeyClass}`);
findings.push(`backend Supabase admin key class: ${serverAdminKeyClass}`);
findings.push(
  `server-only Sentinel credential location: ${
    server.SENTINEL_CLIENT_SECRET ? "backend only" : "missing"
  }`
);
findings.push(
  `server-only Gemini credential location: ${
    server.GOOGLE_GENERATIVE_AI_API_KEY ? "backend only" : "missing"
  }`
);
findings.push(
  `Google Maps key presence: iOS=${Boolean(client.GOOGLE_MAPS_API_KEY_IOS)}, Android=${Boolean(
    client.GOOGLE_MAPS_API_KEY_ANDROID
  )}; platform restrictions require console verification`
);

for (const finding of findings) console.log(finding);
if (unsafe) {
  console.error("Environment boundary audit failed.");
  process.exitCode = 1;
} else {
  console.log("Environment boundary audit passed without printing credential values.");
}

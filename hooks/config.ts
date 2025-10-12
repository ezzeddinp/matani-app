import Constants from "expo-constants";
import { Platform } from "react-native";
const resolveHost = () => {
  if (process.env.EXPO_PUBLIC_API_HOST) {
    return process.env.EXPO_PUBLIC_API_HOST;
  }

  const hostUri = Constants.expoConfig?.hostUri ?? "";
  const manifestHost = hostUri ? hostUri.split(":")[0] : undefined;
  if (manifestHost) {
    return manifestHost;
  }

  // 👇 fix di sini
  const manifestExtras =
    ((Constants as any).manifest2?.extra ??
      (Constants.expoConfig as any)?.extra) || {};

  const manifestExtraHost = manifestExtras.apiHost;
  if (manifestExtraHost) {
    return String(manifestExtraHost);
  }

  return Platform.OS === "android" ? "10.0.2.2" : "localhost";
};

// @ts-nocheck
const resolvePort = () => {
  if (process.env.EXPO_PUBLIC_API_PORT) {
    return process.env.EXPO_PUBLIC_API_PORT;
  }

  const manifestExtras =
    ((Constants as any).manifest2?.extra ??
      (Constants.expoConfig as any)?.extra) || {};

  const portFromExtra = manifestExtras.apiPort;
  if (portFromExtra) {
    return String(portFromExtra);
  }

  return Platform.select({
    ios: "5001",
    android: "5001",
    macos: "5001",
    default: "5001",
  });
};

export { resolvePort };
const publicApiUrl = process.env.EXPO_PUBLIC_API_URL;

// fallback ke dev mode
const protocol = process.env.EXPO_PUBLIC_API_PROTOCOL ?? "http";
const host = resolveHost();
const port = resolvePort();

const localBaseUrl = `${protocol}://${host}${port ? `:${port}` : ""}`;
export const BASE_URL = publicApiUrl ?? localBaseUrl;

const candidates = new Set<string>([BASE_URL]);
if (publicApiUrl && publicApiUrl !== localBaseUrl) {
  candidates.add(localBaseUrl);
}

export const API_BASE_CANDIDATES = Array.from(candidates);

console.log("🌍 BASE_URL =>", BASE_URL);
console.log("🌐 API candidates =>", API_BASE_CANDIDATES);

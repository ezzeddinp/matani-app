// backend/sentinelAuth.js
import fetch from "node-fetch";

let cachedToken = null;
let tokenExpiry = 0;

export async function getSentinelToken() {
  const now = Date.now();

  // kalau token masih valid, pakai ulang
  if (cachedToken && now < tokenExpiry) {
    console.log("🔑 Using cached token (valid until:", new Date(tokenExpiry).toISOString(), ")");
    return cachedToken;
  }

  try {
    console.log("🔐 Requesting new Sentinel Hub token...");
    
    // request token baru
    const response = await fetch(
      process.env.SENTINEL_TOKEN_URL ||
        "https://services.sentinel-hub.com/oauth/token",
      {
      method: "POST",
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.SENTINEL_CLIENT_ID || "",
        client_secret: process.env.SENTINEL_CLIENT_SECRET || ""
      })
      }
    );

    console.log("🔐 Token request status:", response.status);

    if (!response.ok) {
      console.error("❌ Token request failed:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("❌ Token error response:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.access_token) {
      console.error("❌ No access token received in response");
      throw new Error("No access token received");
    }

    console.log("✅ Token received successfully. Expires in:", data.expires_in, "seconds");
    
    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in - 60) * 1000; // refresh 1 menit sebelum expired
    
    return cachedToken;
  } catch (error) {
    console.error('❌ Error getting Sentinel token:', error);
    throw error;
  }
}

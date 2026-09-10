import assert from "node:assert/strict";
import test from "node:test";
import { auditEnvBoundaries } from "../scripts/audit-env-boundaries.mjs";

test("provider credentials in client env fail without an Expo public prefix", () => {
  const secret = "fixture-provider-secret-do-not-print";
  const result = auditEnvBoundaries({ SENTINEL_CLIENT_SECRET: secret }, { SENTINEL_CLIENT_SECRET: secret });
  assert.equal(result.unsafe, true);
  assert.ok(result.findings.some((line) => line.includes("unsafe client placement")));
  assert.ok(!JSON.stringify(result).includes(secret));
});

test("privileged Supabase values under misleading client names fail", () => {
  for (const value of ["sb_secret_fixture", `eyJfixture.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.fixture`]) {
    const result = auditEnvBoundaries({ EXPO_PUBLIC_OTHER_KEY: value }, {});
    assert.equal(result.unsafe, true);
    assert.ok(!JSON.stringify(result).includes(value));
  }
});

test("public secret names and unknown client key formats fail", () => {
  assert.equal(auditEnvBoundaries({ EXPO_PUBLIC_PRIVATE_KEY: "fixture" }, {}).unsafe, true);
  assert.equal(auditEnvBoundaries({ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "unrecognized" }, {}).unsafe, true);
});

test("publishable client and server-only admin credentials preserve the boundary", () => {
  const result = auditEnvBoundaries({ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture" }, { SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture", SUPABASE_SECRET_KEY: "sb_secret_fixture" });
  assert.equal(result.unsafe, false);
  assert.ok(result.findings.includes("backend Supabase admin key class: secret"));
});

test("missing credentials remain visible rather than implying hosted readiness", () => {
  const result = auditEnvBoundaries({}, {});
  assert.equal(result.unsafe, false);
  assert.ok(result.findings.includes("backend Supabase admin key class: missing"));
});

test("map key audit reports Android, iOS, and Web configuration without printing keys", () => {
  const androidKey = "fixture-android-map-key";
  const iosKey = "fixture-ios-map-key";
  const webKey = "fixture-web-map-key";
  const result = auditEnvBoundaries(
    {
      GOOGLE_MAPS_API_KEY_ANDROID: androidKey,
      GOOGLE_MAPS_API_KEY_IOS: iosKey,
      GOOGLE_MAPS_API_KEY_WEB: webKey,
    },
    {},
  );

  assert.ok(result.findings.some((line) => line.includes("Android=true, iOS=true, Web=true")));
  assert.ok(result.findings.some((line) => line.includes("scope separation: distinct=true")));
  assert.ok(!JSON.stringify(result).includes(androidKey));
  assert.ok(!JSON.stringify(result).includes(iosKey));
  assert.ok(!JSON.stringify(result).includes(webKey));

  const reusedResult = auditEnvBoundaries(
    {
      GOOGLE_MAPS_API_KEY_ANDROID: androidKey,
      GOOGLE_MAPS_API_KEY_IOS: iosKey,
      GOOGLE_MAPS_API_KEY_WEB: androidKey,
    },
    {},
  );
  assert.ok(reusedResult.findings.some((line) => line.includes("scope separation: distinct=false")));
  assert.ok(!JSON.stringify(reusedResult).includes(androidKey));
});

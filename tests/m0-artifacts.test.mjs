import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("backend AI is disabled by default in the environment contract", async () => {
  const envExample = await readFile("backend/.env.example", "utf8");
  assert.match(envExample, /^AI_SUMMARY_ENABLED=false$/m);
});

test("versioned migration enables RLS and uses a security-invoker view", async () => {
  const migration = await readFile(
    "supabase/migrations/20260728000100_m0_baseline.sql",
    "utf8"
  );
  for (const table of ["users", "lahan", "lahan_thumbnails", "lahan_health", "lahan_notes"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(migration, /with \(security_invoker = true\)/i);
});

test("ordinary verification commands contain no live provider invocation", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const verification = [
    packageJson.scripts.lint,
    packageJson.scripts.typecheck,
    packageJson.scripts.test,
    packageJson.scripts["test:backend"],
    packageJson.scripts["test:research"],
  ].join(" ");
  assert.doesNotMatch(verification, /sentinel|accuweather|open-meteo|gemini/i);
});

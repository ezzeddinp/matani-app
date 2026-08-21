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

test("latest scope migration accepts only padi without relabeling legacy crops", async () => {
  const migration = await readFile(
    "supabase/migrations/20260821000100_padi_only_scope.sql",
    "utf8"
  );
  assert.match(
    migration,
    /legacy_category\s*=\s*coalesce\(legacy_category, category\)/i
  );
  assert.match(migration, /category\s*=\s*null/i);
  assert.match(migration, /lower\(category\)\s*=\s*'padi'/i);
  assert.doesNotMatch(migration, /category\s*=\s*'padi'/i);
});

test("field detail reads stored observations and contains no synthetic diagnosis", async () => {
  const detail = await readFile("app/detail-lahan-page.tsx", "utf8");
  assert.match(detail, /from\("lahan_health"\)/);
  assert.match(detail, /Deret waktu observasi/);
  assert.doesNotMatch(
    detail,
    /buildNdviSeries|computeSynthetic|pestPressure|diseaseRisk|stressIndex/
  );
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

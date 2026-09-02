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

test("field detail reads M2 measurements and contains no synthetic diagnosis", async () => {
  const detail = await readFile("app/detail-lahan-page.tsx", "utf8");
  assert.match(detail, /from\("measurement_observations"\)/);
  assert.match(detail, /from\("measurement_jobs"\)/);
  assert.match(detail, /Deret waktu observasi/);
  assert.match(detail, /setDetail\(field\)/);
  assert.match(detail, /if \(observationResult\.error\)/);
  assert.match(detail, /Jalankan pengukuran/);
  assert.match(detail, /select\("status,attempts,error_code,created_at,updated_at"\)/);
  assert.match(detail, /queuedWithoutAttempt/);
  assert.match(detail, /Jalankan job antrean/);
  assert.doesNotMatch(
    detail,
    /buildNdviSeries|computeSynthetic|pestPressure|diseaseRisk|stressIndex/
  );
});

test("M2 migration enforces durable jobs, provenance, RLS, and idempotency", async () => {
  const migration = await readFile(
    "supabase/migrations/20260830000100_m2_measurement_pipeline.sql",
    "utf8"
  );
  for (const table of ["measurement_jobs", "measurements", "measurement_index_stats"]) {
    assert.match(migration, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(migration, /unique \(user_id, idempotency_key\)/i);
  assert.match(migration, /measurements_source_identity_check/i);
  assert.match(migration, /create view public\.measurement_observations[\s\S]*security_invoker/i);
  assert.match(migration, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(migration, /grant (insert|update|delete)[\s\S]*to authenticated/i);
});

test("field save requests persisted measurement and has no render-triggered bbox prototype", async () => {
  const explore = await readFile("app/(tabs)/explore.tsx", "utf8");
  const backendClient = await readFile("utils/backend-api.ts", "utf8");
  assert.match(
    explore,
    /requestLahanMeasurement\(savedEntry\.id, \{ initial: true \}\)/,
  );
  assert.match(explore, /await requestLahanMeasurement/);
  assert.match(explore, /measurementAccepted/);
  assert.match(explore, /from\("measurement_observations"\)/);
  assert.doesNotMatch(explore, /fetchNdviStatistic|createNdviRecordFromStatistic/);
  assert.match(backendClient, /\/measurements\/request/);
  assert.match(backendClient, /Idempotency-Key/);
});

test("field map remains pannable and keeps drawing actions at the top", async () => {
  const explore = await readFile("app/(tabs)/explore.tsx", "utf8");
  assert.match(explore, /scrollEnabled=\{true\}/);
  assert.doesNotMatch(explore, /scrollEnabled=\{drawingMode\s*\?/);
  assert.match(explore, /\{!drawingMode && \(\s*<View style=\{styles\.searchContainer\}/);
  assert.match(explore, /drawingControlsOverlay:\s*\{[\s\S]*?top:\s*76,/);
});

test("mobile provider calls reject protected HTML and recover stale sessions", async () => {
  const backendClient = await readFile("utils/backend-api.ts", "utf8");
  const config = await readFile("hooks/config.ts", "utf8");
  const supabaseClient = await readFile("hooks/supabase.ts", "utf8");
  const providerScreens = await Promise.all(
    ["app/(tabs)/index.tsx", "app/(tabs)/weather.tsx", "app/(tabs)/explore.tsx"].map(
      (file) => readFile(file, "utf8")
    )
  );

  assert.match(backendClient, /BACKEND_DEPLOYMENT_PROTECTED/);
  assert.match(supabaseClient, /process\.env\.EXPO_PUBLIC_SUPABASE_URL/);
  assert.match(supabaseClient, /process\.env\.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(supabaseClient, /NEXT_PUBLIC_SUPABASE/);
  assert.match(backendClient, /content-type/);
  assert.match(backendClient, /refreshSession\(\)/);
  assert.match(config, /resolveManifestHost\(\)/);
  assert.match(supabaseClient, /PGRST303/);
  assert.match(supabaseClient, /runSupabaseReadWithSessionRecovery/);
  providerScreens.forEach((screen) => assert.match(screen, /readBackendJson/));
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

test("selected-field weather ignores an older request that resolves last", async () => {
  const home = await readFile("app/(tabs)/index.tsx", "utf8");
  const effect = home.slice(
    home.indexOf("// Update weather based on selected lahan"),
    home.indexOf("const selectedLahanHealth")
  );

  assert.match(effect, /let active = true;/);
  assert.match(effect, /await lahanService\.getLahanDetail[\s\S]*?if \(!active\) return;/);
  assert.match(effect, /await Location\.reverseGeocodeAsync[\s\S]*?if \(!active\) return;/);
  assert.match(effect, /await fetchWeatherData[\s\S]*?if \(!active\) return;/);
  assert.match(effect, /finally \{\s*if \(active\) setLoading\(false\);/);
  assert.match(effect, /return \(\) => \{\s*active = false;/);

  const deferred = () => {
    let resolve;
    const promise = new Promise((done) => {
      resolve = done;
    });
    return { promise, resolve };
  };
  const commits = [];
  let cleanup = () => {};
  const select = (id, request) => {
    cleanup();
    let active = true;
    void request.promise.then(() => {
      if (active) commits.push(id);
    });
    cleanup = () => {
      active = false;
    };
  };
  const older = deferred();
  const newer = deferred();

  select("field-a", older);
  select("field-b", newer);
  newer.resolve();
  await newer.promise;
  older.resolve();
  await older.promise;

  assert.deepEqual(commits, ["field-b"]);
});

test("React Doctor performance cleanup keeps scoped mobile contracts", async () => {
  const [home, explore, detail, onboarding] = await Promise.all(
    [
      "app/(tabs)/index.tsx",
      "app/(tabs)/explore.tsx",
      "app/detail-lahan-page.tsx",
      "app/onboarding.tsx",
    ].map((file) => readFile(file, "utf8"))
  );

  for (const source of [home, explore, detail]) {
    assert.equal(source.match(/new Intl\.DateTimeFormat/g)?.length, 1);
  }
  assert.match(explore, /<ExpoImage[\s\S]*cachePolicy="memory-disk"/);
  assert.match(explore, /source=\{resolveLahanThumbnailSource\(card\)\}/);
  assert.match(onboarding, /<Image source=\{LOGO_SOURCE\}/);
  assert.match(onboarding, /<ExpoImage[\s\S]*source=\{\{ uri: HERO_IMAGE_URI \}\}[\s\S]*cachePolicy="memory-disk"/);
  assert.match(home, /<FlatList[\s\S]*data=\{savedLahan\}[\s\S]*keyExtractor=\{\(item\) => item\.id\}/);
});

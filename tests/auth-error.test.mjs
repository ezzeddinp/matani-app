import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("signup maps internal Supabase failures to safe user-facing copy", async () => {
  const { getLoginErrorMessage, getSignUpErrorMessage } = await import(
    "../utils/auth-error.ts"
  );
  const signup = await readFile("app/auth/signup.tsx", "utf8");

  assert.equal(
    getSignUpErrorMessage({
      name: "AuthRetryableFetchError",
      status: 500,
      message: '{"url":"https://project.supabase.co/auth/v1/signup"}',
    }),
    "Layanan pendaftaran sedang bermasalah. Silakan coba lagi beberapa saat.",
  );
  assert.equal(
    getSignUpErrorMessage({ code: "user_already_exists" }),
    "Email sudah terdaftar. Silakan masuk atau gunakan email lain.",
  );
  assert.equal(
    getSignUpErrorMessage({ message: "unrecognized internal detail" }),
    "Akun belum dapat dibuat. Periksa data Anda, lalu coba lagi.",
  );
  assert.equal(
    getLoginErrorMessage({ code: "invalid_credentials" }),
    "Email atau password salah.",
  );
  assert.equal(
    getLoginErrorMessage({ name: "AuthRetryableFetchError", status: 503 }),
    "Layanan masuk sedang bermasalah. Periksa koneksi, lalu coba lagi.",
  );
  assert.match(signup, /getSignUpErrorMessage\(error\)/);
  assert.doesNotMatch(signup, /setErrorMessage\(errorMessage/);
  assert.doesNotMatch(signup, /console\.error\([^\n]*Sign up error/);
});

test("mobile auth persists sessions and handles email verification redirects", async () => {
  const supabaseClient = await readFile("hooks/supabase.ts", "utf8");
  const callback = await readFile("app/auth/callback.tsx", "utf8");
  const login = await readFile("app/auth/login.tsx", "utf8");

  assert.match(supabaseClient, /storage: AsyncStorage/);
  assert.match(supabaseClient, /persistSession: true/);
  assert.match(supabaseClient, /exchangeCodeForSession\(code\)/);
  assert.match(supabaseClient, /setSession\(\{/);
  assert.match(callback, /completeEmailRedirect\(incomingUrl\)/);
  assert.match(login, /getLoginErrorMessage\(error\)/);
  assert.doesNotMatch(login, /console\.error\([^\n]*Sign in error/);
  assert.doesNotMatch(login, /rememberMe|Lupa password/);
});

test("Vercel backend project exposes a directly detectable Express app", async () => {
  const vercelConfig = JSON.parse(await readFile("backend/vercel.json", "utf8"));
  const entrypoint = await readFile("backend/app.js", "utf8");
  const backendPackage = JSON.parse(await readFile("backend/package.json", "utf8"));

  assert.equal(vercelConfig.functions["app.js"].maxDuration, 300);
  assert.match(entrypoint, /import express from "express"/);
  assert.match(entrypoint, /export default createApp\(\)/);
  assert.equal(backendPackage.scripts.build, "tsc --noEmit");
});

test("auth fields keep mobile keyboard focus stable", async () => {
  const authScreen = await readFile("components/auth/auth-screen.tsx", "utf8");
  const signup = await readFile("app/auth/signup.tsx", "utf8");

  assert.match(authScreen, /keyboardDismissMode="none"/);
  assert.match(authScreen, /keyboardShouldPersistTaps="always"/);
  assert.match(signup, /importantForAutofill="no"/);
  assert.match(signup, /submitBehavior="submit"/);
  assert.match(signup, /requestAnimationFrame\(\(\) => passwordRef\.current\?\.focus\(\)\)/);
  assert.doesNotMatch(authScreen, /setFocused|fieldShellFocused/);
  assert.doesNotMatch(authScreen, /onFocus=\{[^}]*setFocused/);
  assert.doesNotMatch(signup, /textContentType=/);
});

test("auth migration keeps optional profile collisions from aborting signup", async () => {
  const migration = await readFile(
    "supabase/migrations/20260907000100_auth_signup_profile_collision.sql",
    "utf8",
  );

  assert.match(migration, /create or replace function public\.handle_new_user/i);
  assert.match(migration, /requested_username := null/i);
  assert.match(migration, /requested_phone_number := null/i);
  assert.match(migration, /when unique_violation/i);
  assert.match(migration, /users_username_key/);
  assert.match(migration, /users_phone_number_key/);
  assert.doesNotMatch(migration, /exception\s+when others/i);
});

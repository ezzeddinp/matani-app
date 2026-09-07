import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("signup maps internal Supabase failures to safe user-facing copy", async () => {
  const { getSignUpErrorMessage } = await import("../utils/auth-error.ts");
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
  assert.match(signup, /getSignUpErrorMessage\(error\)/);
  assert.doesNotMatch(signup, /setErrorMessage\(errorMessage/);
  assert.doesNotMatch(signup, /console\.error\([^\n]*Sign up error/);
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

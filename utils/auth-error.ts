type AuthErrorLike = {
  code?: unknown;
  message?: unknown;
  name?: unknown;
  status?: unknown;
};

const readAuthError = (error: unknown): AuthErrorLike =>
  typeof error === "object" && error !== null ? (error as AuthErrorLike) : {};

export const getSignUpErrorMessage = (error: unknown): string => {
  const authError = readAuthError(error);
  const code = typeof authError.code === "string" ? authError.code.toLowerCase() : "";
  const name = typeof authError.name === "string" ? authError.name : "";
  const status = typeof authError.status === "number" ? authError.status : 0;
  const message =
    typeof authError.message === "string" ? authError.message.toLowerCase() : "";

  if (
    code === "user_already_exists" ||
    message.includes("user already registered") ||
    message.includes("email already registered")
  ) {
    return "Email sudah terdaftar. Silakan masuk atau gunakan email lain.";
  }

  if (code === "weak_password" || message.includes("password should be")) {
    return "Password belum memenuhi persyaratan keamanan.";
  }

  if (code.includes("rate_limit") || status === 429) {
    return "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.";
  }

  if (
    message.includes("duplicate key") ||
    message.includes("unique constraint")
  ) {
    if (message.includes("username")) {
      return "Username sudah digunakan. Silakan gunakan username lain.";
    }
    if (message.includes("phone")) {
      return "Nomor telepon sudah terdaftar. Silakan gunakan nomor lain.";
    }
    return "Email sudah terdaftar. Silakan masuk atau gunakan email lain.";
  }

  if (
    name === "AuthRetryableFetchError" ||
    status >= 500 ||
    message.includes("network request failed") ||
    message.includes("failed to fetch")
  ) {
    return "Layanan pendaftaran sedang bermasalah. Silakan coba lagi beberapa saat.";
  }

  return "Akun belum dapat dibuat. Periksa data Anda, lalu coba lagi.";
};

export const getLoginErrorMessage = (error: unknown): string => {
  const authError = readAuthError(error);
  const code = typeof authError.code === "string" ? authError.code.toLowerCase() : "";
  const name = typeof authError.name === "string" ? authError.name : "";
  const status = typeof authError.status === "number" ? authError.status : 0;
  const message =
    typeof authError.message === "string" ? authError.message.toLowerCase() : "";

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials") ||
    message.includes("email not confirmed")
  ) {
    return message.includes("email not confirmed")
      ? "Email belum diverifikasi. Buka tautan verifikasi yang kami kirim."
      : "Email atau password salah.";
  }

  if (code.includes("rate_limit") || status === 429) {
    return "Terlalu banyak percobaan masuk. Tunggu sebentar, lalu coba lagi.";
  }

  if (
    name === "AuthRetryableFetchError" ||
    status >= 500 ||
    message.includes("network request failed") ||
    message.includes("failed to fetch")
  ) {
    return "Layanan masuk sedang bermasalah. Periksa koneksi, lalu coba lagi.";
  }

  return "Akun belum dapat masuk. Periksa data Anda, lalu coba lagi.";
};

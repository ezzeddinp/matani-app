import {
  AuthField,
  AuthNotice,
  AuthScreen,
  authStyles,
} from "@/components/auth/auth-screen";
import { authService } from "@/hooks/supabase";
import { getSignUpErrorMessage } from "@/utils/auth-error";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeIndonesianPhone = (input: string) => {
  let nationalNumber = input.replace(/\D/g, "");
  if (nationalNumber.startsWith("62")) nationalNumber = nationalNumber.slice(2);
  if (nationalNumber.startsWith("0")) nationalNumber = nationalNumber.slice(1);

  return {
    nationalNumber,
    internationalNumber: nationalNumber ? `+62${nationalNumber}` : undefined,
  };
};

export default function SignUpScreen() {
  const router = useRouter();
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true,
      );
      return () => subscription.remove();
    }, []),
  );

  const clearError = () => {
    if (errorMessage) setErrorMessage(null);
  };

  const handleCreateAccount = async () => {
    if (isLoading || accountCreated) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();
    const normalizedPhone = normalizeIndonesianPhone(phoneNumber);

    if (!normalizedEmail || !password || !confirmPassword) {
      setErrorMessage("Email, password, dan konfirmasi password wajib diisi.");
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrorMessage("Format email belum benar.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak sesuai.");
      return;
    }

    if (normalizedUsername) {
      if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
        setErrorMessage("Username harus terdiri dari 3–20 karakter.");
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
        setErrorMessage("Username hanya boleh berisi huruf, angka, dan underscore.");
        return;
      }
    }

    if (
      normalizedPhone.nationalNumber &&
      (normalizedPhone.nationalNumber.length < 9 || normalizedPhone.nationalNumber.length > 13)
    ) {
      setErrorMessage("Nomor telepon harus terdiri dari 9–13 digit setelah +62.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const data = await authService.signUp({
        email: normalizedEmail,
        password,
        fullName: normalizedEmail.split("@")[0] || undefined,
        username: normalizedUsername || undefined,
        phoneNumber: normalizedPhone.internationalNumber,
      });

      setPassword("");
      setConfirmPassword("");

      if (!data.session) {
        setAccountCreated(true);
        return;
      }

      router.replace("/(tabs)");
    } catch (error: unknown) {
      setErrorMessage(getSignUpErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Mulai memantau"
      title="Buat akun Matani"
      subtitle="Simpan ladang padi dan ikuti observasi berbasis tanggal dari satu tempat."
    >
      <View style={styles.cardHeading}>
        <Text style={styles.cardTitle}>{accountCreated ? "Cek email Anda" : "Daftar akun baru"}</Text>
        <Text style={styles.cardSubtitle}>
          {accountCreated
            ? `Kami mengirim tautan verifikasi ke ${email.trim().toLowerCase()}.`
            : "Username dan nomor telepon boleh dikosongkan."}
        </Text>
      </View>

      {accountCreated ? (
        <>
          <AuthNotice
            tone="success"
            message="Akun berhasil dibuat. Buka tautan verifikasi di email, lalu kembali untuk masuk."
          />
          <Pressable
            style={({ pressed }) => [
              authStyles.primaryButton,
              pressed && authStyles.primaryButtonPressed,
            ]}
            onPress={() => router.replace("/auth/login")}
            accessibilityRole="button"
          >
            <Text style={authStyles.primaryButtonText}>Ke halaman masuk</Text>
            <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
          </Pressable>
        </>
      ) : (
        <>
          {errorMessage ? <AuthNotice message={errorMessage} /> : null}

          <AuthField
            icon="person-outline"
            label="Username (opsional)"
            placeholder="contoh: tani_muda"
            value={username}
            onChangeText={(value) => {
              setUsername(value);
              clearError();
            }}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          <AuthField
            ref={emailRef}
            icon="mail-outline"
            label="Email"
            placeholder="nama@email.com"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              clearError();
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
          />

          <AuthField
            ref={phoneRef}
            icon="call-outline"
            label="Nomor telepon (opsional)"
            prefix="+62"
            placeholder="812 3456 7890"
            value={phoneNumber}
            onChangeText={(value) => {
              setPhoneNumber(value);
              clearError();
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <AuthField
            ref={passwordRef}
            icon="lock-closed-outline"
            label="Password"
            placeholder="Minimal 8 karakter"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              clearError();
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            rightElement={
              <Pressable
                style={({ pressed }) => [authStyles.eyeButton, pressed && styles.pressed]}
                onPress={() => setShowPassword((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={21}
                  color="#5F6D63"
                />
              </Pressable>
            }
          />

          <AuthField
            ref={confirmPasswordRef}
            icon="checkmark-circle-outline"
            label="Konfirmasi password"
            placeholder="Ulangi password"
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              clearError();
            }}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={handleCreateAccount}
            rightElement={
              <Pressable
                style={({ pressed }) => [authStyles.eyeButton, pressed && styles.pressed]}
                onPress={() => setShowConfirmPassword((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={
                  showConfirmPassword
                    ? "Sembunyikan konfirmasi password"
                    : "Tampilkan konfirmasi password"
                }
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={21}
                  color="#5F6D63"
                />
              </Pressable>
            }
          />

          <Text style={styles.passwordHint}>
            Gunakan minimal 8 karakter. Spasi di awal atau akhir dianggap bagian dari password.
          </Text>

          <Pressable
            style={({ pressed }) => [
              authStyles.primaryButton,
              isLoading && authStyles.primaryButtonDisabled,
              pressed && !isLoading && authStyles.primaryButtonPressed,
            ]}
            onPress={handleCreateAccount}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : null}
            <Text style={authStyles.primaryButtonText}>
              {isLoading ? "Membuat akun..." : "Buat akun"}
            </Text>
            {!isLoading ? <Ionicons name="arrow-forward" size={19} color="#FFFFFF" /> : null}
          </Pressable>

          <View style={authStyles.footer}>
            <Text style={authStyles.footerText}>Sudah punya akun? </Text>
            <Pressable
              style={({ pressed }) => [authStyles.footerLink, pressed && styles.pressed]}
              onPress={() => router.replace("/auth/login")}
              accessibilityRole="link"
            >
              <Text style={authStyles.footerLinkText}>Masuk</Text>
            </Pressable>
          </View>
        </>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  cardHeading: {
    marginBottom: 22,
  },
  cardTitle: {
    color: "#17241C",
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: "#66726A",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  passwordHint: {
    color: "#66726A",
    fontSize: 12,
    lineHeight: 18,
    marginTop: -5,
    marginBottom: 20,
  },
  pressed: {
    opacity: 0.55,
  },
});

import { authService } from "@/hooks/supabase";
import { getSignUpErrorMessage } from "@/utils/auth-error";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigateToHome = useCallback(() => {
    router.replace("/(tabs)");
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true
      );
      return () => subscription.remove();
    }, [])
  );

  const handleCreateAccount = async () => {
    if (isLoading) return;

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();
    const trimmedUsername = username.trim();
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage("Email dan password wajib diisi.");
      return;
    }

    if (trimmedPassword.length < 8) {
      setErrorMessage("Password minimal 8 karakter.");
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setErrorMessage("Konfirmasi password tidak sesuai.");
      return;
    }

    // Validate username if provided
    if (trimmedUsername) {
      if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
        setErrorMessage("Username harus antara 3-20 karakter.");
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        setErrorMessage(
          "Username hanya boleh berisi huruf, angka, dan underscore."
        );
        return;
      }
    }

    // Validate phone number if provided
    if (trimmedPhone) {
      // Remove any non-digit characters
      const digitsOnly = trimmedPhone.replace(/\D/g, "");
      if (digitsOnly.length < 9) {
        setErrorMessage("Nomor telepon minimal 9 digit.");
        return;
      }
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const fallbackFullName = trimmedEmail.split("@")[0] || undefined;
      const data = await authService.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        fullName: fallbackFullName,
        username: trimmedUsername || undefined,
        phoneNumber: trimmedPhone || undefined,
      });

      if (!data.session) {
        setErrorMessage(
          "Akun berhasil dibuat. Silakan cek email Anda untuk verifikasi sebelum masuk."
        );
        return;
      }

      navigateToHome();
    } catch (error: unknown) {
      setErrorMessage(getSignUpErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogIn = () => {
    router.replace("/auth/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar} />

        <View style={styles.form}>
          <Text style={styles.title}>Daftar</Text>

          {errorMessage && (
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          )}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="contoh@gmail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nomor Telepon</Text>
            <View style={styles.phoneContainer}>
              <Text style={styles.phonePrefix}>+62</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="812345678"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Minimal 8 karakter"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable
                style={({ pressed }) => [styles.eyeButton, pressed && { opacity: 0.2 }]}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color="#999"
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Konfirmasi Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Ulangi password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <Pressable
                style={({ pressed }) => [styles.eyeButton, pressed && { opacity: 0.2 }]}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye" : "eye-off"}
                  size={20}
                  color="#999"
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              isLoading && styles.disabledButton,
              pressed && !isLoading && { opacity: 0.2 },
            ]}
            onPress={handleCreateAccount}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoading }}
          >
            <Text style={styles.createButtonText}>
              {isLoading ? "Mendaftarkan akun..." : "Daftar"}
            </Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Sudah punya akun?{" "}
              <Text style={styles.linkText} onPress={handleLogIn}>
                Masuk
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    marginTop: 12,
    marginBottom: 52,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 32,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  errorMessage: {
    backgroundColor: "#ffe8e6",
    color: "#b3261e",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#000",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  phonePrefix: {
    fontSize: 16,
    color: "#000",
    paddingVertical: 12,
    paddingRight: 8,
    fontWeight: "500",
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
  },
  eyeButton: {
    padding: 4,
  },
  createButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
  },
  linkText: {
    color: "#000",
    fontWeight: "600",
  },
});

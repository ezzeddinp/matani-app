import {
  AuthField,
  AuthNotice,
  AuthScreen,
  authStyles,
} from "@/components/auth/auth-screen";
import { authService } from "@/hooks/supabase";
import { getLoginErrorMessage } from "@/utils/auth-error";
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

export default function LoginScreen() {
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSignIn = async () => {
    if (isLoading) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage("Email dan password wajib diisi.");
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrorMessage("Format email belum benar.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const data = await authService.signIn({
        email: normalizedEmail,
        password,
      });

      if (!data.session?.user) {
        setErrorMessage("Sesi masuk belum tersedia. Silakan coba lagi.");
        return;
      }

      router.replace("/(tabs)");
    } catch (error: unknown) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Pantau lahan dengan tenang"
      title="Selamat datang kembali"
      subtitle="Masuk untuk melihat ladang padi, cuaca, dan observasi terbaru Anda."
    >
      <View style={styles.cardHeading}>
        <Text style={styles.cardTitle}>Masuk ke akun</Text>
        <Text style={styles.cardSubtitle}>Gunakan email yang terdaftar di Matani.</Text>
      </View>

      {errorMessage ? <AuthNotice message={errorMessage} /> : null}

      <AuthField
        icon="mail-outline"
        label="Email"
        placeholder="nama@email.com"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (errorMessage) setErrorMessage(null);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <AuthField
        ref={passwordRef}
        icon="lock-closed-outline"
        label="Password"
        placeholder="Masukkan password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (errorMessage) setErrorMessage(null);
        }}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={handleSignIn}
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

      <View style={styles.sessionHint}>
        <Ionicons name="phone-portrait-outline" size={17} color="#52705C" />
        <Text style={styles.sessionHintText}>Sesi Anda akan tetap tersimpan di perangkat ini.</Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          authStyles.primaryButton,
          isLoading && authStyles.primaryButtonDisabled,
          pressed && !isLoading && authStyles.primaryButtonPressed,
        ]}
        onPress={handleSignIn}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityState={{ disabled: isLoading }}
      >
        {isLoading ? <ActivityIndicator color="#FFFFFF" /> : null}
        <Text style={authStyles.primaryButtonText}>
          {isLoading ? "Memeriksa akun..." : "Masuk"}
        </Text>
        {!isLoading ? <Ionicons name="arrow-forward" size={19} color="#FFFFFF" /> : null}
      </Pressable>

      <View style={authStyles.footer}>
        <Text style={authStyles.footerText}>Belum punya akun? </Text>
        <Pressable
          style={({ pressed }) => [authStyles.footerLink, pressed && styles.pressed]}
          onPress={() => router.replace("/auth/signup")}
          accessibilityRole="link"
        >
          <Text style={authStyles.footerLinkText}>Daftar sekarang</Text>
        </Pressable>
      </View>
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
  sessionHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -2,
    marginBottom: 21,
  },
  sessionHintText: {
    flex: 1,
    color: "#52705C",
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.55,
  },
});

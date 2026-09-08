import { authService } from "@/hooks/supabase";
import { getLoginErrorMessage } from "@/utils/auth-error";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const incomingUrl = Linking.useURL();
  const handledUrl = useRef<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!incomingUrl || handledUrl.current === incomingUrl) return;
    handledUrl.current = incomingUrl;

    const finishVerification = async () => {
      try {
        const session = await authService.completeEmailRedirect(incomingUrl);
        if (!session?.user) throw new Error("AUTH_REDIRECT_SESSION_MISSING");
        router.replace("/(tabs)");
      } catch (error: unknown) {
        setErrorMessage(getLoginErrorMessage(error));
      }
    };

    void finishVerification();
  }, [incomingUrl, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={[styles.iconShell, errorMessage && styles.iconShellError]}>
          <Ionicons
            name={errorMessage ? "alert-circle-outline" : "shield-checkmark-outline"}
            size={34}
            color={errorMessage ? "#B42318" : "#166534"}
          />
        </View>
        <Text style={styles.title}>
          {errorMessage ? "Verifikasi belum selesai" : "Memverifikasi akun"}
        </Text>
        <Text style={styles.subtitle}>
          {errorMessage
            ? errorMessage
            : "Tunggu sebentar. Matani sedang menyelesaikan sesi aman Anda."}
        </Text>
        {errorMessage ? (
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => router.replace("/auth/login")}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Kembali ke halaman masuk</Text>
          </Pressable>
        ) : (
          <ActivityIndicator style={styles.loader} color="#166534" size="large" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F7F3",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  iconShell: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6F4E9",
    marginBottom: 22,
  },
  iconShellError: {
    backgroundColor: "#FFF0EE",
  },
  title: {
    color: "#17241C",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#66726A",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
    maxWidth: 360,
  },
  loader: {
    marginTop: 26,
  },
  button: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: "#166534",
    justifyContent: "center",
    paddingHorizontal: 22,
    marginTop: 26,
  },
  buttonPressed: {
    backgroundColor: "#0F4C2A",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

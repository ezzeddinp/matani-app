import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, {
  type ComponentProps,
  forwardRef,
  type ReactNode,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthScreenProps = {
  children: ReactNode;
  eyebrow: string;
  subtitle: string;
  title: string;
};

export function AuthScreen({ children, eyebrow, subtitle, title }: AuthScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#0B3D27", "#17633C", "#23824D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <View pointerEvents="none" style={styles.glowLarge} />
        <View pointerEvents="none" style={styles.glowSmall} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="none"
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Ionicons name="leaf" size={22} color="#166534" />
                </View>
                <Text style={styles.brandName}>MATANI</Text>
              </View>

              <View style={styles.headingBlock}>
                <Text style={styles.eyebrow}>{eyebrow}</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>

              <View style={styles.card}>{children}</View>

              <View style={styles.trustRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#D8F3DF" />
                <Text style={styles.trustText}>Akun dilindungi oleh autentikasi Supabase</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

type AuthFieldProps = TextInputProps & {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  prefix?: string;
  rightElement?: ReactNode;
};

export const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  { icon, label, prefix, rightElement, style, ...inputProps },
  ref,
) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldShell}>
        <Ionicons
          name={icon}
          size={20}
          color="#6B7A70"
          style={styles.fieldIcon}
        />
        {prefix ? <Text style={styles.fieldPrefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          placeholderTextColor="#8B978F"
          selectionColor="#23824D"
          style={[styles.fieldInput, style]}
        />
        {rightElement}
      </View>
    </View>
  );
});

type AuthNoticeProps = {
  message: string;
  tone?: "error" | "success";
};

export function AuthNotice({ message, tone = "error" }: AuthNoticeProps) {
  const success = tone === "success";

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, success ? styles.noticeSuccess : styles.noticeError]}
    >
      <Ionicons
        name={success ? "checkmark-circle" : "alert-circle"}
        size={20}
        color={success ? "#166534" : "#B42318"}
      />
      <Text style={[styles.noticeText, success ? styles.noticeTextSuccess : styles.noticeTextError]}>
        {message}
      </Text>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#166534",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#0B3D27",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonPressed: {
    backgroundColor: "#0F4C2A",
    transform: [{ scale: 0.99 }],
  },
  primaryButtonDisabled: {
    opacity: 0.58,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  eyeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  footerText: {
    color: "#66726A",
    fontSize: 14,
  },
  footerLink: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  footerLinkText: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "700",
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B3D27",
  },
  background: {
    flex: 1,
  },
  glowLarge: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -150,
    right: -90,
  },
  glowSmall: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: 185,
    left: -100,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 32,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2.2,
  },
  headingBlock: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  eyebrow: {
    color: "#C9EED2",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: "#D8F3DF",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 430,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: "#062B1A",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  trustRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  trustText: {
    color: "#D8F3DF",
    fontSize: 12,
  },
  fieldGroup: {
    marginBottom: 17,
  },
  fieldLabel: {
    color: "#26332B",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginBottom: 7,
  },
  fieldShell: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDE5DF",
    borderRadius: 16,
    backgroundColor: "#F7FAF7",
    paddingLeft: 15,
  },
  fieldIcon: {
    marginRight: 11,
  },
  fieldPrefix: {
    color: "#26332B",
    fontSize: 15,
    fontWeight: "700",
    marginRight: 7,
  },
  fieldInput: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 12,
    paddingRight: 14,
    color: "#18251D",
    fontSize: 15,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 13,
    borderRadius: 14,
    marginBottom: 18,
    borderWidth: 1,
  },
  noticeError: {
    backgroundColor: "#FFF3F1",
    borderColor: "#FFD5CF",
  },
  noticeSuccess: {
    backgroundColor: "#EDF9F0",
    borderColor: "#C8E8D0",
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  noticeTextError: {
    color: "#8F1D14",
  },
  noticeTextSuccess: {
    color: "#14532D",
  },
});

import { ThemedView } from "@/components/themed-view";
import {
  authService,
  lahanService,
  LahanWithInfo,
  profileService,
  UserProfile,
} from "@/hooks/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

const sanitizeString = (value: any): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return undefined;
};

const toNumber = (value: any, defaultValue = 0): number => {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return defaultValue;
};

const clampPercentage = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

export default function ProfileScreen() {
  const router = useRouter();

  const [selectedTab, setSelectedTab] = useState("Profil");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userMetadata, setUserMetadata] = useState<Record<string, any>>({});
  const [lahanList, setLahanList] = useState<LahanWithInfo[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isGuest, setIsGuest] = useState(false);

  const activateGuestMode = useCallback(() => {
    setIsGuest(true);
    setProfile(null);
    setLahanList([]);
    setProfileError(null);
    setUserMetadata({
      full_name: "Tamu Matani",
      email: "",
      phone: "",
      location: "Belum diatur",
    });
  }, []);

  const tabs = ["Profil", "Notifikasi", "Statistik", "Pencapaian"];

  const handleLogout = async () => {
    if (isSigningOut) return;

    try {
      setIsSigningOut(true);
      await authService.signOut();
      activateGuestMode();
      Alert.alert(
        "Keluar",
        "Anda sekarang menggunakan mode tamu. Masuk kembali untuk menyinkronkan data."
      );
    } catch (error: any) {
      console.error("❌ Sign out error:", error);
      Alert.alert(
        "Gagal Keluar",
        error?.message || "Terjadi kesalahan saat keluar dari akun."
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchProfileData = async () => {
      try {
        setProfileError(null);
        setIsLoadingProfile(true);

        const authData = await authService.getCurrentUser();
        const user = authData?.user;

        if (!user) {
          if (!isMounted) return;
          activateGuestMode();
          setIsLoadingProfile(false);
          return;
        }

        setIsGuest(false);

        const [profileRecord, lahanRecords] = await Promise.all([
          profileService.getProfile(user.id),
          lahanService.getLahanByUser(user.id),
        ]);

        if (!isMounted) return;

        const metadata = {
          ...(user.user_metadata || {}),
          email: user.email || user.user_metadata?.email,
          phone:
            user.phone ||
            user.user_metadata?.phone ||
            user.user_metadata?.phone_number,
        };

        setUserMetadata(metadata);
        setProfile(profileRecord ?? null);
        setLahanList(
          Array.isArray(lahanRecords) ? (lahanRecords as LahanWithInfo[]) : []
        );
      } catch (error: any) {
        if (!isMounted) return;
        const message: string = error?.message ?? "";
        console.error("❌ Profile fetch error:", error);

        if (message.includes("Auth session missing")) {
          activateGuestMode();
          setIsLoadingProfile(false);
          return;
        }

        setProfileError(message || "Terjadi kesalahan saat memuat profil.");
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    fetchProfileData();

    return () => {
      isMounted = false;
    };
  }, [activateGuestMode, reloadKey, router]);

  const handleRetryProfile = () => {
    setReloadKey((prev) => prev + 1);
  };

  const formatDecimal = useMemo(
    () =>
      new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    []
  );

  const formatInteger = useMemo(
    () =>
      new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    []
  );

  const username = useMemo(() => {
    return (
      sanitizeString(userMetadata?.username) ||
      sanitizeString(profile?.username) ||
      sanitizeString(userMetadata?.user_name) ||
      null
    );
  }, [profile, userMetadata]);

  const displayName = useMemo(() => {
    const fromProfile = sanitizeString(profile?.full_name || "");
    const fromMetadataName =
      sanitizeString(userMetadata?.full_name) ||
      sanitizeString(userMetadata?.name) ||
      sanitizeString(userMetadata?.display_name);

    if (fromProfile) return fromProfile;
    if (fromMetadataName) return fromMetadataName;
    if (profile?.email) {
      return profile.email.split("@")[0];
    }
    const metadataEmail = sanitizeString(userMetadata?.email);
    if (metadataEmail) {
      return metadataEmail.split("@")[0];
    }
    return "Pengguna Matani";
  }, [profile, userMetadata]);

  const emailAddress = useMemo(() => {
    if (profile?.email) {
      return profile.email;
    }
    const metadataEmail = sanitizeString(userMetadata?.email);
    if (metadataEmail) {
      return metadataEmail;
    }
    return "Email belum tersedia";
  }, [profile, userMetadata]);

  const phoneNumber = useMemo(() => {
    return (
      sanitizeString(userMetadata?.phone_number) ||
      sanitizeString(userMetadata?.phone) ||
      sanitizeString(userMetadata?.whatsapp) ||
      "Belum diatur"
    );
  }, [userMetadata]);

  const joinedDateLabel = useMemo(() => {
    if (!profile?.created_at) return "Belum tersedia";
    const createdDate = new Date(profile.created_at);
    if (Number.isNaN(createdDate.getTime())) return "Belum tersedia";
    return createdDate.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [profile]);

  const totalLahan = useMemo(() => lahanList.length, [lahanList]);

  const totalAreaHa = useMemo(() => {
    return lahanList.reduce(
      (sum, lahan) => sum + toNumber(lahan.area_ha, 0),
      0
    );
  }, [lahanList]);

  const totalAreaLabel = `${formatDecimal.format(totalAreaHa)} hektar`;

  const expertProgress = useMemo(() => {
    if (totalLahan <= 0) return 0;
    return clampPercentage((totalLahan / 5) * 100);
  }, [totalLahan]);

  const targetProgressLabel = `${formatInteger.format(
    Math.min(totalLahan, 5)
  )}/5 lahan dibuat`;

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      {isGuest && (
        <View style={styles.guestBanner}>
          <Text style={styles.guestBannerTitle}>Mode Tamu Aktif</Text>
          <Text style={styles.guestBannerText}>
            Login untuk menyinkronkan profil dan aktivitas lahan Anda.
          </Text>
        </View>
      )}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#4CAF50" />
          </View>
        </View>
        <Text style={styles.profileName}>{username || displayName}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Username</Text>
          <Text style={styles.infoValue}>{username || displayName}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{emailAddress}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Nomor Telepon</Text>
          <Text style={styles.infoValue}>{phoneNumber}</Text>
        </View>
      </View>

      <View style={styles.actionSection}>
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Bantuan & Dukungan</Text>
        </View>
        <View style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Kebijakan Privasi</Text>
        </View>
        {isGuest ? (
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.loginButton,
              pressed && { opacity: 0.2 },
            ]}
            onPress={() => router.replace("/auth/login")}
            accessibilityRole="button"
          >
            <Text style={[styles.actionButtonText, styles.loginText]}>
              Masuk ke Akun
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
                styles.actionButton,
                styles.logoutButton,
                isSigningOut && styles.logoutButtonDisabled,
                pressed && !isSigningOut && { opacity: 0.2 },
              ]}
            onPress={handleLogout}
            disabled={isSigningOut}
            accessibilityRole="button"
            accessibilityState={{ disabled: isSigningOut }}
          >
            <Text style={[styles.actionButtonText, styles.logoutText]}>
              {isSigningOut ? "Keluar…" : "Keluar dari Akun"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderNotificationTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.guestBanner}>
        <Text style={styles.guestBannerTitle}>
          Sistem notifikasi belum tersedia
        </Text>
        <Text style={styles.guestBannerText}>
          Prototipe saat ini belum menghasilkan, menyimpan, atau mengirim
          peringatan melalui aplikasi, WhatsApp, maupun SMS. Preferensi dan
          laporan berkala akan dirancang sebagai pekerjaan pasca-skripsi.
        </Text>
      </View>
    </View>
  );

  const renderStatistikTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{joinedDateLabel}</Text>
            <Text style={styles.statLabel}>Tanggal Bergabung</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {formatInteger.format(totalLahan)}
            </Text>
            <Text style={styles.statLabel}>Total Lahan</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalAreaLabel}</Text>
            <Text style={styles.statLabel}>Luas Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>--</Text>
            <Text style={styles.statLabel}>NDVI Terukur</Text>
          </View>
        </View>

        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>Statistik Penggunaan</Text>
          <Text style={styles.guestBannerText}>
            Event pemantauan, pembacaan artikel, dan penerimaan alert belum
            dicatat oleh implementasi saat ini. Angka aktivitas tidak
            ditampilkan sampai sumber datanya benar-benar tersedia.
          </Text>
        </View>

        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>
            Metrik Agronomis Tidak Tersedia
          </Text>
          <Text style={styles.guestBannerText}>
            Matani menampilkan deret waktu nilai yang tersedia tanpa mendiagnosis
            kesehatan lahan atau memprediksi produktivitas. Pengukuran
            provenance-complete dan alert produksi belum tersedia.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPencapaianTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.achievementSection}>
        <Text style={styles.sectionTitle}>Pencapaian Produk (Preview)</Text>
        <Text style={styles.guestBannerText}>
          Badge ini hanya preview antarmuka berdasarkan usia akun dan jumlah
          lahan. Badge belum dipersistenkan dan bukan penilaian keahlian,
          produktivitas, atau kondisi agronomis.
        </Text>

        <View style={styles.achievementCard}>
          <View style={styles.achievementIcon}>
            <Text style={styles.achievementEmoji}>🏅</Text>
          </View>
          <View style={styles.achievementContent}>
            <Text style={styles.achievementTitle}>Petani Digital</Text>
            <Text style={styles.achievementDescription}>
              Akun Matani dibuat pada {joinedDateLabel}
            </Text>
          </View>
          <View style={styles.achievementBadge}>
            <Text style={styles.badgeText}>❤️</Text>
          </View>
        </View>

        <View style={styles.achievementCard}>
          <View style={styles.achievementIcon}>
            <Text style={styles.achievementEmoji}>📍</Text>
          </View>
          <View style={styles.achievementContent}>
            <Text style={styles.achievementTitle}>Pembuat Lahan</Text>
            <Text style={styles.achievementDescription}>
              {`Sudah membuat ${formatInteger.format(totalLahan)} peta lahan`}
            </Text>
          </View>
        </View>

        <View style={styles.targetCard}>
          <View style={styles.targetHeader}>
            <Text style={styles.targetTitle}>Target Berikutnya</Text>
            <Text style={styles.targetDescription}>
              Buat 5 lahan untuk melihat badge preview &quot;Pembuat Lahan&quot;
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${expertProgress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{targetProgressLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderActiveTabContent = () => {
    switch (selectedTab) {
      case "Profil":
        return renderProfileTab();
      case "Notifikasi":
        return renderNotificationTab();
      case "Statistik":
        return renderStatistikTab();
      case "Pencapaian":
        return renderPencapaianTab();
      default:
        return renderNotificationTab();
    }
  };

  const renderTabContent = () => {
    if (isLoadingProfile) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loaderText}>Memuat profil Anda…</Text>
        </View>
      );
    }

    if (profileError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{profileError}</Text>
          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.2 }]}
            onPress={handleRetryProfile}
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </Pressable>
        </View>
      );
    }

    return renderActiveTabContent();
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            style={({ pressed }) => [
              styles.tabButton,
              selectedTab === tab && styles.activeTab,
              pressed && { opacity: 0.2 },
            ]}
            onPress={() => setSelectedTab(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedTab === tab }}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  tabNavigation: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 25,
    marginHorizontal: 16,
    marginTop: 68,
    marginBottom: 12,
    padding: 5,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: "#C8E6C9",
  },
  tabText: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#2E7D32",
    fontWeight: "bold",
  },
  scrollContent: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: "#FFFFFF",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  guestBanner: {
    backgroundColor: "#E8F5E9",
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  guestBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 4,
  },
  guestBannerText: {
    fontSize: 14,
    color: "#2E7D32",
    lineHeight: 20,
  },
  editButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#C8E6C9",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  editIcon: {
    fontSize: 14,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  profileLocation: {
    fontSize: 14,
    color: "#666",
  },
  infoSection: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  infoItem: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  actionSection: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
  },
  actionButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 16,
    color: "#333",
  },
  loginButton: {
    backgroundColor: "#E8F5E9",
    borderColor: "#2E7D32",
    borderWidth: 1,
  },
  loginText: {
    color: "#2E7D32",
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#FFEBEE",
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    color: "#C62828",
  },
  notificationSection: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  notificationIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  iconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 14,
    color: "#666",
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "48%",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  analysisSection: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  analysisItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  analysisLabel: {
    fontSize: 16,
    color: "#333",
  },
  analysisValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  metricsSection: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
  },
  metricItem: {
    marginBottom: 20,
  },
  metricLabel: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 5,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 14,
    color: "#666",
    textAlign: "right",
  },
  achievementSection: {
    marginBottom: 20,
  },
  achievementCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  achievementIcon: {
    width: 50,
    height: 50,
    backgroundColor: "#C8E6C9",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  achievementEmoji: {
    fontSize: 24,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 14,
    color: "#666",
  },
  achievementBadge: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 20,
  },
  targetCard: {
    backgroundColor: "#C8E6C9",
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
  },
  targetHeader: {
    marginBottom: 15,
  },
  targetTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 5,
  },
  targetDescription: {
    fontSize: 14,
    color: "#2E7D32",
  },
  loaderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#C62828",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#2E7D32",
    borderRadius: 20,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  progressContainer: {
    marginTop: 10,
  },
  progressText: {
    fontSize: 12,
    color: "#2E7D32",
    marginTop: 5,
  },
});

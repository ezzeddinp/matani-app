import { ThemedView } from "@/components/themed-view";
import {
  authService,
  lahanService,
  LahanWithInfo,
  profileService,
  UserProfile,
} from "@/hooks/supabase";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
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

  const [notificationSettings, setNotificationSettings] = useState({
    whatsapp: true,
    sms: false,
    riskAlert: true,
    weatherAlert: true,
    ndviAlert: true,
    dailyReport: false,
    weeklyReport: true,
  });

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

  const toggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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
        setLahanList(Array.isArray(lahanRecords) ? lahanRecords : []);
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

  const locationLabel = useMemo(() => {
    return (
      sanitizeString(userMetadata?.location) ||
      sanitizeString(userMetadata?.city) ||
      sanitizeString(userMetadata?.address) ||
      "Lokasi belum diatur"
    );
  }, [userMetadata]);

  const joinedDays = useMemo(() => {
    if (!profile?.created_at) return 0;
    const createdDate = new Date(profile.created_at);
    if (Number.isNaN(createdDate.getTime())) return 0;
    const diffMs = Date.now() - createdDate.getTime();
    if (diffMs <= 0) return 0;
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }, [profile]);

  const joinedDaysLabel =
    joinedDays > 0
      ? `${formatInteger.format(joinedDays)} hari`
      : "Baru bergabung";

  const totalLahan = useMemo(() => lahanList.length, [lahanList]);

  const totalAreaHa = useMemo(() => {
    return lahanList.reduce(
      (sum, lahan) => sum + toNumber(lahan.area_ha, 0),
      0
    );
  }, [lahanList]);

  const totalAreaLabel = `${formatDecimal.format(totalAreaHa)} hektar`;

  const rawAverageNdvi =
    userMetadata?.average_ndvi ??
    userMetadata?.avg_ndvi ??
    userMetadata?.ndvi_average ??
    userMetadata?.ndviAvg;

  const averageNdviLabel = useMemo(() => {
    if (
      rawAverageNdvi === undefined ||
      rawAverageNdvi === null ||
      rawAverageNdvi === ""
    ) {
      return "Belum tersedia";
    }
    const numeric = Number(rawAverageNdvi);
    if (Number.isFinite(numeric)) {
      return numeric.toFixed(3);
    }
    const asString = sanitizeString(String(rawAverageNdvi));
    return asString || "Belum tersedia";
  }, [rawAverageNdvi]);

  const ndviChecks = useMemo(
    () =>
      toNumber(
        userMetadata?.ndvi_checks ?? userMetadata?.ndviMonitoringCount,
        0
      ),
    [userMetadata]
  );

  const weatherChecks = useMemo(
    () =>
      toNumber(
        userMetadata?.weather_checks ?? userMetadata?.weatherCheckCount,
        0
      ),
    [userMetadata]
  );

  const alertsReceived = useMemo(
    () =>
      toNumber(userMetadata?.alerts_received ?? userMetadata?.alertCount, 0),
    [userMetadata]
  );

  const educationRead = useMemo(
    () =>
      toNumber(userMetadata?.education_read ?? userMetadata?.educationCount, 0),
    [userMetadata]
  );

  const landHealthScore = useMemo(
    () =>
      clampPercentage(
        toNumber(
          userMetadata?.land_health_score ??
            userMetadata?.landHealthScore ??
            userMetadata?.land_health,
          0
        )
      ),
    [userMetadata]
  );

  const monitoringEfficiencyScore = useMemo(
    () =>
      clampPercentage(
        toNumber(
          userMetadata?.monitoring_efficiency ??
            userMetadata?.monitoringEfficiency ??
            (totalLahan > 0 ? 60 : 0),
          0
        )
      ),
    [totalLahan, userMetadata]
  );

  const alertResponseScore = useMemo(
    () =>
      clampPercentage(
        toNumber(
          userMetadata?.alert_response ??
            userMetadata?.alertResponse ??
            userMetadata?.alert_response_score,
          0
        )
      ),
    [userMetadata]
  );

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
          <View style={styles.avatar} />
          <View style={styles.editButton}>
            <Text style={styles.editIcon}>✏️</Text>
          </View>
        </View>
        <Text style={styles.profileName}>{displayName}</Text>
        <Text style={styles.profileLocation}>{locationLabel}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Nama Lengkap</Text>
          <Text style={styles.infoValue}>{displayName}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{emailAddress}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Nomor Telepon</Text>
          <Text style={styles.infoValue}>{phoneNumber}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Lokasi</Text>
          <Text style={styles.infoValue}>{locationLabel}</Text>
        </View>
      </View>

      <View style={styles.actionSection}>
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Bantuan & Dukungan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Kebijakan Privasi</Text>
        </TouchableOpacity>
        {isGuest ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.loginButton]}
            onPress={() => router.replace("/auth/login")}
          >
            <Text style={[styles.actionButtonText, styles.loginText]}>
              Masuk ke Akun
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.logoutButton,
              isSigningOut && styles.logoutButtonDisabled,
            ]}
            onPress={handleLogout}
            disabled={isSigningOut}
          >
            <Text style={[styles.actionButtonText, styles.logoutText]}>
              {isSigningOut ? "Keluar…" : "Keluar dari Akun"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderNotificationTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.notificationSection}>
        <Text style={styles.sectionTitle}>Metode Notifikasi</Text>

        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>💬</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>WhatsApp</Text>
            <Text style={styles.notificationDescription}>
              Terima notifikasi via WhatsApp
            </Text>
          </View>
          <Switch
            value={notificationSettings.whatsapp}
            onValueChange={() => toggleNotification("whatsapp")}
            trackColor={{ false: "#767577", true: "#C8E6C9" }}
            thumbColor={notificationSettings.whatsapp ? "#4CAF50" : "#f4f3f4"}
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>📱</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>SMS</Text>
            <Text style={styles.notificationDescription}>
              Terima notifikasi via SMS
            </Text>
          </View>
          <Switch
            value={notificationSettings.sms}
            onValueChange={() => toggleNotification("sms")}
            trackColor={{ false: "#767577", true: "#C8E6C9" }}
            thumbColor={notificationSettings.sms ? "#4CAF50" : "#f4f3f4"}
          />
        </View>
      </View>

      <View style={styles.notificationSection}>
        <Text style={styles.sectionTitle}>Metode Notifikasi</Text>

        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>⚠️</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Peringatan Risiko</Text>
            <Text style={styles.notificationDescription}>
              Alert saat risiko tinggi terdeteksi
            </Text>
          </View>
          <Switch
            value={notificationSettings.riskAlert}
            onValueChange={() => toggleNotification("riskAlert")}
            trackColor={{ false: "#767577", true: "#C8E6C9" }}
            thumbColor={notificationSettings.riskAlert ? "#4CAF50" : "#f4f3f4"}
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>🌤️</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Peringatan Cuaca</Text>
            <Text style={styles.notificationDescription}>
              Alert cuaca ekstrem dan rekomendasi
            </Text>
          </View>
          <Switch
            value={notificationSettings.weatherAlert}
            onValueChange={() => toggleNotification("weatherAlert")}
            trackColor={{ false: "#767577", true: "#C8E6C9" }}
            thumbColor={
              notificationSettings.weatherAlert ? "#4CAF50" : "#f4f3f4"
            }
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>🌱</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Peringatan NDVI</Text>
            <Text style={styles.notificationDescription}>
              Alert perubahan kesehatan tanaman
            </Text>
          </View>
          <Switch
            value={notificationSettings.ndviAlert}
            onValueChange={() => toggleNotification("ndviAlert")}
            trackColor={{ false: "#767577", true: "#C8E6C9" }}
            thumbColor={notificationSettings.ndviAlert ? "#4CAF50" : "#f4f3f4"}
          />
        </View>
      </View>

      <View style={styles.notificationSection}>
        <Text style={styles.sectionTitle}>Laporan Berkala</Text>

        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>📊</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Laporan Harian</Text>
            <Text style={styles.notificationDescription}>
              Ringkasan kondisi lahan setiap hari
            </Text>
          </View>
          <Switch
            value={notificationSettings.dailyReport}
            onValueChange={() => toggleNotification("dailyReport")}
            trackColor={{ false: "#767577", true: "#C8E6C9" }}
            thumbColor={
              notificationSettings.dailyReport ? "#4CAF50" : "#f4f3f4"
            }
          />
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationIcon}>
            <Text style={styles.iconText}>📈</Text>
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Laporan Mingguan</Text>
            <Text style={styles.notificationDescription}>
              Analisis tren dan rekomendasi mingguan
            </Text>
          </View>
          <Switch
            value={notificationSettings.weeklyReport}
            onValueChange={() => toggleNotification("weeklyReport")}
            trackColor={{ false: "#767577", true: "#C8E6C9" }}
            thumbColor={
              notificationSettings.weeklyReport ? "#4CAF50" : "#f4f3f4"
            }
          />
        </View>
      </View>
    </View>
  );

  const renderStatistikTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{joinedDaysLabel}</Text>
            <Text style={styles.statLabel}>Hari Bergabung</Text>
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
            <Text style={styles.statNumber}>{averageNdviLabel}</Text>
            <Text style={styles.statLabel}>Rata-rata NDVI</Text>
          </View>
        </View>

        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>Analisis Penggunaan</Text>
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Pemantauan NDVI</Text>
            <Text style={styles.analysisValue}>{`${formatInteger.format(
              ndviChecks
            )} kali`}</Text>
          </View>
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Cek Prakiraan Cuaca</Text>
            <Text style={styles.analysisValue}>{`${formatInteger.format(
              weatherChecks
            )} kali`}</Text>
          </View>
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Alert Diterima</Text>
            <Text style={styles.analysisValue}>{`${formatInteger.format(
              alertsReceived
            )} kali`}</Text>
          </View>
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>Edukasi Dibaca</Text>
            <Text style={styles.analysisValue}>{`${formatInteger.format(
              educationRead
            )} artikel`}</Text>
          </View>
        </View>

        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Metrik Produktivitas</Text>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Kesehatan Lahan</Text>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${landHealthScore}%` }]}
              />
            </View>
            <Text style={styles.metricValue}>{`${formatInteger.format(
              landHealthScore
            )}%`}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Efisiensi Monitoring</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${monitoringEfficiencyScore}%` },
                ]}
              />
            </View>
            <Text style={styles.metricValue}>{`${formatInteger.format(
              monitoringEfficiencyScore
            )}%`}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Response Time Alert</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${alertResponseScore}%` },
                ]}
              />
            </View>
            <Text style={styles.metricValue}>{`${formatInteger.format(
              alertResponseScore
            )}%`}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPencapaianTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.achievementSection}>
        <Text style={styles.sectionTitle}>Pencapaian Saya</Text>

        <View style={styles.achievementCard}>
          <View style={styles.achievementIcon}>
            <Text style={styles.achievementEmoji}>🏅</Text>
          </View>
          <View style={styles.achievementContent}>
            <Text style={styles.achievementTitle}>Petani Digital</Text>
            <Text style={styles.achievementDescription}>
              Bergabung pada Matani selama {joinedDaysLabel}
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
            <Text style={styles.achievementTitle}>Pemetaan Ahli</Text>
            <Text style={styles.achievementDescription}>
              {`Sudah membuat ${formatInteger.format(totalLahan)} peta lahan`}
            </Text>
          </View>
        </View>

        <View style={styles.achievementCard}>
          <View style={styles.achievementIcon}>
            <Text style={styles.achievementEmoji}>🌤️</Text>
          </View>
          <View style={styles.achievementContent}>
            <Text style={styles.achievementTitle}>Cuaca Master</Text>
            <Text style={styles.achievementDescription}>
              {`Telah mengecek cuaca ${formatInteger.format(
                weatherChecks
              )} kali`}
            </Text>
          </View>
        </View>

        <View style={styles.targetCard}>
          <View style={styles.targetHeader}>
            <Text style={styles.targetTitle}>Target Berikutnya</Text>
            <Text style={styles.targetDescription}>
              Buat 5 lahan untuk mendapatkan badge &quot;Pemetaan Ahli&quot;
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
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetryProfile}
          >
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
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
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
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
    backgroundColor: "#ddd",
    borderRadius: 40,
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

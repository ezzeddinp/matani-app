import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
    Defs,
    Path,
    Stop,
    LinearGradient as SvgLinearGradient,
} from "react-native-svg";

import {
    NDVI_SEVERITY_CONFIG,
    NDVI_UNKNOWN_CONFIG,
    type NdviClassificationKey,
} from "@/constants/ndvi";
import { lahanService, type LahanDetail } from "@/hooks/supabase";
import {
    buildNdviSeries,
    clamp,
    Coordinate,
    getDayOfYear,
    toRadians,
} from "@/utils/ndvi-simulator";

export const options = {
  headerShown: false,
};

type AnalysisResult = {
  centroid: Coordinate;
  plantingDate: Date;
  harvestCycleDays: number;
  daysSincePlanting: number;
  daysToHarvest: number;
  harvestProgress: number;
  ndviHistory: { date: Date; value: number }[];
  ndviCurrent: number;
  ndviWeekChange: number;
  ndviTrendPercent: number;
  ndviHighest: number;
  ndviLowest: number;
  ndviAverage: number;
  anomalyDetected: boolean;
  anomalySummary: string;
  moistureIndex: number;
  pestPressure: number;
  diseaseRisk: number;
  stressIndex: number;
  soilMoisture: number;
  pestAlert: string;
  stressCategory: string;
  growthStage: string;
  recommendations: string[];
};

type SeverityLevel = "success" | "warning" | "danger";

const severityPalette: Record<
  SeverityLevel,
  { background: string; border: string; text: string }
> = {
  success: { background: "#E8F5E9", border: "#C8E6C9", text: "#1B5E20" },
  warning: { background: "#FFF6E5", border: "#FFE0B2", text: "#6D4C00" },
  danger: { background: "#FBE9E7", border: "#F5C6CB", text: "#B71C1C" },
};

const classificationToSeverity: Record<NdviClassificationKey, SeverityLevel> = {
  darkGreen: "success",
  yellowGreen: "warning",
  orange: "danger",
  red: "danger",
  unknown: "warning",
};

const healthSeverityLabels: Record<SeverityLevel, string> = {
  success: "Sehat",
  warning: "Perlu Perhatian",
  danger: "Perlu Aksi",
};

const riskSeverityLabels: Record<SeverityLevel, string> = {
  success: "Rendah",
  warning: "Sedang",
  danger: "Tinggi",
};

const heroGradientPalette: Record<SeverityLevel, [string, string]> = {
  success: ["#2E7D32", "#1B5E20"],
  warning: ["#FFB74D", "#F57C00"],
  danger: ["#EF5350", "#C62828"],
};

const NDVI_TIPS = [
  "Nilai NDVI sangat sehat berada di kisaran 0.6–1.0 dan menunjukkan kanopi hijau pekat.",
  "Rentang 0.2–0.6 menandakan pertumbuhan wajar, 0.0–0.2 vegetasi rendah, sedangkan -1.0–0.0 berarti tanpa vegetasi.",
  "Gunakan tren NDVI untuk memantau stres tanaman, menjadwalkan pemupukan, serta menentukan waktu panen.",
];

const DEFAULT_LAHAN_THUMBNAIL = {
  uri: "https://images.unsplash.com/photo-1582719478181-2cf4e9b123c9?auto=format&fit=crop&w=1200&q=80",
} as const;

const evaluateNdviSeverity = (value: number): SeverityLevel => {
  if (value >= 0.6) return "success";
  if (value >= 0.2) return "warning";
  return "danger";
};

const evaluateTrendSeverity = (value: number): SeverityLevel => {
  if (value >= 0) return "success";
  if (value >= -5) return "warning";
  return "danger";
};

const evaluateRiskSeverity = (value: number): SeverityLevel => {
  if (value <= 0.45) return "success";
  if (value <= 0.65) return "warning";
  return "danger";
};

const formatPercent = (value: number, fractionDigits = 1) =>
  `${(value * 100).toFixed(fractionDigits)}%`;
const formatNdviValue = (value: number, fractionDigits = 2) =>
  value.toFixed(fractionDigits);

const computeAnalysis = (
  coords: Coordinate,
  areaHa: number | null,
  createdAt?: string
): AnalysisResult => {
  const today = new Date();
  const plantingDate = createdAt
    ? new Date(createdAt)
    : new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
  const harvestCycleDays = Math.round(95 + clamp((areaHa ?? 1) * 1.8, 0, 40));
  const daysSincePlanting = Math.max(
    0,
    Math.floor(
      (today.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const daysToHarvest = Math.max(harvestCycleDays - daysSincePlanting, 0);
  const harvestProgress = clamp(daysSincePlanting / harvestCycleDays, 0, 1);

  const ndviHistory = buildNdviSeries(
    coords.latitude,
    coords.longitude,
    areaHa ?? 1,
    today
  );
  const ndviCurrent = ndviHistory[ndviHistory.length - 1]?.value ?? 0.65;
  const ndviWeek = clamp(
    (() => {
      const dayOfYear = getDayOfYear(today) - 7;
      const nir =
        0.62 +
        0.18 * Math.sin(toRadians(coords.latitude + dayOfYear / 2)) +
        0.05 * Math.cos(toRadians(coords.longitude / 3 + (areaHa ?? 1)));
      const red =
        0.3 +
        0.1 * Math.cos(toRadians(coords.latitude / 2 - dayOfYear / 3)) +
        0.03 * Math.sin(toRadians(coords.longitude / 4));
      return (nir - red) / (nir + red);
    })(),
    0.05,
    0.95
  );
  const ndviWeekChange = ndviCurrent - ndviWeek;
  const ndviTrendPercent =
    clamp(ndviWeekChange / (Math.abs(ndviWeek) || 0.01), -0.5, 0.5) * 100;

  const ndviHighest = Math.max(...ndviHistory.map((item) => item.value));
  const ndviLowest = Math.min(...ndviHistory.map((item) => item.value));
  const ndviAverage =
    ndviHistory.reduce((acc, item) => acc + item.value, 0) / ndviHistory.length;

  const anomalyDetected = Math.abs(ndviWeekChange) >= 0.035;
  const anomalySummary = anomalyDetected
    ? `NDVI ${ndviWeekChange > 0 ? "naik" : "turun"} ${(
        Math.abs(ndviWeekChange) * 100
      ).toFixed(1)}% dalam 7 hari.`
    : "Tidak ada perubahan signifikan dalam 7 hari terakhir.";

  const moistureIndex = clamp(
    0.55 + 0.28 * Math.sin(toRadians(coords.latitude + ndviCurrent * 40)),
    0.2,
    0.95
  );
  const pestPressure = clamp(
    0.35 +
      0.4 * (1 / (1 + Math.exp(-((ndviAverage - 0.68) * 9)))) +
      0.1 * Math.sin(toRadians(coords.longitude * 2)),
    0.1,
    0.98
  );
  const diseaseRisk = clamp(
    0.32 +
      0.45 * (1 - ndviCurrent) +
      0.12 * Math.cos(toRadians(coords.latitude - coords.longitude)),
    0.08,
    0.92
  );
  const stressIndex = clamp(
    0.4 + 0.5 * (0.75 - ndviCurrent) + 0.1 * Math.sin(toRadians(areaHa ?? 1)),
    0.05,
    0.95
  );
  const soilMoisture = clamp(
    0.65 +
      0.25 * Math.sin(toRadians(coords.latitude + getDayOfYear(today))) -
      0.2 * stressIndex,
    0.1,
    0.96
  );

  const pestAlert =
    pestPressure > 0.6
      ? "Pantau aktivitas hama, lakukan inspeksi visual dan pasang perangkap feromon."
      : "Risiko hama terkendali, lanjutkan monitoring rutin.";

  const stressSeverity = evaluateRiskSeverity(stressIndex);
  const stressCategory = riskSeverityLabels[stressSeverity];

  const growthStage =
    harvestProgress < 0.35
      ? "Vegetatif Aktif"
      : harvestProgress < 0.7
      ? "Pembungaan & Pengisian"
      : "Menjelang Panen";

  const recommendations = [
    "Lanjutkan perawatan rutin yang sudah berjalan dan catat setiap perubahan pertumbuhan.",
    "Monitor perkembangan secara berkala dengan citra satelit atau drone jika tersedia.",
    "Siapkan rencana panen sesuai jadwal untuk menjaga kualitas hasil.",
    "Dokumentasikan praktik terbaik untuk referensi musim tanam berikutnya.",
  ];

  if (soilMoisture < 0.45) {
    recommendations.unshift(
      "Tingkatkan irigasi tetes atau sprinkler untuk menjaga kelembaban tanah."
    );
  }
  if (pestPressure > 0.6) {
    recommendations.unshift(
      "Lakukan monitoring hama intensif dan pertimbangkan insektisida ramah lingkungan."
    );
  }
  if (diseaseRisk > 0.55) {
    recommendations.unshift(
      "Periksa gejala penyakit jamur, lakukan sanitasi area dan gunakan fungisida preventif."
    );
  }

  return {
    centroid: coords,
    plantingDate,
    harvestCycleDays,
    daysSincePlanting,
    daysToHarvest,
    harvestProgress,
    ndviHistory,
    ndviCurrent,
    ndviWeekChange,
    ndviTrendPercent,
    ndviHighest,
    ndviLowest,
    ndviAverage,
    anomalyDetected,
    anomalySummary,
    moistureIndex,
    pestPressure,
    diseaseRisk,
    stressIndex,
    soilMoisture,
    pestAlert,
    stressCategory,
    growthStage,
    recommendations: Array.from(new Set(recommendations)),
  };
};

const parseGeoJson = (value: any): any | null => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("Tidak dapat mengurai GeoJSON:", error);
      return null;
    }
  }
  if (typeof value === "object") return value;
  return null;
};

const extractCentroid = (data: LahanDetail): Coordinate | null => {
  const geojson = parseGeoJson(data.geojson);
  if (!geojson || !Array.isArray(geojson.coordinates?.[0])) {
    return null;
  }

  const ring: number[][] = geojson.coordinates[0];
  if (!ring.length) return null;

  const coordinates = ring.map((point) => ({
    latitude: point[1],
    longitude: point[0],
  }));

  const sum = coordinates.reduce(
    (acc, item) => {
      acc.latitude += item.latitude;
      acc.longitude += item.longitude;
      return acc;
    },
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: sum.latitude / coordinates.length,
    longitude: sum.longitude / coordinates.length,
  };
};

const MiniAreaChart = ({ data }: { data: AnalysisResult["ndviHistory"] }) => {
  const width = 320;
  const height = 140;
  const minValue = 0.2;
  const maxValue = 0.95;

  const path = useMemo(() => {
    if (!data.length) return "";

    const step = width / Math.max(data.length - 1, 1);
    const points = data.map((point, index) => {
      const x = step * index;
      const normalized = clamp(
        (point.value - minValue) / (maxValue - minValue),
        0,
        1
      );
      const y = height - normalized * height;
      return { x, y };
    });

    const head = points[0];
    const tail = points[points.length - 1];

    let d = `M ${head.x} ${height} L ${head.x} ${head.y}`;
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      d += ` L ${current.x} ${current.y}`;
    }
    d += ` L ${tail.x} ${height} Z`;

    return d;
  }, [data, height, maxValue, minValue, width]);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgLinearGradient id="ndviGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#4CAF50" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#C8E6C9" stopOpacity="0.05" />
        </SvgLinearGradient>
      </Defs>
      <Path
        d={path}
        fill="url(#ndviGradient)"
        stroke="#2E7D32"
        strokeWidth={2}
      />
    </Svg>
  );
};

export default function DetailLahanPage() {
  const router = useRouter();
  const { id, ndviKey, ndviScore } = useLocalSearchParams<{
    id?: string;
    ndviKey?: string;
    ndviScore?: string;
  }>();
  const [detail, setDetail] = useState<LahanDetail | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"health" | "risk">("health");

  const ndviKeyParam = Array.isArray(ndviKey) ? ndviKey[0] : ndviKey;
  const ndviScoreParam = Array.isArray(ndviScore) ? ndviScore[0] : ndviScore;

  const routeClassification = useMemo(() => {
    if (!ndviKeyParam) {
      return null;
    }
    const key = ndviKeyParam.trim() as NdviClassificationKey;
    if (key === "unknown") {
      return NDVI_UNKNOWN_CONFIG;
    }
    return (
      NDVI_SEVERITY_CONFIG.find((item) => item.key === key) ??
      NDVI_UNKNOWN_CONFIG
    );
  }, [ndviKeyParam]);

  const routeNdviValue = useMemo(() => {
    if (!ndviScoreParam) {
      return null;
    }
    const parsed = Number(ndviScoreParam);
    return Number.isFinite(parsed) ? parsed : null;
  }, [ndviScoreParam]);

  const heroSeverity = useMemo<SeverityLevel>(() => {
    if (routeClassification) {
      return classificationToSeverity[
        routeClassification.key as NdviClassificationKey
      ];
    }
    if (!analysis) {
      return "success";
    }
    return evaluateNdviSeverity(analysis.ndviCurrent);
  }, [analysis, routeClassification]);

  const heroGradientColors = heroGradientPalette[heroSeverity];

  useEffect(() => {
    if (routeNdviValue === null) {
      return;
    }
    setAnalysis((prev) => {
      if (!prev || prev.ndviCurrent === routeNdviValue) {
        return prev;
      }
      return { ...prev, ndviCurrent: routeNdviValue };
    });
  }, [routeNdviValue]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!id || typeof id !== "string") {
        setErrorMessage("Parameter lahan tidak ditemukan.");
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage(null);
        setIsLoading(true);
        const record = await lahanService.getLahanDetail(id);
        if (!isMounted) return;

        if (!record) {
          setErrorMessage("Data lahan tidak ditemukan.");
          setIsLoading(false);
          return;
        }

        const centroid = extractCentroid(record);
        if (!centroid) {
          setErrorMessage("Koordinat lahan tidak valid.");
          setIsLoading(false);
          return;
        }

        setDetail(record);
        setAnalysis(
          computeAnalysis(centroid, record.area_ha, record.created_at)
        );
      } catch (error: any) {
        if (!isMounted) return;
        console.error("❌ Detail lahan error:", error);
        const message: string = error?.message ?? "Gagal memuat detail lahan.";
        setErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const headerSubtitle = useMemo(() => {
    if (!detail?.created_at) return "--";
    const planted = new Date(detail.created_at);
    return `${planted.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })} tanggal ditanam`;
  }, [detail?.created_at]);

  const harvestCountdownLabel = useMemo(() => {
    if (!analysis) return "--";
    return `${analysis.daysToHarvest} hari lagi menuju panen`;
  }, [analysis]);

  const harvestProgressLabel = useMemo(() => {
    if (!analysis) return "--";
    const completed = Math.round(
      analysis.harvestProgress * analysis.harvestCycleDays
    );
    return `${completed}/${analysis.harvestCycleDays}`;
  }, [analysis]);

  const healthMetrics = useMemo(() => {
    if (!analysis) return [];

    const ndviSeverity = evaluateNdviSeverity(analysis.ndviCurrent);
    const trendSeverity = evaluateTrendSeverity(analysis.ndviTrendPercent);
    const pestSeverity = evaluateRiskSeverity(analysis.pestPressure);

    return [
      {
        key: "ndvi",
        title: "Nilai NDVI",
        value: formatNdviValue(analysis.ndviCurrent),
        caption: healthSeverityLabels[ndviSeverity],
        palette: severityPalette[ndviSeverity],
      },
      {
        key: "trend",
        title: "Tren 7 Hari",
        value: `${
          analysis.ndviTrendPercent >= 0 ? "+" : ""
        }${analysis.ndviTrendPercent.toFixed(1)}%`,
        caption:
          analysis.ndviTrendPercent >= 0
            ? "Membaik"
            : trendSeverity === "warning"
            ? "Menurun Tipis"
            : "Menurun Tajam",
        palette: severityPalette[trendSeverity],
      },
      {
        key: "pest",
        title: "Serangan Hama",
        value: formatPercent(analysis.pestPressure),
        caption: riskSeverityLabels[pestSeverity],
        palette: severityPalette[pestSeverity],
      },
    ];
  }, [analysis]);

  const riskMetrics = useMemo(() => {
    if (!analysis) return [];

    const pestSeverity = evaluateRiskSeverity(analysis.pestPressure);
    const diseaseSeverity = evaluateRiskSeverity(analysis.diseaseRisk);
    const stressSeverity = evaluateRiskSeverity(analysis.stressIndex);

    return [
      {
        key: "pest",
        title: "Serangan Hama",
        value: formatPercent(analysis.pestPressure),
        caption: riskSeverityLabels[pestSeverity],
        palette: severityPalette[pestSeverity],
      },
      {
        key: "disease",
        title: "Risiko Penyakit",
        value: formatPercent(analysis.diseaseRisk),
        caption: riskSeverityLabels[diseaseSeverity],
        palette: severityPalette[diseaseSeverity],
      },
      {
        key: "stress",
        title: "Stres Tanaman",
        value: formatPercent(analysis.stressIndex),
        caption: riskSeverityLabels[stressSeverity],
        palette: severityPalette[stressSeverity],
      },
    ];
  }, [analysis]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="auto" />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.backButtonWrapper}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color="#1B5E20" />
              <Text style={styles.backButtonText}>Kembali ke Daftar Lahan</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroContainer}>
            <ImageBackground
              source={
                detail?.thumbnail_url
                  ? { uri: detail.thumbnail_url }
                  : DEFAULT_LAHAN_THUMBNAIL
              }
              style={styles.heroImageBackground}
              imageStyle={styles.heroImage}
              resizeMode="cover"
            >
              <LinearGradient
                colors={heroGradientColors}
                style={styles.heroGradient}
              >
                <View style={styles.heroContent}>
                  <Text style={styles.fieldName}>
                    {detail?.name ?? "Ladang"}
                  </Text>
                  <Text style={styles.fieldMeta}>
                    {detail?.area_ha
                      ? `${detail.area_ha.toFixed(2)} ha | ${headerSubtitle}`
                      : headerSubtitle}
                  </Text>
                  <View style={styles.harvestRow}>
                    <Text style={styles.harvestCountdown}>
                      {harvestCountdownLabel}
                    </Text>
                    <Text style={styles.harvestProgressValue}>
                      {harvestProgressLabel}
                    </Text>
                  </View>
                  <View style={styles.harvestProgressBar}>
                    <View
                      style={[
                        styles.harvestProgressFill,
                        {
                          width: `${clamp(
                            (analysis?.harvestProgress ?? 0) * 100,
                            2,
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </View>

          <View style={styles.tabSwitchContainer}>
            <TouchableOpacity
              style={[
                styles.tabSwitch,
                activeTab === "health" && styles.tabSwitchActive,
              ]}
              onPress={() => setActiveTab("health")}
            >
              <Text
                style={[
                  styles.tabSwitchText,
                  activeTab === "health" && styles.tabSwitchTextActive,
                ]}
              >
                Kesehatan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabSwitch,
                activeTab === "risk" && styles.tabSwitchActive,
              ]}
              onPress={() => setActiveTab("risk")}
            >
              <Text
                style={[
                  styles.tabSwitchText,
                  activeTab === "risk" && styles.tabSwitchTextActive,
                ]}
              >
                Risiko
              </Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={styles.loadingText}>Memuat detail lahan…</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Gagal Memuat Data</Text>
              <Text style={styles.errorMessage}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setIsLoading(true);
                  setErrorMessage(null);
                  setDetail(null);
                  setAnalysis(null);
                  setTimeout(() => {
                    if (id) {
                      lahanService
                        .getLahanDetail(String(id))
                        .then((record) => {
                          if (!record) {
                            setErrorMessage("Data lahan tidak ditemukan.");
                            return;
                          }
                          const centroid = extractCentroid(record);
                          if (!centroid) {
                            setErrorMessage("Koordinat lahan tidak valid.");
                            return;
                          }
                          setDetail(record);
                          setAnalysis(
                            computeAnalysis(
                              centroid,
                              record.area_ha,
                              record.created_at
                            )
                          );
                        })
                        .catch((error: any) => {
                          console.error("❌ Detail lahan error:", error);
                          setErrorMessage(
                            error?.message ?? "Gagal memuat detail lahan."
                          );
                        })
                        .finally(() => setIsLoading(false));
                    }
                  }, 300);
                }}
              >
                <Text style={styles.retryText}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          ) : analysis ? (
            <>
              {activeTab === "health" ? (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>
                    Grafik Kesehatan (1 Bulan)
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Nilai NDVI mingguan berdasarkan koordinat lahan
                  </Text>
                  <View style={styles.chartContainer}>
                    <MiniAreaChart data={analysis.ndviHistory} />
                  </View>
                  <View style={styles.chartLegendRow}>
                    <Text style={styles.chartLegendLabel}>
                      Pekan ini vs Pekan lalu:
                    </Text>
                    <Text
                      style={[
                        styles.chartLegendValue,
                        {
                          color:
                            analysis.ndviWeekChange >= 0
                              ? "#2E7D32"
                              : "#C62828",
                        },
                      ]}
                    >
                      {analysis.ndviWeekChange >= 0 ? "+" : ""}
                      {(analysis.ndviWeekChange * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.chartAxisRow}>
                    <Text style={styles.axisLabel}>Bahaya (&lt; 0.6)</Text>
                    <Text style={styles.axisLabel}>Stres (0.6-0.8)</Text>
                    <Text style={styles.axisLabel}>Sehat (&gt; 0.8)</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.sectionCard}>
                  <Text
                    style={[styles.sectionTitle, styles.sectionTitleCentered]}
                  >
                    Profil Risiko Tanaman
                  </Text>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      styles.sectionSubtitleCentered,
                    ]}
                  >
                    Evaluasi berbasis lokasi untuk risiko utama
                  </Text>
                  <View style={styles.metricsRow}>
                    {riskMetrics.map((metric) => (
                      <View
                        key={metric.key}
                        style={[
                          styles.metricPill,
                          {
                            backgroundColor: metric.palette.background,
                            borderColor: metric.palette.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.metricPillLabel,
                            { color: metric.palette.text },
                          ]}
                        >
                          {metric.title}
                        </Text>
                        <Text
                          style={[
                            styles.metricPillValue,
                            { color: metric.palette.text },
                          ]}
                        >
                          {metric.value}
                        </Text>
                        <Text
                          style={[
                            styles.metricPillStatus,
                            { color: metric.palette.text },
                          ]}
                        >
                          {metric.caption}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {activeTab === "health" ? (
                <>
                  <View style={styles.statusCard}>
                    <Text style={styles.statusTitle}>
                      Status Kesehatan Tanaman
                    </Text>
                    <View style={styles.statusMetricsRow}>
                      {healthMetrics.map((metric, index) => (
                        <View
                          key={metric.key}
                          style={[
                            styles.statusMetricBox,
                            index === healthMetrics.length - 1 &&
                              styles.statusMetricBoxLast,
                            {
                              backgroundColor: metric.palette.background,
                              borderColor: metric.palette.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusMetricLabel,
                              { color: metric.palette.text },
                            ]}
                          >
                            {metric.title}
                          </Text>
                          <Text
                            style={[
                              styles.statusMetricValue,
                              { color: metric.palette.text },
                            ]}
                          >
                            {metric.value}
                          </Text>
                          <Text
                            style={[
                              styles.statusMetricCaption,
                              { color: metric.palette.text },
                            ]}
                          >
                            {metric.caption}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.noticeCard}>
                      <View style={styles.noticeHeader}>
                        <Ionicons name="warning" size={20} color="#C62828" />
                        <Text style={styles.noticeTitle}>Deteksi Anomali</Text>
                      </View>
                      <Text style={styles.noticeDescription}>
                        {analysis.anomalyDetected
                          ? `Perubahan NDVI signifikan: ${analysis.anomalySummary}`
                          : "Tidak ada anomali signifikan terdeteksi."}
                      </Text>

                      <View style={styles.tipCard}>
                        <Ionicons name="bulb" size={20} color="#2E7D32" />
                        <View style={styles.tipTextContainer}>
                          <Text style={styles.tipTitle}>Tips</Text>
                          {NDVI_TIPS.map((tip, index) => (
                            <View key={index} style={styles.tipListItem}>
                              <Text style={styles.tipListBullet}>•</Text>
                              <Text style={styles.tipDescription}>{tip}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      <View style={styles.extendedMetricsRow}>
                        <View style={styles.extendedMetricBox}>
                          <Text style={styles.extendedMetricLabel}>
                            Nilai Tertinggi
                          </Text>
                          <Text style={styles.extendedMetricValue}>
                            {formatPercent(analysis.ndviHighest, 1)}
                          </Text>
                          <Text style={styles.extendedMetricCaption}>
                            30 hari
                          </Text>
                        </View>
                        <View style={styles.extendedMetricBox}>
                          <Text style={styles.extendedMetricLabel}>
                            Nilai Terendah
                          </Text>
                          <Text style={styles.extendedMetricValue}>
                            {formatPercent(analysis.ndviLowest, 1)}
                          </Text>
                          <Text style={styles.extendedMetricCaption}>
                            30 hari
                          </Text>
                        </View>
                        <View style={styles.extendedMetricBox}>
                          <Text style={styles.extendedMetricLabel}>
                            Nilai Rata-rata
                          </Text>
                          <Text style={styles.extendedMetricValue}>
                            {formatPercent(analysis.ndviAverage, 1)}
                          </Text>
                          <Text style={styles.extendedMetricCaption}>
                            30 hari
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.recommendationCard}>
                    <View style={styles.recommendationHeader}>
                      <View style={styles.recommendationBadge}>
                        <Text style={styles.recommendationBadgeIcon}>✅</Text>
                      </View>
                      <View style={styles.recommendationTitleWrapper}>
                        <Text style={styles.recommendationTitle}>
                          Rekomendasi Tindakan
                        </Text>
                        <Text style={styles.recommendationSubtitle}>
                          NDVI = Indikator Hijau Tanaman
                        </Text>
                      </View>
                    </View>
                    {analysis.recommendations.map((item, index) => (
                      <View key={index} style={styles.recommendationItem}>
                        <Text style={styles.recommendationBullet}>•</Text>
                        <Text style={styles.recommendationText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.standaloneCardWrapper}>
                    <View style={styles.noticeCard}>
                      <View style={styles.noticeHeader}>
                        <Ionicons name="analytics" size={20} color="#2E7D32" />
                        <Text style={styles.noticeTitle}>
                          Analisis Risiko Detail
                        </Text>
                      </View>
                      <Text style={styles.noticeDescription}>
                        Evaluasi risiko dihitung dari koordinat lahan (
                        {analysis.centroid.latitude.toFixed(4)}° LS,
                        {analysis.centroid.longitude.toFixed(4)}° BT)
                        menggunakan fungsi logistik kelembaban tanah, NDVI dan
                        pola sinyal vegetasi harian.
                      </Text>

                      <View style={styles.extendedMetricsRow}>
                        <View style={styles.extendedMetricBox}>
                          <Text style={styles.extendedMetricLabel}>
                            Indeks Kelembaban
                          </Text>
                          <Text style={styles.extendedMetricValue}>
                            {formatPercent(analysis.moistureIndex)}
                          </Text>
                          <Text style={styles.extendedMetricCaption}>
                            Model sin(ar)
                          </Text>
                        </View>
                        <View style={styles.extendedMetricBox}>
                          <Text style={styles.extendedMetricLabel}>
                            Risiko Penyakit
                          </Text>
                          <Text style={styles.extendedMetricValue}>
                            {formatPercent(analysis.diseaseRisk)}
                          </Text>
                          <Text style={styles.extendedMetricCaption}>
                            Logistik NDVI
                          </Text>
                        </View>
                        <View style={styles.extendedMetricBox}>
                          <Text style={styles.extendedMetricLabel}>
                            Kelembaban Tanah
                          </Text>
                          <Text style={styles.extendedMetricValue}>
                            {formatPercent(analysis.soilMoisture)}
                          </Text>
                          <Text style={styles.extendedMetricCaption}>
                            NDVI x Lat/Lon
                          </Text>
                        </View>
                      </View>

                      <View style={styles.tipCard}>
                        <Ionicons name="shield" size={20} color="#2E7D32" />
                        <View style={styles.tipTextContainer}>
                          <Text style={styles.tipTitle}>Pencegahan</Text>
                          <Text style={styles.tipDescription}>
                            {analysis.pestAlert}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.recommendationCard}>
                    <View style={styles.recommendationHeader}>
                      <View
                        style={[
                          styles.recommendationBadge,
                          styles.recommendationBadgeWarning,
                        ]}
                      >
                        <Text style={styles.recommendationBadgeIcon}>⚠️</Text>
                      </View>
                      <View style={styles.recommendationTitleWrapper}>
                        <Text style={styles.recommendationTitle}>
                          Langkah Mitigasi Risiko
                        </Text>
                        <Text style={styles.recommendationSubtitle}>
                          Prioritaskan tindakan berbasis data
                        </Text>
                      </View>
                    </View>
                    <View style={styles.recommendationItem}>
                      <Text style={styles.recommendationBullet}>•</Text>
                      <Text style={styles.recommendationText}>
                        {analysis.moistureIndex < 0.5
                          ? "Tambahkan jadwal irigasi tambahan dan gunakan mulsa organik untuk menahan kelembaban."
                          : "Pertahankan jadwal irigasi dan pantau kelembaban dengan sensor tanah."}
                      </Text>
                    </View>
                    <View style={styles.recommendationItem}>
                      <Text style={styles.recommendationBullet}>•</Text>
                      <Text style={styles.recommendationText}>
                        {analysis.diseaseRisk > 0.55
                          ? "Lakukan rotasi fungisida preventif dan jaga sirkulasi udara antar tanaman."
                          : "Jaga sanitasi lahan dan lakukan inspeksi mingguan untuk deteksi dini penyakit."}
                      </Text>
                    </View>
                    <View style={styles.recommendationItem}>
                      <Text style={styles.recommendationBullet}>•</Text>
                      <Text style={styles.recommendationText}>
                        {analysis.pestPressure > 0.6
                          ? "Pasang perangkap feromon dan kombinasikan dengan agen hayati (Trichogramma)."
                          : "Lanjutkan monitoring rutin dan catat populasi hama setiap pekan."}
                      </Text>
                    </View>
                    <View style={styles.recommendationItem}>
                      <Text style={styles.recommendationBullet}>•</Text>
                      <Text style={styles.recommendationText}>
                        {analysis.stressIndex > 0.6
                          ? "Tambahkan pemupukan daun berunsur mikro untuk membantu pemulihan cepat."
                          : "Pertahankan pola pemupukan seimbang dan cek pH tanah tiap bulan."}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f2ed",
  },
  container: {
    flex: 1,
    backgroundColor: "#f0f2ed",
  },
  scrollContent: {
    paddingBottom: 48,
  },
  heroContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  heroImageBackground: {
    minHeight: 240,
    justifyContent: "flex-end",
  },
  heroImage: {
    borderRadius: 24,
  },
  heroGradient: {
    flex: 1,
    borderRadius: 24,
    paddingTop: 48,
    minHeight: 240,
    justifyContent: "flex-end",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "#1B5E20",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  backButtonText: {
    color: "#1B5E20",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  backButtonWrapper: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  heroContent: {
    padding: 20,
  },
  fieldName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
  },
  fieldMeta: {
    color: "#f1f8e9",
    fontSize: 14,
    marginBottom: 16,
  },
  harvestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  harvestCountdown: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  harvestProgressValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  harvestProgressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 4,
    overflow: "hidden",
  },
  harvestProgressFill: {
    height: "100%",
    backgroundColor: "#C8E6C9",
    borderRadius: 4,
  },
  tabSwitchContainer: {
    flexDirection: "row",
    backgroundColor: "#e0e3dc",
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 4,
    marginTop: 16,
  },
  tabSwitch: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 20,
  },
  tabSwitchActive: {
    backgroundColor: "#2E7D32",
  },
  tabSwitchText: {
    fontSize: 15,
    color: "#5d5f58",
    fontWeight: "600",
  },
  tabSwitchTextActive: {
    color: "#fff",
  },
  loadingContainer: {
    marginTop: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#555",
  },
  errorContainer: {
    margin: 24,
    padding: 20,
    backgroundColor: "#fff5f5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#c62828",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#b71c1c",
    marginBottom: 16,
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#2E7D32",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  standaloneCardWrapper: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E7D32",
  },
  sectionTitleCentered: {
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#7a7c74",
    marginTop: 2,
  },
  sectionSubtitleCentered: {
    textAlign: "center",
  },
  chartContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  chartLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  chartLegendLabel: {
    fontSize: 13,
    color: "#333",
  },
  chartLegendValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  chartAxisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  axisLabel: {
    fontSize: 11,
    color: "#7a7c74",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  metricPill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
  },
  metricPillLabel: {
    fontSize: 13,
    color: "#424242",
    textAlign: "center",
  },
  metricPillValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2E7D32",
    marginVertical: 6,
    textAlign: "center",
  },
  metricPillStatus: {
    fontSize: 12,
    color: "#616161",
    textAlign: "center",
  },
  statusCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    textAlign: "center",
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 16,
  },
  statusMetricsRow: {
    textAlign: "center",
    flexDirection: "row",
    marginBottom: 20,
  },
  statusMetricBox: {
    flex: 1,
    textAlign: "center",
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  statusMetricBoxLast: {
    marginRight: 0,
  },
  statusMetricLabel: {
    fontSize: 12,
    color: "#2E7D32",
    marginBottom: 6,
    textAlign: "center",
  },
  statusMetricValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1B5E20",
    textAlign: "center",
  },
  statusMetricCaption: {
    fontSize: 12,
    color: "#33691E",
    marginTop: 4,
    textAlign: "center",
  },
  noticeCard: {
    backgroundColor: "#F9FBF6",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E6D8",
    marginTop: 12,
    alignSelf: "stretch",
    width: "100%",
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2E7D32",
    marginLeft: 8,
  },
  noticeDescription: {
    fontSize: 13,
    color: "#4E583E",
  },
  tipCard: {
    marginTop: 12,
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 12,
  },
  tipTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
  },
  tipDescription: {
    fontSize: 13,
    color: "#2E7D32",
    flex: 1,
  },
  tipListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },
  tipListBullet: {
    fontSize: 16,
    color: "#2E7D32",
    marginRight: 8,
    lineHeight: 18,
  },
  extendedMetricsRow: {
    flexDirection: "row",
    marginTop: 16,
    justifyContent: "space-between",
  },
  extendedMetricBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E6D8",
  },
  extendedMetricLabel: {
    fontSize: 13,
    color: "#2E7D32",
  },
  extendedMetricValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "700",
    color: "#1B5E20",
  },
  extendedMetricCaption: {
    fontSize: 12,
    color: "#7a7c74",
    marginTop: 4,
  },
  recommendationCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  recommendationBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  recommendationBadgeWarning: {
    backgroundColor: "#FFF3E0",
  },
  recommendationBadgeIcon: {
    fontSize: 20,
  },
  recommendationTitleWrapper: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7D32",
  },
  recommendationSubtitle: {
    fontSize: 12,
    color: "#7a7c74",
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  recommendationBullet: {
    fontSize: 16,
    color: "#2E7D32",
    marginRight: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: "#4E583E",
  },
});

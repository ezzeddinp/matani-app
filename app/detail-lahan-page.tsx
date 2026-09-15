import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observationChartX } from "@/utils/observation-chart";
import { shouldStartMeasurement } from "@/utils/measurement-start";
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import Svg, { Circle, G, Line, Text as SvgText } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { lahanService, supabase, type LahanDetail } from "@/hooks/supabase";
import {
  describeBackendError,
  requestLahanMeasurement,
} from "@/utils/backend-api";

type ObservationState = "measured" | "unavailable";
type IndexKey = "ndvi" | "ndmi";

type ObservationRecord = {
  id: string;
  lahan_id: string;
  ndvi_score: number | null;
  ndmi_score: number | null;
  status: string | null;
  captured_at: string | null;
  created_at: string | null;
  rejection_reason?: string | null;
  ndvi_valid_pixel_count?: number | null;
  ndmi_valid_pixel_count?: number | null;
  data_state?: string | null;
};

type TimelinePoint = {
  id: string;
  timestamp: string;
  ndvi: number | null;
  ndmi: number | null;
  state: ObservationState;
  qualityStatus: string;
  rejectionReason: string | null;
  ndviValidPixelCount: number | null;
  ndmiValidPixelCount: number | null;
};

const PADI_IMAGE = require("@/assets/foto-ladang/padi.jpg");
const CHART_WIDTH = 320;
const CHART_HEIGHT = 190;
const CHART_PADDING = 30;
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const parseValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const resolveTimestamp = (record: ObservationRecord) => record.captured_at;

const resolveState = (status: string | null): ObservationState => {
  const normalized = status?.trim().toLowerCase();
  return normalized === "passed" ? "measured" : "unavailable";
};

const QUALITY_STATUS_COPY: Record<
  string,
  { label: string; description: string }
> = {
  passed: {
    label: "Data tersedia",
    description: "Citra lolos pemeriksaan kualitas dan nilai indeks dapat ditampilkan.",
  },
  rejected: {
    label: "Tidak lolos kualitas",
    description: "Citra ditemukan, tetapi nilainya tidak ditampilkan karena pemeriksaan kualitas.",
  },
  unavailable: {
    label: "Tidak tersedia",
    description: "Tidak ada nilai yang dapat ditampilkan untuk tanggal ini.",
  },
};

const REJECTION_REASON_COPY: Record<string, string> = {
  "no-acquisition-in-window": "Tidak ada citra Sentinel-2 pada rentang pengamatan.",
  "no-valid-pixels": "Tidak ada pixel lahan yang lolos penyaringan kualitas.",
  "too-few-valid-pixels": "Pixel lahan yang dapat dihitung belum cukup untuk menghasilkan nilai.",
  "source-identity-missing": "Identitas sumber citra belum lengkap.",
  "source-identity-mismatch": "Identitas sumber citra tidak cocok dengan hasil pengukuran.",
  "catalog-acquisition-date-invalid": "Tanggal pengambilan citra tidak valid.",
  "process-catalog-response-invalid": "Daftar citra dari penyedia tidak dapat dibaca.",
  "process-raster-statistics-invalid": "Hasil perhitungan raster tidak dapat divalidasi.",
  "process-source-identity-invalid": "Identitas sumber hasil pengukuran tidak dapat divalidasi.",
};

const getQualityStatusCopy = (status: string) =>
  QUALITY_STATUS_COPY[status.trim().toLowerCase()] ?? QUALITY_STATUS_COPY.unavailable;

const formatRejectionReason = (reason: string | null) => {
  if (!reason) return null;
  return REJECTION_REASON_COPY[reason.trim().toLowerCase()] ??
    "Nilai tidak ditampilkan karena hasil belum memenuhi kontrak kualitas Matani.";
};

const formatValue = (value: number | null) =>
  value === null ? "--" : value.toFixed(3);

const formatDate = (value: string) => {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Tanggal tidak valid";
  return dateFormatter.format(timestamp);
};

const formatArea = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(2)} ha`
    : "Luas belum tersedia";

function ObservationChart({
  points,
  indexKey,
}: {
  points: TimelinePoint[];
  indexKey: IndexKey;
}) {
  const validPoints = points
    .map((point) => ({ ...point, value: point[indexKey] }))
    .filter(
      (point): point is TimelinePoint & { value: number } =>
        typeof point.value === "number" && Number.isFinite(point.value)
    );

  if (validPoints.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Ionicons name="analytics-outline" size={28} color="#94A3B8" />
        <Text style={styles.chartEmptyTitle}>
          Belum ada titik {indexKey.toUpperCase()}
        </Text>
        <Text style={styles.chartEmptyText}>
          Grafik tidak dibuat sampai ada rekaman tersimpan dengan tanggal observasi.
        </Text>
      </View>
    );
  }

  const minValue = Math.min(...validPoints.map((point) => point.value));
  const maxValue = Math.max(...validPoints.map((point) => point.value));
  const span = Math.max(maxValue - minValue, 0.1);
  const chartInnerWidth = CHART_WIDTH - CHART_PADDING * 2;
  const chartInnerHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const coordinates = validPoints.map((point) => ({
    ...point,
    x: observationChartX(point.timestamp, validPoints[0].timestamp, validPoints[validPoints.length - 1].timestamp, CHART_PADDING, chartInnerWidth),
    y: CHART_PADDING + ((maxValue - point.value) / span) * chartInnerHeight,
  }));

  return (
    <View style={styles.chartFrame}>
      <Svg
        width="100%"
        height={CHART_HEIGHT}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        accessibilityLabel={`Grafik deret waktu ${indexKey.toUpperCase()}`}
      >
        {[0, 0.5, 1].map((ratio) => {
          const y = CHART_PADDING + ratio * chartInnerHeight;
          const value = maxValue - ratio * span;
          return (
            <G key={ratio}>
              <Line
                x1={CHART_PADDING}
                y1={y}
                x2={CHART_WIDTH - CHART_PADDING}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth={1}
              />
              <SvgText x={2} y={y + 4} fontSize={9} fill="#64748B">
                {value.toFixed(2)}
              </SvgText>
            </G>
          );
        })}
        {coordinates.map((point) => (
          <Circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r={5}
            fill={point.state === "unavailable" ? "#F59E0B" : "#FFFFFF"}
            stroke={indexKey === "ndvi" ? "#15803D" : "#0369A1"}
            strokeWidth={3}
          />
        ))}
      </Svg>
      <View style={styles.chartAxisRow}>
        <Text style={styles.chartAxisText}>{formatDate(validPoints[0].timestamp)}</Text>
        <Text style={styles.chartAxisText}>
          {formatDate(validPoints[validPoints.length - 1].timestamp)}
        </Text>
      </View>
    </View>
  );
}

export default function DetailLahanPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const fieldId = Array.isArray(id) ? id[0] : id;
  const [detail, setDetail] = useState<LahanDetail | null>(null);
  const [observations, setObservations] = useState<TimelinePoint[]>([]);
  const [activeIndex, setActiveIndex] = useState<IndexKey>("ndvi");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [observationErrorMessage, setObservationErrorMessage] = useState<string | null>(
    null
  );
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobAttempts, setJobAttempts] = useState<number | null>(null);
  const [jobErrorCode, setJobErrorCode] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isRequestingMeasurement, setIsRequestingMeasurement] = useState(false);
  const automaticField = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      if (!fieldId) {
        setErrorMessage("Parameter lahan tidak ditemukan.");
        setIsLoading(false);
        return;
      }

      try {
        if (refreshTick === 0) setIsLoading(true);
        setErrorMessage(null);
        setObservationErrorMessage(null);
        if (refreshTick === 0) {
          setDetail(null);
          setObservations([]);
        }
        const [field, observationResult, jobResult] = await Promise.all([
          lahanService.getLahanDetail(fieldId),
          supabase
            .from("measurement_observations")
            .select("id,lahan_id,ndvi_score,ndmi_score,status,rejection_reason,captured_at,created_at,ndvi_valid_pixel_count,ndmi_valid_pixel_count,data_state")
            .eq("lahan_id", fieldId)
            .order("captured_at", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true }),
          supabase
            .from("measurement_jobs")
            .select("status,attempts,error_code,created_at,updated_at")
            .eq("lahan_id", fieldId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!active) return;
        if (!field) {
          setErrorMessage("Data lahan tidak ditemukan.");
          return;
        }

        setDetail(field);
        const latestJob = jobResult.data as
          | {
              status?: string | null;
              attempts?: number | null;
              error_code?: string | null;
              updated_at?: string | null;
            }
          | null;
        setJobStatus(latestJob?.status ?? null);
        setJobAttempts(latestJob?.attempts ?? null);
        setJobErrorCode(latestJob?.error_code ?? null);
        if (jobResult.error) {
          console.error("Gagal memuat status job pengukuran:", jobResult.error);
          setObservationErrorMessage(
            "Status job pengukuran gagal dimuat. Metadata lahan tetap tersedia."
          );
        }
        if (observationResult.error) {
          console.error("Gagal memuat riwayat observasi lahan:", observationResult.error);
          setObservationErrorMessage(
            "Riwayat observasi gagal dimuat. Batas dan metadata lahan tetap tersimpan."
          );
          return;
        }

        const timeline = (observationResult.data as ObservationRecord[])
          .map((record) => {
            const timestamp = resolveTimestamp(record);
            if (!timestamp || Number.isNaN(Date.parse(timestamp))) return null;
            return {
              id: record.id,
              timestamp,
              ndvi: parseValue(record.ndvi_score),
              ndmi: parseValue(record.ndmi_score),
              state: resolveState(record.status),
              qualityStatus: record.status ?? "unavailable",
              rejectionReason: record.rejection_reason ?? null,
              ndviValidPixelCount: parseValue(record.ndvi_valid_pixel_count),
              ndmiValidPixelCount: parseValue(record.ndmi_valid_pixel_count),
            } satisfies TimelinePoint;
          })
          .filter((point): point is TimelinePoint => point !== null);

        setObservations(timeline);
        setIsLoading(false);
        if (
          !jobResult.error &&
          automaticField.current !== fieldId &&
          shouldStartMeasurement(timeline.length, latestJob)
        ) {
          automaticField.current = fieldId;
          setIsRequestingMeasurement(true);
          try {
            await requestLahanMeasurement(fieldId);
            if (active) setRefreshTick((value) => value + 1);
          } catch (error) {
            if (active) setObservationErrorMessage(
              `Pengukuran otomatis belum berhasil. ${describeBackendError(error)}`,
            );
          } finally {
            if (active) setIsRequestingMeasurement(false);
          }
        } else if (["queued", "processing"].includes(latestJob?.status ?? "")) {
          retryTimer = setTimeout(() => {
            if (active) setRefreshTick((value) => value + 1);
          }, 4_000);
        }
      } catch (error) {
        if (!active) return;
        console.error("Gagal memuat data lahan:", error);
        setErrorMessage("Data lahan tidak dapat dimuat.");
      } finally {
        if (active && refreshTick === 0) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [fieldId, refreshTick]);

  const retryMeasurement = useCallback(async () => {
    if (!fieldId || isRequestingMeasurement) return;
    try {
      setIsRequestingMeasurement(true);
      await requestLahanMeasurement(fieldId);
      setRefreshTick((value) => value + 1);
    } catch (error) {
      console.error("Gagal meminta pengukuran lahan:", error);
      setObservationErrorMessage(
        `Job pengukuran belum dapat dijalankan. ${describeBackendError(error)}`
      );
    } finally {
      setIsRequestingMeasurement(false);
    }
  }, [fieldId, isRequestingMeasurement]);

  const latest = observations.findLast(
    (point) => point.ndvi !== null || point.ndmi !== null
  ) ?? null;
  const activeValues = useMemo(
    () =>
      observations
        .map((point) => point[activeIndex])
        .filter((value): value is number => value !== null),
    [activeIndex, observations]
  );
  const unavailableCount = observations.filter(
    (point) => point.state === "unavailable"
  ).length;
  const queuedWithoutAttempt =
    jobStatus === "queued" && (jobAttempts ?? 0) === 0;
  const measurementIsProcessing = jobStatus === "processing" || isRequestingMeasurement;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#166534" />
        <Text style={styles.loadingText}>Memuat deret waktu...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage || !detail) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="dark" />
        <Ionicons name="cloud-offline-outline" size={36} color="#64748B" />
        <Text style={styles.errorTitle}>Data tidak tersedia</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Pressable
          style={({ pressed }) => [styles.backAction, pressed && { opacity: 0.2 }]}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={styles.backActionText}>Kembali</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <ImageBackground source={PADI_IMAGE} style={styles.hero} resizeMode="cover">
          <View style={styles.heroOverlay} />
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.2 }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.heroCopy}>
            <Text style={styles.cropLabel}>PADI</Text>
            <Text style={styles.heroTitle}>{detail.name}</Text>
            <View style={styles.heroFooter}>
              <Text style={styles.heroMeta}>{formatArea(detail.area_ha)}</Text>
              <Pressable
                style={({ pressed }) => [styles.openMapButton, pressed && { opacity: 0.78 }]}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/explore",
                    params: {
                      focusLahanId: detail.id,
                      focusRequest: String(Date.now()),
                    },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Lihat ${detail.name} di peta`}
              >
                <Ionicons name="navigate-outline" size={17} color="#FFFFFF" />
                <Text style={styles.openMapButtonText}>Lihat di peta</Text>
              </Pressable>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.noticeBand}>
          <Ionicons name="time-outline" size={20} color="#075985" />
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Deret waktu observasi</Text>
            <Text style={styles.noticeText}>
              Nilai ditampilkan apa adanya menurut tanggal rekaman. Matani tidak
              menerjemahkannya menjadi diagnosis kesehatan, hama, penyakit, stres,
              atau prediksi hasil.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>REKAMAN TERSIMPAN</Text>
              <Text style={styles.sectionTitle}>Perubahan indeks</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{observations.length} titik</Text>
            </View>
          </View>

          <View style={styles.segmentedControl}>
            {(["ndvi", "ndmi"] as IndexKey[]).map((key) => (
              <Pressable
                key={key}
                style={({ pressed }) => [
                    styles.segmentButton,
                    activeIndex === key && styles.segmentButtonActive,
                    pressed && { opacity: 0.2 },
                  ]}
                onPress={() => setActiveIndex(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeIndex === key }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeIndex === key && styles.segmentTextActive,
                  ]}
                >
                  {key.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <ObservationChart points={observations} indexKey={activeIndex} />

          <View style={styles.metricRow}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Terbaru</Text>
              <Text style={styles.metricValue}>
                {formatValue(latest?.[activeIndex] ?? null)}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Minimum</Text>
              <Text style={styles.metricValue}>
                {activeValues.length ? Math.min(...activeValues).toFixed(3) : "--"}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Maksimum</Text>
              <Text style={styles.metricValue}>
                {activeValues.length ? Math.max(...activeValues).toFixed(3) : "--"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>KRONOLOGI</Text>
          <Text style={styles.sectionTitle}>Observasi per tanggal</Text>
          <View style={styles.timelineGuide}>
            <View style={styles.timelineGuideIcon}>
              <Ionicons name="information-circle-outline" size={20} color="#166534" />
            </View>
            <View style={styles.timelineGuideCopy}>
              <Text style={styles.timelineGuideTitle}>Cara membaca kronologi</Text>
              <Text style={styles.timelineGuideText}>
                Satu kartu mewakili satu tanggal pengambilan citra. NDVI adalah indeks vegetasi dan NDMI adalah indeks kelembapan. Bandingkan indeks yang sama antar tanggal; angka ini bukan diagnosis kondisi padi.
              </Text>
              <View style={styles.timelineGuideHint}>
                <Text style={styles.timelineGuideHintText}>
                  Tanda -- berarti nilai sengaja tidak ditampilkan karena tidak tersedia atau tidak lolos kualitas.
                </Text>
              </View>
            </View>
          </View>
          {observations.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Ionicons
                name={observationErrorMessage ? "cloud-offline-outline" : "calendar-outline"}
                size={30}
                color="#94A3B8"
              />
              <Text style={styles.emptyTimelineTitle}>
                {observationErrorMessage
                  ? "Riwayat observasi gagal dimuat"
                  : measurementIsProcessing
                  ? "Pengukuran sedang diproses"
                  : queuedWithoutAttempt
                  ? "Menyiapkan pengukuran otomatis"
                  : "Belum ada riwayat observasi"}
              </Text>
              <Text style={styles.emptyTimelineText}>
                {observationErrorMessage ??
                  (measurementIsProcessing
                    ? "Matani sedang mengambil raster Sentinel-2 dan menghitung pixel valid. Halaman ini memeriksa hasil secara otomatis."
                    : queuedWithoutAttempt
                    ? "Matani menjalankan pengukuran otomatis dan memeriksa hasilnya berkala."
                    : `Batas lahan tersimpan, tetapi belum ada citra yang lolos kualitas${jobErrorCode ? ` (${jobErrorCode})` : ""}. Matani tidak membuat data pengganti.`)}
              </Text>
              {!measurementIsProcessing && (
                <Pressable
                  style={({ pressed }) => [
                    styles.backAction,
                    pressed && !isRequestingMeasurement && { opacity: 0.2 },
                  ]}
                  onPress={() => void retryMeasurement()}
                  disabled={isRequestingMeasurement}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isRequestingMeasurement }}
                >
                  {isRequestingMeasurement ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.backActionText}>
                      Coba lagi
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          ) : (
            observations
              .slice()
              .reverse()
              .map((point) => {
                const qualityCopy = getQualityStatusCopy(point.qualityStatus);
                const rejectionCopy = formatRejectionReason(point.rejectionReason);
                return (
                  <View key={point.id} style={styles.timelineRow}>
                    <View
                      style={[
                        styles.timelineDot,
                        point.state === "unavailable" && styles.timelineDotFixture,
                      ]}
                    />
                    <View style={styles.timelineCopy}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineDate}>{formatDate(point.timestamp)}</Text>
                      <Text
                        style={[
                          styles.stateLabel,
                          point.state === "unavailable" && styles.stateLabelFixture,
                        ]}
                      >
                        {qualityCopy.label}
                      </Text>
                    </View>
                    <Text style={styles.timelineStatusDescription}>{qualityCopy.description}</Text>
                    <View style={styles.timelineMetricRow}>
                      <View style={styles.timelineMetric}>
                        <Text style={styles.timelineMetricLabel}>NDVI</Text>
                        <Text style={styles.timelineMetricNdvi}>{formatValue(point.ndvi)}</Text>
                      </View>
                      <View style={styles.timelineMetricDivider} />
                      <View style={styles.timelineMetric}>
                        <Text style={styles.timelineMetricLabel}>NDMI</Text>
                        <Text style={styles.timelineMetricNdmi}>{formatValue(point.ndmi)}</Text>
                      </View>
                    </View>
                    <Text style={styles.timelineValues}>
                      Pixel lahan yang dapat dihitung: NDVI {point.ndviValidPixelCount ?? "--"} · NDMI {point.ndmiValidPixelCount ?? "--"}
                    </Text>
                    {rejectionCopy && (
                      <View style={styles.rejectionPanel}>
                        <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
                        <Text style={styles.rejectionText}>{rejectionCopy}</Text>
                      </View>
                    )}
                    </View>
                  </View>
                );
              })
          )}
        </View>

        <View style={styles.provenanceBand}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#92400E" />
          <Text style={styles.provenanceText}>
            {unavailableCount > 0
              ? `${unavailableCount} citra ditolak/tidak tersedia dan tidak ditampilkan sebagai nilai.`
              : "Nilai pada halaman ini berasal dari measurement CDSE yang tersimpan dengan provenance sumber."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F8FAFC" },
  loadingText: { marginTop: 12, color: "#475569", fontSize: 14 },
  errorTitle: { marginTop: 12, fontSize: 20, fontWeight: "700", color: "#0F172A" },
  errorText: { marginTop: 6, color: "#64748B", textAlign: "center" },
  backAction: { marginTop: 20, backgroundColor: "#166534", paddingHorizontal: 20, paddingVertical: 12 },
  backActionText: { color: "#FFFFFF", fontWeight: "700" },
  content: { paddingBottom: 36 },
  hero: { height: 230, justifyContent: "space-between", padding: 18 },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(5, 30, 16, 0.48)" },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15, 23, 42, 0.55)" },
  heroCopy: { maxWidth: "100%" },
  cropLabel: { color: "#BBF7D0", fontSize: 12, fontWeight: "800" },
  heroTitle: { color: "#FFFFFF", fontSize: 30, fontWeight: "800", marginTop: 5 },
  heroFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10 },
  heroMeta: { color: "#E2E8F0", fontSize: 14, flexShrink: 1 },
  openMapButton: { minHeight: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#166534", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  openMapButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  noticeBand: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#E0F2FE", borderBottomWidth: 1, borderBottomColor: "#BAE6FD" },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: "#075985", fontSize: 14, fontWeight: "800" },
  noticeText: { color: "#0C4A6E", fontSize: 12, lineHeight: 18, marginTop: 3 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sectionEyebrow: { color: "#64748B", fontSize: 10, fontWeight: "800" },
  sectionTitle: { color: "#0F172A", fontSize: 20, fontWeight: "800", marginTop: 4 },
  countBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  countBadgeText: { color: "#166534", fontSize: 12, fontWeight: "800" },
  segmentedControl: { flexDirection: "row", backgroundColor: "#E2E8F0", marginTop: 18, padding: 3, borderRadius: 12 },
  segmentButton: { flex: 1, height: 38, alignItems: "center", justifyContent: "center" },
  segmentButtonActive: { backgroundColor: "#FFFFFF", borderRadius: 9 },
  segmentText: { color: "#64748B", fontSize: 13, fontWeight: "800" },
  segmentTextActive: { color: "#166534" },
  chartFrame: { marginTop: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", paddingTop: 8, borderRadius: 14, overflow: "hidden" },
  chartAxisRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 10 },
  chartAxisText: { color: "#64748B", fontSize: 10 },
  chartEmpty: { height: 210, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", marginTop: 14 },
  chartEmptyTitle: { color: "#334155", fontSize: 14, fontWeight: "700", marginTop: 8 },
  chartEmptyText: { color: "#64748B", fontSize: 12, textAlign: "center", lineHeight: 18, marginTop: 4 },
  metricRow: { flexDirection: "row", marginTop: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", paddingVertical: 14, borderRadius: 14 },
  metricBlock: { flex: 1, alignItems: "center" },
  metricDivider: { width: 1, backgroundColor: "#E2E8F0" },
  metricLabel: { color: "#64748B", fontSize: 10, fontWeight: "700" },
  metricValue: { color: "#0F172A", fontSize: 18, fontWeight: "800", marginTop: 4 },
  emptyTimeline: { alignItems: "center", marginTop: 14, padding: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  emptyTimelineTitle: { color: "#334155", fontWeight: "700", marginTop: 8 },
  emptyTimelineText: { color: "#64748B", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 5 },
  timelineGuide: { flexDirection: "row", gap: 11, marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" },
  timelineGuideIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#DCFCE7" },
  timelineGuideCopy: { flex: 1 },
  timelineGuideTitle: { color: "#14532D", fontSize: 13, fontWeight: "800" },
  timelineGuideText: { color: "#166534", fontSize: 12, lineHeight: 18, marginTop: 4 },
  timelineGuideHint: { marginTop: 9, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#BBF7D0" },
  timelineGuideHintText: { color: "#475569", fontSize: 11, lineHeight: 16 },
  timelineRow: { flexDirection: "row", gap: 12, marginTop: 12, padding: 15, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0284C7", marginTop: 5 },
  timelineDotFixture: { backgroundColor: "#F59E0B" },
  timelineCopy: { flex: 1 },
  timelineHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  timelineDate: { color: "#0F172A", fontSize: 13, fontWeight: "700", flex: 1 },
  timelineStatusDescription: { color: "#64748B", fontSize: 11, lineHeight: 16, marginTop: 6 },
  timelineMetricRow: { flexDirection: "row", alignItems: "center", marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: "#F8FAFC" },
  timelineMetric: { flex: 1 },
  timelineMetricDivider: { width: 1, height: 34, marginHorizontal: 12, backgroundColor: "#CBD5E1" },
  timelineMetricLabel: { color: "#64748B", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  timelineMetricNdvi: { color: "#15803D", fontSize: 19, fontWeight: "800", marginTop: 2 },
  timelineMetricNdmi: { color: "#0369A1", fontSize: 19, fontWeight: "800", marginTop: 2 },
  timelineValues: { color: "#475569", fontSize: 11, lineHeight: 16, marginTop: 9 },
  stateLabel: { color: "#0369A1", backgroundColor: "#E0F2FE", fontSize: 9, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  stateLabelFixture: { color: "#92400E", backgroundColor: "#FEF3C7" },
  rejectionPanel: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  rejectionText: { flex: 1, color: "#78350F", fontSize: 11, lineHeight: 16 },
  provenanceBand: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 24, padding: 14, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  provenanceText: { flex: 1, color: "#78350F", fontSize: 12, lineHeight: 18 },
});

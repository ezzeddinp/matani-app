import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from "react-native-svg";
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
  return normalized === "passed" || normalized === "rejected"
    ? "measured"
    : "unavailable";
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
  const coordinates = validPoints.map((point, index) => ({
    ...point,
    x:
      CHART_PADDING +
      (validPoints.length === 1
        ? chartInnerWidth / 2
        : (index / (validPoints.length - 1)) * chartInnerWidth),
    y: CHART_PADDING + ((maxValue - point.value) / span) * chartInnerHeight,
  }));
  const linePoints = coordinates.map((point) => `${point.x},${point.y}`).join(" ");

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
        {coordinates.length > 1 && (
          <Polyline
            points={linePoints}
            fill="none"
            stroke={indexKey === "ndvi" ? "#15803D" : "#0369A1"}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
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
        if (["queued", "processing"].includes(latestJob?.status ?? "")) {
          retryTimer = setTimeout(() => {
            if (active) setRefreshTick((value) => value + 1);
          }, 4_000);
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
  const measurementIsProcessing = jobStatus === "processing";

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
        <TouchableOpacity style={styles.backAction} onPress={() => router.back()}>
          <Text style={styles.backActionText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <ImageBackground source={PADI_IMAGE} style={styles.hero} resizeMode="cover">
          <View style={styles.heroOverlay} />
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            accessibilityLabel="Kembali"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.heroCopy}>
            <Text style={styles.cropLabel}>PADI</Text>
            <Text style={styles.heroTitle}>{detail.name}</Text>
            <Text style={styles.heroMeta}>{formatArea(detail.area_ha)}</Text>
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
              <TouchableOpacity
                key={key}
                style={[
                  styles.segmentButton,
                  activeIndex === key && styles.segmentButtonActive,
                ]}
                onPress={() => setActiveIndex(key)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeIndex === key && styles.segmentTextActive,
                  ]}
                >
                  {key.toUpperCase()}
                </Text>
              </TouchableOpacity>
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
                  ? "Pengukuran belum dijalankan"
                  : "Belum ada riwayat observasi"}
              </Text>
              <Text style={styles.emptyTimelineText}>
                {observationErrorMessage ??
                  (measurementIsProcessing
                    ? "Matani sedang mengambil raster Sentinel-2 dan menghitung pixel valid. Halaman ini memeriksa hasil secara otomatis."
                    : queuedWithoutAttempt
                    ? "Job sudah tersimpan, tetapi worker belum pernah mencobanya. Jalankan job antrean tanpa membuat lahan baru."
                    : `Batas lahan tersimpan, tetapi belum ada acquisition yang lolos kualitas${jobErrorCode ? ` (${jobErrorCode})` : ""}. Matani tidak membuat data pengganti.`)}
              </Text>
              {!measurementIsProcessing && (
                <TouchableOpacity
                  style={styles.backAction}
                  onPress={() => void retryMeasurement()}
                  disabled={isRequestingMeasurement}
                >
                  {isRequestingMeasurement ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.backActionText}>
                      {queuedWithoutAttempt
                        ? "Jalankan job antrean"
                        : "Jalankan pengukuran"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            observations
              .slice()
              .reverse()
              .map((point) => (
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
                        {point.qualityStatus.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.timelineValues}>
                      NDVI {formatValue(point.ndvi)}   NDMI {formatValue(point.ndmi)}
                    </Text>
                    <Text style={styles.timelineValues}>
                      Pixel valid: NDVI {point.ndviValidPixelCount ?? "--"} · NDMI {point.ndmiValidPixelCount ?? "--"}
                      {point.rejectionReason ? ` · ${point.rejectionReason}` : ""}
                    </Text>
                  </View>
                </View>
              ))
          )}
        </View>

        <View style={styles.provenanceBand}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#92400E" />
          <Text style={styles.provenanceText}>
            {unavailableCount > 0
              ? `${unavailableCount} acquisition ditolak/tidak tersedia dan tidak ditampilkan sebagai nilai.`
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
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5, 30, 16, 0.48)" },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15, 23, 42, 0.55)" },
  heroCopy: { maxWidth: "90%" },
  cropLabel: { color: "#BBF7D0", fontSize: 12, fontWeight: "800" },
  heroTitle: { color: "#FFFFFF", fontSize: 30, fontWeight: "800", marginTop: 5 },
  heroMeta: { color: "#E2E8F0", fontSize: 14, marginTop: 6 },
  noticeBand: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#E0F2FE", borderBottomWidth: 1, borderBottomColor: "#BAE6FD" },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: "#075985", fontSize: 14, fontWeight: "800" },
  noticeText: { color: "#0C4A6E", fontSize: 12, lineHeight: 18, marginTop: 3 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sectionEyebrow: { color: "#64748B", fontSize: 10, fontWeight: "800" },
  sectionTitle: { color: "#0F172A", fontSize: 20, fontWeight: "800", marginTop: 4 },
  countBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 6 },
  countBadgeText: { color: "#166534", fontSize: 12, fontWeight: "800" },
  segmentedControl: { flexDirection: "row", backgroundColor: "#E2E8F0", marginTop: 18, padding: 3 },
  segmentButton: { flex: 1, height: 38, alignItems: "center", justifyContent: "center" },
  segmentButtonActive: { backgroundColor: "#FFFFFF" },
  segmentText: { color: "#64748B", fontSize: 13, fontWeight: "800" },
  segmentTextActive: { color: "#166534" },
  chartFrame: { marginTop: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", paddingTop: 8 },
  chartAxisRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 10 },
  chartAxisText: { color: "#64748B", fontSize: 10 },
  chartEmpty: { height: 210, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", marginTop: 14 },
  chartEmptyTitle: { color: "#334155", fontSize: 14, fontWeight: "700", marginTop: 8 },
  chartEmptyText: { color: "#64748B", fontSize: 12, textAlign: "center", lineHeight: 18, marginTop: 4 },
  metricRow: { flexDirection: "row", marginTop: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", paddingVertical: 14 },
  metricBlock: { flex: 1, alignItems: "center" },
  metricDivider: { width: 1, backgroundColor: "#E2E8F0" },
  metricLabel: { color: "#64748B", fontSize: 10, fontWeight: "700" },
  metricValue: { color: "#0F172A", fontSize: 18, fontWeight: "800", marginTop: 4 },
  emptyTimeline: { alignItems: "center", marginTop: 14, padding: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  emptyTimelineTitle: { color: "#334155", fontWeight: "700", marginTop: 8 },
  emptyTimelineText: { color: "#64748B", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 5 },
  timelineRow: { flexDirection: "row", gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0284C7", marginTop: 5 },
  timelineDotFixture: { backgroundColor: "#F59E0B" },
  timelineCopy: { flex: 1 },
  timelineHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  timelineDate: { color: "#0F172A", fontSize: 13, fontWeight: "700", flex: 1 },
  timelineValues: { color: "#475569", fontSize: 13, marginTop: 5 },
  stateLabel: { color: "#0369A1", backgroundColor: "#E0F2FE", fontSize: 9, fontWeight: "800", paddingHorizontal: 7, paddingVertical: 4 },
  stateLabelFixture: { color: "#92400E", backgroundColor: "#FEF3C7" },
  provenanceBand: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 24, padding: 14, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  provenanceText: { flex: 1, color: "#78350F", fontSize: 12, lineHeight: 18 },
});

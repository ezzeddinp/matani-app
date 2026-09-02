import { formatNdviValue } from "@/constants/ndvi";
import {
  deriveSummaryIconKey,
  getWeatherIconSource,
} from "@/utils/weather-icons";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { API_BASE_CANDIDATES } from "@/hooks/config";
import {
  lahanService,
  lahanThumbnailService,
  supabase,
  type LahanThumbnail,
  type LahanWithInfo,
} from "@/hooks/supabase";
import {
  authenticatedBackendFetch,
  readBackendJson,
  retainMostUsefulBackendError,
} from "@/utils/backend-api";

interface WeatherCardProps {
  location: string;
  temperature: number | null;
  highTemp: number | null;
  lowTemp: number | null;
  humidity: number | null;
  rainfall: number | null;
  pressure: number | null;
  windSpeed: number | null;
}

interface SavedLahanCardProps {
  name: string;
  areaHa: number | null;
  ndviScore?: number | null;
  capturedAt?: string | null;
  dataState?: "measured" | "unavailable";
  thumbnailUrl?: string | null;
  category?: string | null;
  warningCount?: number;
  note?: string | null;
  onPress?: () => void;
}

// Cuaca murni
interface WeatherData {
  location: string;
  temperature: number | null;
  highTemp: number | null;
  lowTemp: number | null;
  humidity: number | null;
  rainfall: number | null;
  pressure: number | null;
  windSpeed: number | null;
}

interface SavedLahan {
  id: string;
  name: string;
  areaHa: number | null;
  thumbnailUrl: string | null;
  category?: string | null;
  warningCount?: number;
  latestNote?: string | null;
}

interface LahanNoteRecord {
  id: string;
  lahan_id: string | null;
  title: string;
  content: string;
  created_at: string;
}

type LahanHealthRecord = {
  id: string;
  lahan_id: string;
  ndvi_score: number | null;
  ndmi_score?: number | null;
  status: string | null;
  captured_at: string | null;
  created_at: string | null;
};

type LahanHealthSummary = {
  ndviScore: number | null;
  capturedAt: string | null;
  dataState: "measured" | "unavailable";
};

const getObservationState = (
  status?: string | null
): "measured" | "unavailable" => {
  const normalized = status?.trim().toLowerCase();
  return normalized === "passed" ? "measured" : "unavailable";
};

const parseDateToTime = (value?: string | null) => {
  if (!value) {
    return 0;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
};

const displayDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatDisplayDate = (value?: string | null) => {
  if (!value) {
    return "--";
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return "--";
  }
  try {
    return displayDateFormatter.format(time);
  } catch (error) {
    console.warn("Gagal memformat tanggal catatan:", error);
    return "--";
  }
};

const formatGeocodedLocation = (
  place?: Location.LocationGeocodedAddress | null
) => {
  if (!place) return null;

  const candidateParts = [
    place.subregion,
    place.city,
    place.district,
    place.region,
    place.country,
  ];

  const uniqueParts: string[] = [];
  candidateParts.forEach((part) => {
    if (!part) return;
    const normalised = part.trim();
    if (!normalised) return;
    const alreadyIncluded = uniqueParts.some(
      (existing) =>
        existing.localeCompare(normalised, undefined, {
          sensitivity: "accent",
          usage: "search",
        }) === 0
    );
    if (!alreadyIncluded) {
      uniqueParts.push(normalised);
    }
  });

  if (uniqueParts.length === 0) {
    return null;
  }

  return uniqueParts.slice(0, 3).join(", ");
};

const parseOptionalNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const WeatherCard = ({
  location,
  temperature,
  highTemp,
  lowTemp,
  humidity,
  rainfall,
  pressure,
  windSpeed,
}: WeatherCardProps) => {
  const summaryIconKey = deriveSummaryIconKey({
    rainfall,
    humidity,
    temperature,
  });
  const summaryIconSource = getWeatherIconSource(summaryIconKey);

  return (
    <View style={styles.weatherCard}>
      <View style={styles.weatherSummaryRow}>
        <View style={styles.weatherSummaryText}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#202020" />
            <Text style={styles.locationText}>{location || "N/A"}</Text>
          </View>
          <View style={styles.primaryTempRow}>
            <Text style={styles.primaryTemperature}>
              {temperature !== null ? `${Math.round(temperature)}°` : "--"}
            </Text>
            <View style={styles.tempDelimiter}>
              <Text style={styles.tempDetail}>
                H: {highTemp !== null ? `${Math.round(highTemp)}°` : "--"}
              </Text>
              <Text style={styles.tempDetail}>
                L: {lowTemp !== null ? `${Math.round(lowTemp)}°` : "--"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.weatherIconPill}>
          <Image source={summaryIconSource} style={styles.weatherIconImage} />
        </View>
      </View>

      <View style={styles.weatherDivider} />

      <View style={styles.weatherMetricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {humidity !== null ? `${Math.round(humidity)}%` : "--"}
          </Text>
          <Text style={styles.metricLabel}>Kelembaban</Text>
        </View>
        <View style={styles.metricSeparator} />
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {rainfall !== null ? `${rainfall.toFixed(1)}` : "--"}
          </Text>
          <Text style={styles.metricLabel}>Hujan (mm)</Text>
        </View>
        <View style={styles.metricSeparator} />
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {pressure !== null ? `${Math.round(pressure)}` : "--"}
          </Text>
          <Text style={styles.metricLabel}>Tekanan</Text>
        </View>
        <View style={styles.metricSeparator} />
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {windSpeed !== null ? `${windSpeed.toFixed(1)}` : "--"}
          </Text>
          <Text style={styles.metricLabel}>Angin</Text>
        </View>
      </View>
    </View>
  );
};

const { width } = Dimensions.get("window");

// Category images mapping
const PADI_IMAGE = require("@/assets/foto-ladang/padi.jpg");

const LahanCard = ({
  name,
  areaHa,
  ndviScore,
  capturedAt,
  dataState,
  thumbnailUrl,
  category,
  warningCount = 0,
  note,
  onPress,
}: SavedLahanCardProps) => {
  const ndviValue = parseOptionalNumber(ndviScore);
  const hasObservation = ndviValue !== null;
  const statusLabel = hasObservation
    ? `Rekaman terukur${
        capturedAt ? ` · ${formatDisplayDate(capturedAt)}` : ""
      }`
    : "Observasi belum tersedia";
  const statusColor = hasObservation ? "#075985" : "#64748B";

  // Truncate note with "..."
  const displayNote =
    note && note.trim().length > 0
      ? note.length > 30
        ? `${note.substring(0, 30)}...`
        : note
      : "-";

  return (
    <View style={styles.fieldCardContainer}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => pressed && { opacity: 0.88 }}
        accessibilityRole="button"
        accessibilityState={{ disabled: !onPress }}
      >
        <View style={styles.fieldCard}>
          {/* Top Section with Category Image */}
          <ImageBackground
            source={PADI_IMAGE}
            style={styles.fieldCardTop}
            resizeMode="cover"
            imageStyle={{
              borderTopLeftRadius: 11,
              borderTopRightRadius: 11,
            }}
          >
            <View style={styles.fieldCategoryBadge}>
              <Text style={styles.fieldCategoryText}>
                {category?.toLowerCase() === "padi" ? "Padi" : "Scope lama"}
              </Text>
            </View>

            {warningCount > 0 && (
              <View style={styles.fieldWarningBadge}>
                <Ionicons name="warning" size={10} color="#ffffff" />
                <Text style={styles.fieldWarningCount}>{warningCount}</Text>
              </View>
            )}
          </ImageBackground>

          {/* Bottom Section - Info */}
          <View style={styles.fieldCardBottom}>
            <Text style={[styles.fieldStatusLabel, { color: statusColor }]}>
              {statusLabel}
            </Text>
            <Text style={styles.fieldNameLabel} numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.fieldCardFooter}>
              <Text style={styles.fieldNoteLabel} numberOfLines={1}>
                {displayNote}
              </Text>
              <Ionicons name="chevron-forward" size={12} color="#8f8f8f" />
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [, setUserName] = useState<string>("Petani");
  const [, setProfileImageUri] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData>({
    location: "Memuat lokasi...",
    temperature: null,
    highTemp: null,
    lowTemp: null,
    humidity: null,
    rainfall: null,
    pressure: null,
    windSpeed: null,
  });
  const [loading, setLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const fallbackUserId = process.env.EXPO_PUBLIC_SUPABASE_DEFAULT_USER_ID;

  const [savedLahan, setSavedLahan] = useState<SavedLahan[]>([]);
  const [, setLahanError] = useState<string | null>(null);
  const [lahanLoading, setLahanLoading] = useState(false);
  const [lahanHealthMap, setLahanHealthMap] = useState<
    Record<string, LahanHealthSummary>
  >({});
  const [notes, setNotes] = useState<LahanNoteRecord[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [, setNotesError] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedNoteLahanId, setSelectedNoteLahanId] = useState<string | null>(
    null
  );
  const [isLahanPickerVisible, setIsLahanPickerVisible] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [selectedLahanId, setSelectedLahanId] = useState<string | null>(null);
  const [showLahanPicker, setShowLahanPicker] = useState(false);
  const lahanNameLookup = useMemo(() => {
    const map = new Map<string, string>();
    savedLahan.forEach((item) => {
      map.set(item.id, item.name);
    });
    return map;
  }, [savedLahan]);

  const notesWithMetadata = useMemo(() => {
    return notes.map((note) => ({
      ...note,
      lahanName: note.lahan_id
        ? lahanNameLookup.get(note.lahan_id) ?? null
        : null,
    }));
  }, [lahanNameLookup, notes]);

  const selectedNoteLahanName = useMemo(() => {
    if (!selectedNoteLahanId) {
      return null;
    }
    return lahanNameLookup.get(selectedNoteLahanId) ?? null;
  }, [lahanNameLookup, selectedNoteLahanId]);

  const selectedLahanName = useMemo(() => {
    if (!selectedLahanId) {
      return null;
    }
    return lahanNameLookup.get(selectedLahanId) ?? null;
  }, [lahanNameLookup, selectedLahanId]);

  const isNoteFormValid = useMemo(() => {
    return noteTitle.trim().length > 0 && noteContent.trim().length > 0;
  }, [noteContent, noteTitle]);

  useEffect(() => {
    let isMounted = true;
    const loadUserProfile = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!isMounted) {
          return;
        }

        const user = data?.user;
        if (user) {
          const fullName = (
            user.user_metadata?.full_name as string | undefined
          )?.trim();
          const email = user.email ?? undefined;
          const fallbackName = email ? email.split("@")[0] : undefined;
          const displayName = fullName || fallbackName || "Petani";

          setUserName(displayName);
          setProfileImageUri(
            `https://ui-avatars.com/api/?background=8BC34A&color=ffffff&name=${encodeURIComponent(
              displayName
            )}`
          );
        } else {
          setUserName("Petani");
          setProfileImageUri(null);
        }
      } catch (error) {
        console.warn("Gagal memuat profil pengguna dari Supabase", error);
        if (isMounted) {
          setUserName("Petani");
          setProfileImageUri(null);
        }
      }
    };

    loadUserProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // Function untuk ambil cuaca real dari backend
  const fetchWeatherData = async (latitude: number, longitude: number) => {
    try {
      // Fetch weather data
      console.log(`🌦 Fetching weather for ${latitude}, ${longitude}`);

      const params = `?lat=${latitude}&lon=${longitude}`;
      let data: any = null;
      let lastErrorMessage = "";

      outer: for (const base of API_BASE_CANDIDATES) {
        const normalisedBase = base.replace(/\/$/, "");
        const candidateUrls = [
          `${normalisedBase}/weather${params}`,
          /\/api\/?$/.test(normalisedBase)
            ? null
            : `${normalisedBase}/api/weather${params}`,
        ].filter(Boolean) as string[];

        for (const url of candidateUrls) {
          try {
            const response = await authenticatedBackendFetch(url);
            data = await readBackendJson(response);
            console.log("Weather data fetched from", url);
            break outer;
          } catch (networkError) {
            lastErrorMessage = retainMostUsefulBackendError(
              lastErrorMessage,
              networkError
            );
            console.warn(
              `⚠️ Weather request network error for ${url}:`,
              lastErrorMessage
            );
          }
        }
      }

      if (!data) {
        throw new Error(lastErrorMessage || "Failed to fetch weather");
      }

      const parseNumber = (value: unknown): number | null => {
        if (typeof value === "number") return value;
        if (typeof value === "string") {
          const parsed = parseFloat(value);
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      };

      return {
        location: typeof data.location === "string" ? data.location : "",
        temperature: parseNumber(data.temperature),
        highTemp: parseNumber(data.highTemp),
        lowTemp: parseNumber(data.lowTemp),
        humidity: parseNumber(data.humidity),
        rainfall: parseNumber(data.rainfall),
        pressure: parseNumber(data.pressure),
        windSpeed: parseNumber(data.windSpeed),
        dailyForecasts: Array.isArray((data as any).forecast)
          ? (data as any).forecast.map((item: any) => ({
              isoDate: typeof item?.isoDate === "string" ? item.isoDate : null,
              highTemp: parseNumber(item?.highTemp),
              lowTemp: parseNumber(item?.lowTemp),
              precipitationMm: parseNumber(item?.precipitationMm),
            }))
          : undefined,
      };
    } catch (err) {
      console.error("❌ Weather fetch error:", err);
      return null;
    }
  };

  const loadSavedLahan = useCallback(async () => {
    setLahanLoading(true);
    try {
      setLahanError(null);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? "";
        if (message.includes("Auth session missing")) {
          setSavedLahan([]);
          setLahanError("Login untuk menyimpan lahan Anda.");
          return;
        }
        throw authError;
      }

      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) {
        setSavedLahan([]);
        setLahanError("Login untuk menyimpan lahan Anda.");
        return;
      }

      const lahanList = (await lahanService.getLahanByUser(
        userId
      )) as LahanWithInfo[];
      const lahanIds = Array.isArray(lahanList)
        ? lahanList.map((item) => item.id).filter(Boolean)
        : [];
      const isAuthenticatedUser = Boolean(authData?.user?.id);
      let thumbnailMap: Record<string, string | null> = {};

      if (isAuthenticatedUser && lahanIds.length > 0) {
        try {
          const metadata = await Promise.all(
            lahanIds.map(async (id) => {
              try {
                const thumbnails =
                  await lahanThumbnailService.getThumbnailsByLahan(id);
                const latest = thumbnails?.[0] as LahanThumbnail | undefined;
                return { id, url: latest?.public_url ?? null };
              } catch (thumbError) {
                console.warn(
                  "Gagal memuat metadata thumbnail lahan:",
                  thumbError
                );
                return { id, url: null };
              }
            })
          );

          thumbnailMap = metadata.reduce<Record<string, string | null>>(
            (acc, item) => {
              acc[item.id] = item.url;
              return acc;
            },
            {}
          );
        } catch (error) {
          console.warn("Gagal memuat metadata thumbnail lahan:", error);
        }
      }
      // Load latest notes for each lahan
      let notesMap: Record<string, string> = {};
      if (isAuthenticatedUser && lahanIds.length > 0) {
        try {
          const { data: notesData } = await supabase
            .from("lahan_notes")
            .select("lahan_id, content, created_at")
            .in("lahan_id", lahanIds)
            .order("created_at", { ascending: false });

          if (notesData && Array.isArray(notesData)) {
            const latestNotes = new Map<string, string>();
            notesData.forEach((note: any) => {
              if (
                note.lahan_id &&
                note.content &&
                !latestNotes.has(note.lahan_id)
              ) {
                latestNotes.set(note.lahan_id, note.content);
              }
            });
            notesMap = Object.fromEntries(latestNotes);
          }
        } catch (error) {
          console.warn("Gagal memuat notes lahan:", error);
        }
      }

      const normalized: SavedLahan[] = Array.isArray(lahanList)
        ? lahanList.map((item: LahanWithInfo) => {
            const rawArea = item.area_ha;
            let areaValue: number | null = null;
            if (rawArea !== null && rawArea !== undefined) {
              const parsed =
                typeof rawArea === "number"
                  ? rawArea
                  : Number.parseFloat(String(rawArea));
              areaValue = Number.isFinite(parsed) ? parsed : null;
            }

            return {
              id: item.id,
              name: item.name,
              areaHa: areaValue,
              thumbnailUrl:
                typeof item.thumbnail_url === "string" &&
                item.thumbnail_url.length > 0
                  ? item.thumbnail_url
                  : thumbnailMap[item.id] ?? null,
              category: item.category ?? null,
              warningCount: 0,
              latestNote: notesMap[item.id] ?? null,
            };
          })
        : [];

      setSavedLahan(normalized);
      if (!normalized.length) {
        setLahanError("Belum ada lahan tersimpan.");
      } else {
        setLahanError(null);
      }
    } catch (error) {
      console.error("Gagal memuat lahan tersimpan:", error);
      setSavedLahan([]);
      const message =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "";
      if (
        message.includes("Auth session missing") ||
        message.toLowerCase().includes("permission denied")
      ) {
        setLahanError("Belum ada lahan tersimpan.");
      } else {
        setLahanError("Gagal memuat data lahan.");
      }
    } finally {
      setLahanLoading(false);
    }
  }, [fallbackUserId]);

  const loadLahanHealth = useCallback(async (targetIds: string[]) => {
    if (!Array.isArray(targetIds) || targetIds.length === 0) {
      setLahanHealthMap({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from("measurement_observations")
        .select("id,lahan_id,ndvi_score,ndmi_score,status,captured_at,created_at")
        .in("lahan_id", targetIds)
        .order("captured_at", { ascending: false, nullsFirst: true })
        .order("created_at", { ascending: false, nullsFirst: true });

      if (error) {
        throw error;
      }

      const latestEntries = new Map<string, LahanHealthRecord>();
      (Array.isArray(data) ? (data as LahanHealthRecord[]) : []).forEach(
        (record) => {
          if (!record?.lahan_id) {
            return;
          }

          const existing = latestEntries.get(record.lahan_id);
          if (!existing) {
            latestEntries.set(record.lahan_id, record);
            return;
          }

          const recordTime = Math.max(
            parseDateToTime(record.captured_at),
            parseDateToTime(record.created_at)
          );
          const existingTime = Math.max(
            parseDateToTime(existing.captured_at),
            parseDateToTime(existing.created_at)
          );

          if (recordTime >= existingTime) {
            latestEntries.set(record.lahan_id, record);
          }
        }
      );

      const next = targetIds.reduce<Record<string, LahanHealthSummary>>(
        (acc, id) => {
          const record = latestEntries.get(id);
          if (record) {
            const parsedScore = parseOptionalNumber(record.ndvi_score);
            const capturedAt = record.captured_at ?? null;
            acc[id] = {
              ndviScore: capturedAt ? parsedScore : null,
              capturedAt,
              dataState: getObservationState(record.status),
            };
          }
          return acc;
        },
        {}
      );

      setLahanHealthMap(next);
    } catch (error) {
      console.error("Gagal memuat observasi lahan:", error);
      setLahanHealthMap({});
    }
  }, []);

  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      setNotesError(null);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? "";
        if (message.includes("Auth session missing")) {
          setNotes([]);
          setNotesError("Login untuk melihat catatan lapangan.");
          return;
        }
        throw authError;
      }

      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) {
        setNotes([]);
        setNotesError("Login untuk melihat catatan lapangan.");
        return;
      }

      const { data, error } = await supabase
        .from("lahan_notes")
        .select("id,lahan_id,title,content,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) {
        throw error;
      }

      setNotes(Array.isArray(data) ? (data as LahanNoteRecord[]) : []);
    } catch (error) {
      console.error("Gagal memuat catatan lapangan:", error);
      setNotes([]);
      setNotesError("Belum ada catatan yang dapat ditampilkan.");
    } finally {
      setNotesLoading(false);
    }
  }, [fallbackUserId]);

  const resetNoteForm = () => {
    setNoteTitle("");
    setNoteContent("");
    setSelectedNoteLahanId(null);
  };

  const closeNoteModal = () => {
    setShowNoteModal(false);
    setIsLahanPickerVisible(false);
  };

  const handleOpenNoteModal = () => {
    if (!selectedNoteLahanId && savedLahan.length > 0) {
      setSelectedNoteLahanId(savedLahan[0].id);
    }
    setShowNoteModal(true);
    setIsLahanPickerVisible(false);
  };

  const handleCancelNote = () => {
    resetNoteForm();
    closeNoteModal();
  };

  const handleSelectNoteLahan = (id: string | null) => {
    setSelectedNoteLahanId(id);
    setIsLahanPickerVisible(false);
  };

  const handleSaveNote = async () => {
    const trimmedTitle = noteTitle.trim();
    const trimmedContent = noteContent.trim();

    if (!trimmedTitle || !trimmedContent) {
      Alert.alert(
        "Catatan belum lengkap",
        "Judul dan isi catatan wajib diisi."
      );
      return;
    }

    if (isSavingNote) {
      return;
    }

    try {
      setIsSavingNote(true);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? "";
        if (message.includes("Auth session missing")) {
          Alert.alert("Perlu masuk", "Login untuk menyimpan catatan baru.");
          closeNoteModal();
          return;
        }
        throw authError;
      }

      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) {
        Alert.alert("Perlu masuk", "Login untuk menyimpan catatan baru.");
        closeNoteModal();
        return;
      }

      const { error } = await supabase.from("lahan_notes").insert([
        {
          user_id: userId,
          lahan_id: selectedNoteLahanId,
          title: trimmedTitle,
          content: trimmedContent,
        },
      ]);

      if (error) {
        throw error;
      }

      await loadNotes();
      resetNoteForm();
      closeNoteModal();
    } catch (error: any) {
      console.error("Gagal menyimpan catatan:", error);
      const message =
        error?.message ?? "Terjadi kesalahan saat menyimpan catatan.";
      Alert.alert("Gagal menyimpan catatan", message);
    } finally {
      setIsSavingNote(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSavedLahan();
      loadNotes();
    }, [loadNotes, loadSavedLahan])
  );

  useEffect(() => {
    const ids = savedLahan.map((item) => item.id);
    const timeoutId = setTimeout(() => void loadLahanHealth(ids), 0);
    return () => clearTimeout(timeoutId);
  }, [savedLahan, loadLahanHealth]);

  // Auto-assign first lahan if only one exists
  useEffect(() => {
    if (savedLahan.length !== 1 || selectedLahanId) return;
    const timeoutId = setTimeout(() => setSelectedLahanId(savedLahan[0].id), 0);
    return () => clearTimeout(timeoutId);
  }, [savedLahan, selectedLahanId]);

  useEffect(() => {
    let isMounted = true;

    const fetchLocationAndWeather = async () => {
      try {
        console.log("Requesting location permission...");
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          console.log("Location permission denied");
          if (isMounted) {
            Alert.alert(
              "Izin Lokasi Diperlukan",
              "Aktifkan izin lokasi agar data cuaca dan ladang tampil akurat."
            );
            setWeatherData((prev) => ({
              ...prev,
              location: "Izin lokasi belum diberikan",
            }));
          }
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled && isMounted) {
          Alert.alert(
            "Layanan Lokasi Nonaktif",
            "Aktifkan GPS atau layanan lokasi perangkat Anda untuk akurasi terbaik."
          );
        }

        let position: Location.LocationObject | null = null;

        try {
          position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            mayShowUserSettingsDialog: true,
          });
        } catch (positionError) {
          console.warn(
            "Primary location fetch failed, trying last known position",
            positionError
          );
          position = await Location.getLastKnownPositionAsync();
        }

        if (!position) {
          throw new Error("LOCATION_UNAVAILABLE");
        }

        const { latitude, longitude } = position.coords;
        console.log(`User location: ${latitude}, ${longitude}`);

        let locationName = "Lokasi tidak diketahui";
        try {
          const geocoded = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          locationName =
            formatGeocodedLocation(geocoded?.[0] ?? null) ??
            `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;
        } catch (reverseError) {
          console.warn("Reverse geocoding failed", reverseError);
        }

        if (isMounted) {
          setWeatherData((prev) => ({
            ...prev,
            location: locationName,
          }));
        }

        const weather = await fetchWeatherData(latitude, longitude);

        if (isMounted) {
          if (weather) {
            setWeatherError(null);
            setWeatherData((prev) => ({
              location: locationName,
              temperature: weather.temperature ?? prev.temperature,
              highTemp: weather.highTemp ?? prev.highTemp,
              lowTemp: weather.lowTemp ?? prev.lowTemp,
              humidity: weather.humidity ?? prev.humidity,
              rainfall: weather.rainfall ?? prev.rainfall,
              pressure: weather.pressure ?? prev.pressure,
              windSpeed: weather.windSpeed ?? prev.windSpeed,
            }));
          } else {
            setWeatherError("Data cuaca belum tersedia untuk lokasi ini.");
          }
        }

        console.log("Weather data updated successfully");
      } catch (error) {
        console.error("Error fetching location or weather:", error);
        if (isMounted) {
          Alert.alert(
            "Lokasi tidak tersedia",
            "Kami tidak dapat mendeteksi lokasi Anda. Pastikan GPS aktif lalu coba lagi."
          );
          setWeatherData((prev) => ({
            ...prev,
            location: "Lokasi tidak tersedia",
          }));
          setWeatherError("Pastikan GPS sudah aktif lalu coba lagi.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLocationAndWeather();

    return () => {
      isMounted = false;
    };
  }, []);
  // Empty dependency array is correct here

  // Update weather based on selected lahan
  useEffect(() => {
    let active = true;

    const updateWeatherForLahan = async () => {
      if (!selectedLahanId) {
        // If no lahan selected, weather will use user location (already fetched)
        return;
      }

      const selectedLahan = savedLahan.find((l) => l.id === selectedLahanId);
      if (!selectedLahan) {
        return;
      }

      try {
        // Get lahan detail to access centroid
        const lahanDetail = await lahanService.getLahanDetail(selectedLahanId);
        if (!active) return;
        if (!lahanDetail || !lahanDetail.centroid) {
          console.warn("No centroid data for selected lahan");
          return;
        }

        // Parse centroid (it's a GeoJSON Point)
        const centroid = lahanDetail.centroid;
        let lat: number | null = null;
        let lon: number | null = null;

        if (centroid.type === "Point" && Array.isArray(centroid.coordinates)) {
          lon = centroid.coordinates[0];
          lat = centroid.coordinates[1];
        }

        if (lat === null || lon === null) {
          console.warn("Invalid centroid coordinates");
          return;
        }

        console.log(
          `Fetching weather for lahan: ${selectedLahan.name} at ${lat}, ${lon}`
        );
        setLoading(true);

        // Get location name for the lahan coordinates
        let locationName = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        try {
          const geocoded = await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lon,
          });
          const geoName = formatGeocodedLocation(geocoded?.[0] ?? null);
          if (geoName) {
            locationName = geoName;
          }
        } catch (reverseError) {
          console.warn("Reverse geocoding failed for lahan", reverseError);
        }
        if (!active) return;

        // Fetch weather for lahan location
        const weather = await fetchWeatherData(lat, lon);
        if (!active) return;

        if (weather) {
          setWeatherError(null);
          setWeatherData({
            location: locationName,
            temperature: weather.temperature,
            highTemp: weather.highTemp,
            lowTemp: weather.lowTemp,
            humidity: weather.humidity,
            rainfall: weather.rainfall,
            pressure: weather.pressure,
            windSpeed: weather.windSpeed,
          });
        } else {
          setWeatherError("Gagal memuat cuaca untuk ladang ini");
        }
      } catch (error) {
        if (!active) return;
        console.error("Error fetching weather for lahan:", error);
        setWeatherError("Gagal memuat cuaca untuk ladang ini");
      } finally {
        if (active) setLoading(false);
      }
    };

    updateWeatherForLahan();
    return () => {
      active = false;
    };
  }, [selectedLahanId, savedLahan]);

  const selectedLahanHealth = selectedLahanId
    ? lahanHealthMap[selectedLahanId] ?? null
    : null;
  const selectedNdviIsAvailable =
    typeof selectedLahanHealth?.ndviScore === "number" &&
    Number.isFinite(selectedLahanHealth.ndviScore);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8BC34A" />

      {/* Sticky header background */}
      <LinearGradient
        colors={["#4CAF50", "#4CAF50"]}
        style={styles.stickyHeader}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with extended gradient background */}
        <LinearGradient
          colors={["#4CAF50", "#4CAF50"]}
          style={styles.headerBackground}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Pressable
                style={({ pressed }) => [styles.profilePicture, pressed && { opacity: 0.7 }]}
                onPress={() => router.push("/profile")}
                accessibilityRole="button"
                accessibilityLabel="Buka profil"
              >
                <Ionicons name="person" size={24} color="#4CAF50" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.lahanSelector, pressed && { opacity: 0.7 }]}
                onPress={() => setShowLahanPicker(!showLahanPicker)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showLahanPicker }}
              >
                <Ionicons
                  name="location"
                  size={18}
                  color="#fff"
                  style={styles.lahanSelectorIcon}
                />
                <Text style={styles.lahanSelectorText} numberOfLines={1}>
                  {selectedLahanName || "Pilih Ladang"}
                </Text>
                <Ionicons
                  name={showLahanPicker ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#fff"
                />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.notificationButton, pressed && { opacity: 0.7 }]}
                onPress={() => router.push("/notifications")}
                accessibilityRole="button"
                accessibilityLabel="Buka notifikasi"
              >
                <Ionicons name="notifications" size={24} color="#4CAF50" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* Lahan Picker Dropdown */}
        {showLahanPicker && (
          <View style={styles.lahanPickerDropdown}>
            <ScrollView
              style={styles.lahanPickerScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Option: Pilih Ladang (default) */}
              <Pressable
                style={({ pressed }) => [styles.lahanPickerOption, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  setSelectedLahanId(null);
                  setShowLahanPicker(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: !selectedLahanId }}
              >
                <Ionicons name="apps" size={20} color="#4CAF50" />
                <Text
                  style={[
                    styles.lahanPickerOptionText,
                    !selectedLahanId && styles.lahanPickerOptionTextSelected,
                  ]}
                >
                  Pilih Ladang
                </Text>
                {!selectedLahanId && (
                  <Ionicons name="checkmark" size={20} color="#4CAF50" />
                )}
              </Pressable>

              {/* User's Lahan List */}
              {savedLahan.map((lahan) => (
                <Pressable
                  key={lahan.id}
                  style={({ pressed }) => [styles.lahanPickerOption, pressed && { opacity: 0.7 }]}
                  onPress={() => {
                    setSelectedLahanId(lahan.id);
                    setShowLahanPicker(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedLahanId === lahan.id }}
                >
                  <Ionicons name="location" size={20} color="#4CAF50" />
                  <Text
                    style={[
                      styles.lahanPickerOptionText,
                      selectedLahanId === lahan.id &&
                        styles.lahanPickerOptionTextSelected,
                    ]}
                  >
                    {lahan.name}
                  </Text>
                  {selectedLahanId === lahan.id && (
                    <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.content}>
          {/* Latest observation snapshot */}
          <View style={styles.ndviStatusCard}>
            <View style={styles.ndviStatusLeft}>
              <Ionicons
                name="leaf"
                size={24}
                color={selectedNdviIsAvailable ? "#075985" : "#9E9E9E"}
              />
              <View style={styles.ndviStatusTextContainer}>
                <Text style={styles.ndviStatusLabel}>Observasi Terbaru</Text>
                <Text
                  style={[
                    styles.ndviStatusValue,
                    !selectedNdviIsAvailable && { color: "#9E9E9E" },
                  ]}
                >
                  {!selectedLahanId
                    ? "Pilih ladang"
                    : selectedNdviIsAvailable
                    ? `${
                        selectedLahanHealth?.dataState === "measured"
                          ? "Terukur"
                          : "Tidak tersedia"
                      } · ${formatDisplayDate(selectedLahanHealth?.capturedAt)}`
                    : "Riwayat belum tersedia"}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.ndviStatusBadge,
                {
                  backgroundColor: selectedNdviIsAvailable ? "#E0F2FE" : "#E0E0E0",
                },
              ]}
            >
              <Text
                style={[
                  styles.ndviStatusBadgeText,
                  {
                    color: selectedNdviIsAvailable ? "#075985" : "#757575",
                  },
                ]}
              >
                {selectedNdviIsAvailable
                  ? `NDVI: ${formatNdviValue(
                      selectedLahanHealth?.ndviScore
                    )}`
                  : "NDVI: --"}
              </Text>
            </View>
          </View>

          {/* Weather Card dengan loading state */}
          {loading ? (
            <View style={[styles.weatherCard, styles.loadingCard]}>
              <Text style={styles.loadingText}>Memuat data cuaca...</Text>
            </View>
          ) : (
            <>
              <WeatherCard
                location={weatherData.location}
                temperature={weatherData.temperature}
                highTemp={weatherData.highTemp}
                lowTemp={weatherData.lowTemp}
                humidity={weatherData.humidity}
                rainfall={weatherData.rainfall}
                pressure={weatherData.pressure}
                windSpeed={weatherData.windSpeed}
              />
              {weatherError ? (
                <Text style={styles.errorText}>{weatherError}</Text>
              ) : null}
            </>
          )}

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
              Lahan Saya
            </Text>
            <Pressable
              style={({ pressed }) => [styles.addNoteButton, pressed && { opacity: 0.2 }]}
              onPress={() => router.push("/explore")}
              accessibilityRole="button"
              accessibilityLabel="Tambah lahan"
            >
              <Ionicons name="add" size={14} color="#fff" />
            </Pressable>
          </View>
          <View style={{ marginBottom: 12 }} />

          {lahanLoading ? (
            <View style={styles.emptyNdviContainer}>
              <Text style={styles.emptyNdviText}>Memuat data lahan...</Text>
            </View>
          ) : savedLahan.length > 0 ? (
            <FlatList
              horizontal
              data={savedLahan}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <LahanCard
                  name={item.name}
                  areaHa={item.areaHa}
                  ndviScore={lahanHealthMap[item.id]?.ndviScore ?? null}
                  capturedAt={lahanHealthMap[item.id]?.capturedAt ?? null}
                  dataState={lahanHealthMap[item.id]?.dataState}
                  thumbnailUrl={item.thumbnailUrl}
                  category={item.category}
                  warningCount={item.warningCount}
                  note={item.latestNote}
                  onPress={() =>
                    router.push({
                      pathname: "/detail-lahan-page",
                      params: { id: item.id },
                    })
                  }
                />
              )}
              showsHorizontalScrollIndicator={false}
              style={styles.fieldsContainer}
              contentContainerStyle={styles.fieldsContentContainer}
            />
          ) : (
            <View style={styles.emptyLahanCard}>
              <Ionicons name="map-outline" size={24} color="#999" />
              <View style={styles.emptyLahanTextContainer}>
                <Text style={styles.emptyLahanTitle}>
                  Belum ada lahan tersimpan
                </Text>
                <Text style={styles.emptyLahanSubtitle}>
                  Gambar lahan dengan menekan tombol “+”
                </Text>
              </View>
            </View>
          )}

          <View style={styles.notesSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                Catatan
              </Text>
              <View style={styles.sectionActions}>
                {notesLoading && (
                  <ActivityIndicator
                    size="small"
                    color="#4CAF50"
                    style={styles.sectionActionSpinner}
                  />
                )}
                <Pressable
                  style={({ pressed }) => [styles.addNoteButton, pressed && { opacity: 0.2 }]}
                  onPress={handleOpenNoteModal}
                  accessibilityRole="button"
                  accessibilityLabel="Tambah catatan"
                >
                  <Ionicons name="add" size={14} color="#fff" />
                </Pressable>
              </View>
            </View>
            <View style={{ marginBottom: 12 }} />
            {notesLoading ? (
              <Text style={styles.sectionSupportingText}>Memuat catatan…</Text>
            ) : notesWithMetadata.length === 0 ? (
              <View style={styles.emptyNotesCard}>
                <Ionicons name="document-text-outline" size={24} color="#999" />
                <View style={styles.emptyNotesTextContainer}>
                  <Text style={styles.emptyNotesTitle}>
                    Belum ada catatan tersimpan
                  </Text>
                  <Text style={styles.emptyNotesSubtitle}>
                    Simpan catatan dengan menekan tombol “+”
                  </Text>
                </View>
              </View>
            ) : (
              notesWithMetadata.slice(0, 3).map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteCardHeader}>
                    <Text style={styles.noteTitle} numberOfLines={1}>
                      {note.title || "Catatan Tanpa Judul"}
                    </Text>
                    {note.lahanName ? (
                      <View style={styles.noteBadge}>
                        <Text style={styles.noteBadgeText}>
                          {note.lahanName}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.noteMeta}>
                    {formatDisplayDate(note.created_at)}
                  </Text>
                  <Text style={styles.noteContent} numberOfLines={2}>
                    {note.content || "Catatan kosong."}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
      <Modal
        visible={showNoteModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelNote}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.noteModalContent}>
            <Text style={styles.modalTitle}>Catatan Baru</Text>
            <Text style={styles.modalSubtitle}>
              Simpan temuan lapangan langsung dari beranda.
            </Text>

            <Pressable
              style={({ pressed }) => [styles.notePickerButton, pressed && { opacity: 0.85 }]}
              onPress={() => setIsLahanPickerVisible((prev) => !prev)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isLahanPickerVisible }}
            >
              <Text style={styles.notePickerLabel} numberOfLines={1}>
                {selectedNoteLahanName ?? "Pilih lahan (opsional)"}
              </Text>
            </Pressable>

            {isLahanPickerVisible && (
              <View style={styles.notePickerDropdown}>
                <ScrollView
                  style={styles.notePickerList}
                  keyboardShouldPersistTaps="handled"
                >
                  <Pressable
                    style={({ pressed }) => [styles.notePickerOption, pressed && { opacity: 0.2 }]}
                    onPress={() => handleSelectNoteLahan(null)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selectedNoteLahanId === null }}
                  >
                    <Text style={styles.notePickerOptionText}>Tanpa lahan</Text>
                  </Pressable>
                  {savedLahan.map((item) => (
                    <Pressable
                      key={`home-note-picker-${item.id}`}
                      style={({ pressed }) => [styles.notePickerOption, pressed && { opacity: 0.2 }]}
                      onPress={() => handleSelectNoteLahan(item.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selectedNoteLahanId === item.id }}
                    >
                      <Text
                        style={styles.notePickerOptionText}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <TextInput
              style={styles.textInput}
              placeholder="Judul catatan"
              value={noteTitle}
              onChangeText={setNoteTitle}
            />

            <TextInput
              style={[styles.textInput, styles.noteInput]}
              placeholder="Isi catatan..."
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && !isSavingNote && { opacity: 0.2 },
                ]}
                onPress={handleCancelNote}
                disabled={isSavingNote}
                accessibilityRole="button"
                accessibilityState={{ disabled: isSavingNote }}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                    styles.modalSaveButton,
                    (!isNoteFormValid || isSavingNote) &&
                      styles.modalSaveButtonDisabled,
                    pressed && isNoteFormValid && !isSavingNote && { opacity: 0.85 },
                  ]}
                onPress={handleSaveNote}
                disabled={!isNoteFormValid || isSavingNote}
                accessibilityRole="button"
                accessibilityState={{ disabled: !isNoteFormValid || isSavingNote }}
              >
                <Text style={styles.modalSaveText}>
                  {isSavingNote ? "Menyimpan..." : "Simpan"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 65,
    zIndex: 10,
  },
  headerBackground: {
    paddingBottom: 120,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    paddingTop: 76,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  lahanSelector: {
    flex: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 30,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  lahanSelectorIcon: {
    marginRight: 6,
  },
  lahanSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  lahanPickerDropdown: {
    position: "absolute",
    top: 136,
    left: 50,
    right: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    maxHeight: 300,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  lahanPickerScroll: {
    borderRadius: 16,
  },
  lahanPickerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  lahanPickerOptionText: {
    flex: 1,
    fontSize: 15,
    color: "#333333",
    fontWeight: "500",
  },
  lahanPickerOptionTextSelected: {
    color: "#4CAF50",
    fontWeight: "700",
  },
  headerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerInfoIcon: {
    marginRight: 8,
  },
  headerInfoText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.15,
  },
  greeting: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "400",
    opacity: 0.9,
  },
  userName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    marginTop: -152,
    paddingBottom: 40,
  },
  ndviStatusCard: {
    height: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  ndviStatusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ndviStatusTextContainer: {
    flexDirection: "column",
  },
  ndviStatusLabel: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  ndviStatusValue: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "700",
  },
  ndviStatusBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ndviStatusBadgeText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  weatherCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  weatherSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  weatherSummaryText: {
    flex: 1,
    marginRight: 20,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  primaryTempRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  primaryTemperature: {
    fontSize: 56,
    fontWeight: "700",
    color: "#1a1a1a",
    letterSpacing: -2,
    lineHeight: 60,
  },
  tempDelimiter: {
    marginLeft: 16,
    paddingTop: 8,
  },
  tempDetail: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
    marginBottom: 2,
  },
  weatherIconPill: {
    width: 96,
    height: 96,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  weatherIconImage: {
    width: 96,
    height: 96,
    resizeMode: "contain",
  },
  weatherDivider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    marginBottom: 10,
  },
  weatherMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  metricSeparator: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    marginHorizontal: 8,
  },
  metricLabelContainer: {
    alignItems: "center",
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: "#999",
    letterSpacing: 0.3,
    fontWeight: "500",
  },
  metricUnit: {
    fontSize: 9,
    color: "#999",
    letterSpacing: 0.2,
    fontWeight: "400",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  errorText: {
    color: "#F44336",
    marginTop: -10,
    marginBottom: 20,
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 14,
  },
  fieldsContainer: {
    marginBottom: 20,
    marginLeft: -20,
  },
  fieldsContentContainer: {
    paddingVertical: 0,
    paddingLeft: 18,
    paddingRight: 4,
  },
  fieldCardContainer: {
    marginRight: 14,
    paddingHorizontal: 4,
  },
  fieldCard: {
    width: 189,
    backgroundColor: "#e5e5e5",
    borderRadius: 13,
    padding: 7,
  },
  fieldCardTop: {
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    height: 173,
    position: "relative",
    justifyContent: "space-between",
    flexDirection: "row",
    padding: 11,
  },
  fieldCategoryBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    alignSelf: "flex-start",
  },
  fieldCategoryText: {
    fontWeight: "bold",
    color: "#3c532c",
    fontSize: 10,
  },
  fieldWarningBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    alignSelf: "flex-start",
  },
  fieldWarningCount: {
    fontWeight: "bold",
    color: "#ffffff",
    fontSize: 10,
  },
  fieldCardBottom: {
    backgroundColor: "#f5f5f5",
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 13,
  },
  fieldStatusLabel: {
    fontWeight: "bold",
    fontSize: 9,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  fieldNameLabel: {
    fontWeight: "bold",
    color: "#000000",
    fontSize: 16,
    marginBottom: 5,
  },
  fieldCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldNoteLabel: {
    color: "#8f8f8f",
    fontSize: 10,
    flex: 1,
  },
  fieldCardArrow: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  fieldCardSoft: {
    flex: 1,
    backgroundColor: "#F7F2E7",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 14,
    borderRadius: 16,
  },
  fieldCardContent: {
    flex: 1,
    justifyContent: "space-between",
    gap: 12,
  },
  fieldImage: {
    height: 116,
  },
  fieldImageRadius: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  fieldImageOverlay: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  fieldImageLabel: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
  },
  fieldImageTitle: {
    color: "#1B5E20",
    fontSize: 14,
    fontWeight: "700",
  },
  fieldInfoPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    gap: 12,
  },
  fieldInfoTextGroup: {
    flex: 1,
  },
  fieldArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  cardMeta: {
    fontSize: 11,
    color: "#8E8E8E",
    marginTop: 2,
  },
  loadingCard: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 120,
  },
  loadingText: {
    color: "#666",
    fontSize: 16,
    fontStyle: "italic",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  sectionActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionActionSpinner: {
    marginRight: 10,
  },
  addNoteButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    width: 30,
    height: 30,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionSupportingText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  notesSection: {
    marginBottom: 24,
  },
  noteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.12)",
  },
  noteCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2E7D32",
    flex: 1,
    marginRight: 8,
  },
  noteBadge: {
    backgroundColor: "rgba(76, 175, 80, 0.18)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  noteBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1B5E20",
  },
  noteMeta: {
    fontSize: 12,
    color: "#607D8B",
    marginBottom: 6,
  },
  noteContent: {
    fontSize: 13,
    color: "#4E4E4E",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#2E7D32",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginBottom: 15,
  },
  notePickerButton: {
    borderWidth: 1,
    borderColor: "#C8E6C9",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#F1F8E9",
  },
  notePickerLabel: {
    fontSize: 14,
    color: "#2E7D32",
  },
  notePickerDropdown: {
    borderWidth: 1,
    borderColor: "#C8E6C9",
    borderRadius: 12,
    maxHeight: 180,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  notePickerList: {
    paddingVertical: 6,
  },
  notePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  notePickerOptionText: {
    fontSize: 14,
    color: "#37474F",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    fontSize: 14,
    color: "#333333",
    backgroundColor: "#FFFFFF",
  },
  noteInput: {
    minHeight: 120,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#CCCCCC",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  modalCancelText: {
    color: "#333333",
    fontSize: 14,
  },
  modalSaveButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  noteModalContent: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    width: width * 0.88,
  },
  emptyNdviContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  emptyNdviText: {
    color: "#666",
    fontSize: 14,
  },
  emptyLahanCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  emptyLahanTextContainer: {
    flex: 1,
  },
  emptyLahanTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#757575",
    marginBottom: 4,
  },
  emptyLahanSubtitle: {
    fontSize: 13,
    color: "#9E9E9E",
    lineHeight: 18,
  },
  emptyNotesCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  emptyNotesTextContainer: {
    flex: 1,
  },
  emptyNotesTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#757575",
    marginBottom: 4,
  },
  emptyNotesSubtitle: {
    fontSize: 13,
    color: "#9E9E9E",
    lineHeight: 18,
  },
});

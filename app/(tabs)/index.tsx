import {
  classifyNdviStatus,
  NDVI_UNKNOWN_CONFIG,
  type NdviClassification
} from "@/constants/ndvi";
import { deriveSummaryIconKey, getWeatherIconSource } from "@/utils/weather-icons";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { lahanService, supabase, type LahanWithInfo } from "@/hooks/supabase";
import { BASE_URL } from "../../hooks/config";

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
  status: string | null;
  captured_at: string | null;
  created_at: string | null;
};

type LahanHealthSummary = {
  classification: NdviClassification;
  ndviScore: number | null;
  capturedAt: string | null;
};

const parseDateToTime = (value?: string | null) => {
  if (!value) {
    return 0;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
};

const formatDisplayDate = (value?: string | null) => {
  if (!value) {
    return "--";
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return "--";
  }
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(time);
  } catch (error) {
    console.warn("Gagal memformat tanggal catatan:", error);
    return "--";
  }
};

const HOME_USAGE_TIPS = [
  "Tap lahan di peta untuk melihat detail dan status kesehatan.",
  "Gunakan zoom agar penggambaran batas lahan lebih presisi.",
  "Simpan catatan lapangan secara rutin untuk memantau perubahan.",
];

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
          <Text style={styles.metricLabel}>Kelembaban</Text>
          <Text style={styles.metricValue}>
            {humidity !== null ? `${Math.round(humidity)}%` : "--"}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Curah Hujan</Text>
          <Text style={styles.metricValue}>
            {rainfall !== null ? `${rainfall.toFixed(1)} mm` : "--"}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Tekanan</Text>
          <Text style={styles.metricValue}>
            {pressure !== null ? `${Math.round(pressure)} hPa` : "--"}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Kec. Angin</Text>
          <Text style={styles.metricValue}>
            {windSpeed !== null ? `${windSpeed.toFixed(1)} km/jam` : "--"}
          </Text>
        </View>
      </View>
    </View>
  );
};

const { width } = Dimensions.get("window");

const DEFAULT_FIELD_IMAGE = {
  uri: "https://images.unsplash.com/photo-1582719478181-2cf4e9b123c9?auto=format&fit=crop&w=900&q=80",
} as const;

const CARD_BACKGROUND_IMAGE = {
  uri: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
} as const;

const LahanCard = ({
  name,
  areaHa,
  ndviScore,
  capturedAt,
  onPress,
}: SavedLahanCardProps) => {
  const areaLabel =
    areaHa !== null ? `${areaHa.toFixed(2)} ha` : "Luas belum tersedia";
  const normalizedNdviScore = parseOptionalNumber(ndviScore);
  
  const capturedLabel = capturedAt ? formatDisplayDate(capturedAt) : null;

  return (
    <View style={styles.fieldCardContainer}>
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        style={styles.fieldCard}
        activeOpacity={0.88}
      >
        <ImageBackground
          source={CARD_BACKGROUND_IMAGE}
          style={styles.fieldCardBackground}
          imageStyle={styles.fieldCardBackgroundRadius}
          resizeMode="cover"
        >
          <View style={styles.fieldCardContent}>
            <ImageBackground
              source={DEFAULT_FIELD_IMAGE}
              style={styles.fieldImage}
              imageStyle={styles.fieldImageRadius}
              resizeMode="cover"
            >
              <View style={styles.fieldImageOverlay}>
                <View style={styles.fieldImageLabel}>
                  <Text style={styles.fieldImageTitle}>{areaLabel}</Text>
                </View>
              </View>
            </ImageBackground>
            <View style={styles.fieldInfoPanel}>
              <View style={styles.fieldInfoTextGroup}>
                <Text style={styles.cardTitle}>{name}</Text>
          
                {capturedLabel ? (
                  <Text style={styles.cardMeta}>Data · {capturedLabel}</Text>
                ) : null}
              </View>
              <View style={styles.fieldArrowButton}>
                <Ionicons name="chevron-forward" size={16} color="#1C1C1E" />
              </View>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("Petani");
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
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
  const [lahanError, setLahanError] = useState<string | null>(null);
  const [lahanLoading, setLahanLoading] = useState(false);
  const [lahanHealthMap, setLahanHealthMap] = useState<
    Record<string, LahanHealthSummary>
  >({});
  const [notes, setNotes] = useState<LahanNoteRecord[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedNoteLahanId, setSelectedNoteLahanId] = useState<string | null>(
    null
  );
  const [isLahanPickerVisible, setIsLahanPickerVisible] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const userNameDisplay = useMemo(
    () => (userName ? userName.toUpperCase() : "PETANI"),
    [userName]
  );

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

  const isNoteFormValid = useMemo(() => {
    return noteTitle.trim().length > 0 && noteContent.trim().length > 0;
  }, [noteContent, noteTitle]);

  const featuredTips = useMemo(() => {
    const daySeed = new Date().getDate();
    const rotated = [...HOME_USAGE_TIPS];
    const shift = daySeed % HOME_USAGE_TIPS.length;
    return rotated.slice(shift).concat(rotated.slice(0, shift));
  }, []);

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
      const weatherResponse = await fetch(
        `${BASE_URL}/weather?lat=${latitude}&lon=${longitude}`
      );

      if (!weatherResponse.ok) {
        throw new Error("Failed to fetch weather");
      }

      const data = await weatherResponse.json();
      console.log("Weather data fetched:", data);

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
      setLahanError("Gagal memuat data lahan.");
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
        .from("lahan_health")
        .select("id,lahan_id,ndvi_score,status,captured_at,created_at")
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
            acc[id] = {
              classification: classifyNdviStatus(parsedScore, record.status),
              ndviScore: parsedScore,
              capturedAt: record.captured_at ?? record.created_at ?? null,
            };
          } else {
            acc[id] = {
              classification: NDVI_UNKNOWN_CONFIG,
              ndviScore: null,
              capturedAt: null,
            };
          }
          return acc;
        },
        {}
      );

      setLahanHealthMap(next);
    } catch (error) {
      console.error("Gagal memuat kesehatan lahan:", error);
      const fallback = targetIds.reduce<Record<string, LahanHealthSummary>>(
        (acc, id) => {
          acc[id] = {
            classification: NDVI_UNKNOWN_CONFIG,
            ndviScore: null,
            capturedAt: null,
          };
          return acc;
        },
        {}
      );
      setLahanHealthMap(fallback);
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
    loadLahanHealth(ids);
  }, [savedLahan, loadLahanHealth]);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8BC34A" />

      {/* Header */}
      <LinearGradient colors={["#8BC34A", "#7ab942ff"]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Selamat Datang,</Text>
            <Text style={styles.userName}>{userNameDisplay}</Text>
          </View>
          <View style={styles.profilePicture}>
            {profileImageUri ? (
              <Image
                source={{ uri: profileImageUri }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileFallback}>
                <Ionicons name="person" size={24} color="#fff" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.headerInfoRow}>
          <Ionicons
            name="leaf"
            size={16}
            color="#FFFFFF"
            style={styles.headerInfoIcon}
          />
          <Text style={styles.headerInfoText} numberOfLines={1}>
            Pantau kondisi lahan dan catatan terbaru di satu tempat.
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
        <Text style={styles.sectionTitle}>
          Ladang Saya ({savedLahan.length})
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.fieldsContainer}
        >
          {lahanLoading ? (
            <View style={styles.emptyNdviContainer}>
              <Text style={styles.emptyNdviText}>Memuat data lahan...</Text>
            </View>
          ) : savedLahan.length > 0 ? (
            savedLahan.map((item) => (
              <LahanCard
                key={item.id}
                name={item.name}
                areaHa={item.areaHa}
                ndviScore={lahanHealthMap[item.id]?.ndviScore ?? null}
                capturedAt={lahanHealthMap[item.id]?.capturedAt ?? null}
                onPress={() =>
                  router.push({
                    pathname: "/detail-lahan-page",
                    params: { id: item.id },
                  })
                }
              />
            ))
          ) : (
            <View style={styles.emptyNdviContainer}>
              <Text style={styles.emptyNdviText}>
                {lahanError ??
                  "Belum ada lahan tersimpan. Simpan lahan dari tab Jelajahi."}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.notesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Catatan</Text>
            <View style={styles.sectionActions}>
              {notesLoading && (
                <ActivityIndicator
                  size="small"
                  color="#4CAF50"
                  style={styles.sectionActionSpinner}
                />
              )}
              <TouchableOpacity
                style={styles.addNoteButton}
                onPress={handleOpenNoteModal}
              >
                <Ionicons
                  name="add"
                  size={16}
                  color="#fff"
                  style={styles.addNoteButtonIcon}
                />
                <Text style={styles.addNoteButtonText}>Tambah</Text>
              </TouchableOpacity>
            </View>
          </View>
          {notesLoading ? (
            <Text style={styles.sectionSupportingText}>Memuat catatan…</Text>
          ) : notesWithMetadata.length === 0 ? (
            <Text style={styles.sectionSupportingText}>
              {notesError ?? "Belum ada catatan tersimpan."}
            </Text>
          ) : (
            notesWithMetadata.slice(0, 3).map((note) => (
              <View key={note.id} style={styles.noteCard}>
                <View style={styles.noteCardHeader}>
                  <Text style={styles.noteTitle} numberOfLines={1}>
                    {note.title || "Catatan Tanpa Judul"}
                  </Text>
                  {note.lahanName ? (
                    <View style={styles.noteBadge}>
                      <Text style={styles.noteBadgeText}>{note.lahanName}</Text>
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

        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Tips Penggunaan</Text>
          <View style={styles.tipCard}>
            {featuredTips.map((tip, index) => (
              <Text key={`home-tip-${index}`} style={styles.tipBullet}>
                • {tip}
              </Text>
            ))}
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

            <TouchableOpacity
              style={styles.notePickerButton}
              onPress={() => setIsLahanPickerVisible((prev) => !prev)}
              activeOpacity={0.85}
            >
              <Text style={styles.notePickerLabel} numberOfLines={1}>
                {selectedNoteLahanName ?? "Pilih lahan (opsional)"}
              </Text>
            </TouchableOpacity>

            {isLahanPickerVisible && (
              <View style={styles.notePickerDropdown}>
                <ScrollView
                  style={styles.notePickerList}
                  keyboardShouldPersistTaps="handled"
                >
                  <TouchableOpacity
                    style={styles.notePickerOption}
                    onPress={() => handleSelectNoteLahan(null)}
                  >
                    <Text style={styles.notePickerOptionText}>Tanpa lahan</Text>
                  </TouchableOpacity>
                  {savedLahan.map((item) => (
                    <TouchableOpacity
                      key={`home-note-picker-${item.id}`}
                      style={styles.notePickerOption}
                      onPress={() => handleSelectNoteLahan(item.id)}
                    >
                      <Text
                        style={styles.notePickerOptionText}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
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
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCancelNote}
                disabled={isSavingNote}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveButton,
                  (!isNoteFormValid || isSavingNote) &&
                    styles.modalSaveButtonDisabled,
                ]}
                onPress={handleSaveNote}
                disabled={!isNoteFormValid || isSavingNote}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSaveText}>
                  {isSavingNote ? "Menyimpan..." : "Simpan"}
                </Text>
              </TouchableOpacity>
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
  header: {
    paddingTop: 76,
    paddingHorizontal: 20,
    paddingBottom: 20,
    minHeight: 160,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profileFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  weatherCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(46, 125, 50, 0.1)",
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  weatherSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weatherSummaryText: {
    flex: 1,
    marginRight: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 16,
    color: "#1C1C1C",
    fontWeight: "600",
  },
  primaryTempRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  primaryTemperature: {
    fontSize: 54,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -1.2,
  },
  tempDelimiter: {
    marginLeft: 18,
  },
  tempDetail: {
    fontSize: 14,
    color: "#444444",
    fontWeight: "500",
    marginBottom: 4,
  },
  weatherIconPill: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(46, 125, 50, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  weatherIconImage: {
    width: 48,
    height: 48,
    resizeMode: "contain",
  },
  weatherDivider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.06)",
    marginVertical: 16,
  },
  weatherMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricItem: {
    flex: 1,
    paddingHorizontal: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: "#8E8E8E",
    marginBottom: 6,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F1F1F",
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
    marginBottom: 15,
  },
  fieldsContainer: {
    marginBottom: 20,
  },
  fieldCardContainer: {
    marginRight: 16,
  },
  fieldCard: {
    width: 190,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  fieldCardBackground: {
    flex: 1,
    paddingBottom: 12,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  fieldCardBackgroundRadius: {
    borderRadius: 16,
  },
  fieldCardContent: {
    flex: 1,
    justifyContent: "space-between",
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
    borderColor: "rgba(0,0,0,0.06)",
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
    marginBottom: 12,
  },
  sectionActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionActionSpinner: {
    marginRight: 10,
  },
  addNoteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  addNoteButtonIcon: {
    marginRight: 6,
  },
  addNoteButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
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
  tipsSection: {
    marginBottom: 36,
  },
  tipCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.08)",
  },
  tipBullet: {
    fontSize: 13,
    color: "#37474F",
    marginBottom: 6,
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
});

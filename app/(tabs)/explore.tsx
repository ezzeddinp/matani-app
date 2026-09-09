import { DrawingModeIndicator } from "@/components/drawing-mode-indicator";
import { ThemedView } from "@/components/themed-view";
import { formatNdviValue } from "@/constants/ndvi";
import { API_BASE_CANDIDATES } from "@/hooks/config";
import { LahanWithInfo, lahanService, supabase } from "@/hooks/supabase";
import {
  authenticatedBackendFetch,
  readBackendJson,
  requestLahanMeasurement,
  retainMostUsefulBackendError,
} from "@/utils/backend-api";
import {
  buildFieldGeoJson,
  calculatePolygonAreaHa,
  ExportedFieldGeoJson,
  GeoJsonImportError,
  parseFieldGeoJson,
} from "@/utils/geojson-import";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageSourcePropType,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import MapView, {
  LatLng,
  MapPressEvent,
  Marker,
  PROVIDER_GOOGLE,
  Polygon,
  Polyline,
  Region,
} from "react-native-maps";

const PADI_CATEGORY = {
  id: "padi",
  label: "Padi",
  thumbnail: require("@/assets/foto-ladang/padi.jpg"),
} as const;

type LahanHealthRecord = {
  id: string;
  lahan_id: string;
  ndvi_score: number | null;
  ndmi_score?: number | null;
  status: string | null;
  captured_at: string | null;
  created_at: string | null;
};

type LahanNoteRecord = {
  id: string;
  lahan_id: string | null;
  title: string;
  content: string;
  created_at: string;
};

type SavedLahanItem = {
  id: string;
  name: string;
  coordinates: LatLng[];
  areaHa: number | null;
  createdAt: string | null;
  thumbnailUrl: string | null;
  category?: string | null;
};

type DrawingVertex = {
  id: string;
  coordinate: LatLng;
};

type SearchSuggestion = {
  id: string;
  label: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
};

type LahanCard = SavedLahanItem & {
  latestHealth?: LahanHealthRecord | null | undefined;
  centroid: LatLng | null;
  coordinateCount: number;
  locationLabel: string | null;
};

type NdviDataState = "measured" | "unavailable";

const NDVI_DATA_STATE_META: Record<
  NdviDataState,
  { label: string; description: string }
> = {
  measured: {
    label: "Terukur",
    description: "Measurement tersimpan dengan provenance sumber",
  },
  unavailable: {
    label: "Tidak tersedia",
    description: "Tidak ada nilai yang dapat ditampilkan",
  },
};

const { width, height } = Dimensions.get("window");
const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLLAPSED_MAP_HEIGHT = Math.max(SCREEN_HEIGHT * 0.5, 320);
const FULL_MAP_HEIGHT = Math.max(
  SCREEN_HEIGHT * 0.85,
  COLLAPSED_MAP_HEIGHT + 140
);
const LAHAN_PAGE_SIZE = 5;
const DEFAULT_LAHAN_THUMBNAIL = PADI_CATEGORY.thumbnail;
const GEOCODE_CACHE_PRECISION = 4;
const MAX_GEOJSON_FILE_BYTES = 1_000_000;
const GEOCODE_RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;
const RATE_LIMIT_LOG_INTERVAL_MS = 60 * 1000;

const computePolygonCentroid = (points: LatLng[]): LatLng | null => {
  if (!Array.isArray(points) || points.length === 0) return null;
  const validPoints = points.filter(
    (coord): coord is LatLng =>
      Number.isFinite(coord?.latitude) && Number.isFinite(coord?.longitude)
  );
  if (validPoints.length === 0) return null;
  const sum = validPoints.reduce(
    (acc, coord) => {
      acc.latitude += coord.latitude;
      acc.longitude += coord.longitude;
      return acc;
    },
    { latitude: 0, longitude: 0 }
  );
  return {
    latitude: sum.latitude / validPoints.length,
    longitude: sum.longitude / validPoints.length,
  };
};

const LAHAN_COLOR_PALETTE = [
  { stroke: "#2E7D32", fill: "rgba(76, 175, 80, 0.22)" },
  { stroke: "#F57C00", fill: "rgba(255, 183, 77, 0.22)" },
  { stroke: "#7B1FA2", fill: "rgba(186, 104, 200, 0.24)" },
  { stroke: "#0288D1", fill: "rgba(144, 202, 249, 0.24)" },
  { stroke: "#C2185B", fill: "rgba(244, 143, 177, 0.24)" },
  { stroke: "#00897B", fill: "rgba(165, 214, 167, 0.24)" },
];

const clampDeltaValue = (value: number) =>
  Math.min(Math.max(value, 0.0005), 1.8);

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

const getLahanColor = (id: string) => {
  const index = Math.abs(hashString(id)) % LAHAN_COLOR_PALETTE.length;
  return LAHAN_COLOR_PALETTE[index];
};

const parseDateToTime = (value?: string | null) => {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
};

const displayDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const getNdviDataState = (
  record: LahanHealthRecord | null | undefined
): NdviDataState => {
  if (!record) return "unavailable";
  const status = record.status?.trim().toLowerCase();
  return status === "passed" ? "measured" : "unavailable";
};

const formatDisplayDate = (value?: string | null) => {
  const time = parseDateToTime(value ?? undefined);
  if (!time) return "Baru";
  try {
    return displayDateFormatter.format(time);
  } catch {
    return new Date(time).toISOString().split("T")[0];
  }
};

const formatHa = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)} ha`;
};

const formatGeocodedLocation = (
  place?: Location.LocationGeocodedAddress | null
) => {
  if (!place) return null;
  const candidateParts = [place.subregion, place.city, place.district, place.region, place.country];
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
    if (!alreadyIncluded) uniqueParts.push(normalised);
  });
  if (uniqueParts.length === 0) return null;
  return uniqueParts.slice(0, 3).join(", ");
};

const buildCoordinateLabel = (latitude: number, longitude: number) =>
  `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;

const buildGeocodeCacheKey = (latitude: number, longitude: number) =>
  `${latitude.toFixed(GEOCODE_CACHE_PRECISION)},${longitude.toFixed(GEOCODE_CACHE_PRECISION)}`;

const isRateLimitError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : String(error ?? "");
  return message.toLowerCase().includes("rate limit");
};

export default function ExploreScreen() {
  const router = useRouter();
  const { focusLahanId, focusRequest } = useLocalSearchParams<{
    focusLahanId?: string | string[];
    focusRequest?: string | string[];
  }>();
  const requestedLahanId = Array.isArray(focusLahanId)
    ? focusLahanId[0]
    : focusLahanId;
  const requestedFocusToken = Array.isArray(focusRequest)
    ? focusRequest[0]
    : focusRequest;
  const fallbackUserId = process.env.EXPO_PUBLIC_SUPABASE_DEFAULT_USER_ID;
  const [drawingMode, setDrawingMode] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [lahanName, setLahanName] = useState("");
  const [currentVertices, setCurrentVertices] = useState<DrawingVertex[]>([]);
  const [pendingPolygon, setPendingPolygon] = useState<LatLng[]>([]);
  const [pendingPolygonSource, setPendingPolygonSource] = useState<"draw" | "geojson">("draw");
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [isImportingGeoJson, setIsImportingGeoJson] = useState(false);
  const [geoJsonPreview, setGeoJsonPreview] = useState<ExportedFieldGeoJson | null>(null);
  const [resumeSaveAfterGeoJsonPreview, setResumeSaveAfterGeoJsonPreview] = useState(false);
  const [exportAfterSave, setExportAfterSave] = useState(true);
  const [redoVertices, setRedoVertices] = useState<DrawingVertex[]>([]);
  const nextDrawingVertexIdRef = useRef(0);
  const geoJsonImportInFlightRef = useRef(false);

  const activePath = useMemo(
    () =>
      currentVertices
        .map(({ coordinate }) => ({
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        }))
        .filter((coord): coord is LatLng => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude)),
    [currentVertices]
  );

  const previewPath = useMemo(() => {
    if (activePath.length >= 3) return [...activePath, { ...activePath[0] }];
    return activePath;
  }, [activePath]);

  const [savedLahan, setSavedLahan] = useState<SavedLahanItem[]>([]);
  const [lahanLocationLabels, setLahanLocationLabels] = useState<Record<string, string | null>>({});
  const [lahanPage, setLahanPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchMarker, setSearchMarker] = useState<LatLng | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lahanHealth, setLahanHealth] = useState<LahanHealthRecord[]>([]);
  const [notes, setNotes] = useState<LahanNoteRecord[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [selectedNoteLahanId, setSelectedNoteLahanId] = useState<string | null>(null);
  const [isLahanPickerVisible, setIsLahanPickerVisible] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const mapRef = useRef<MapView>(null);
  const [baseMapType, setBaseMapType] = useState<"satellite" | "standard">("satellite");
  const [mapIsReady, setMapIsReady] = useState(false);
  const [focusedLahanId, setFocusedLahanId] = useState<string | null>(null);
  const currentRegionRef = useRef<Region | null>(null);
  const handledFocusRequestRef = useRef<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapScrollResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapTouchActiveRef = useRef(false);
  const mapTouchLastActiveRef = useRef<number>(0);
  const geocodeCacheRef = useRef<Map<string, string | null>>(new Map());
  const geocodeRateLimitedUntilRef = useRef<number | null>(null);
  const geocodeRateLimitLogRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (!mapTouchActiveRef.current && now - mapTouchLastActiveRef.current > 500) {
        setScrollEnabled(true);
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const releaseScrollLock = useCallback(() => {
    setScrollEnabled((prev) => { if (prev) return prev; return true; });
  }, []);

  const scheduleScrollLockReset = useCallback(() => {
    if (mapScrollResetTimeoutRef.current) clearTimeout(mapScrollResetTimeoutRef.current);
    const schedule = () => {
      mapScrollResetTimeoutRef.current = setTimeout(() => {
        const idleDuration = Date.now() - mapTouchLastActiveRef.current;
        if (!mapTouchActiveRef.current || idleDuration >= 1000) {
          mapTouchActiveRef.current = false;
          releaseScrollLock();
          mapScrollResetTimeoutRef.current = null;
          return;
        }
        schedule();
      }, 1600);
    };
    schedule();
  }, [releaseScrollLock]);

  const isGeocodeRateLimited = useCallback(() => {
    const until = geocodeRateLimitedUntilRef.current;
    return typeof until === "number" && until > Date.now();
  }, []);

  const markGeocodeRateLimited = useCallback((context: string) => {
    geocodeRateLimitedUntilRef.current = Date.now() + GEOCODE_RATE_LIMIT_COOLDOWN_MS;
    const lastLogged = geocodeRateLimitLogRef.current ?? 0;
    if (Date.now() - lastLogged >= RATE_LIMIT_LOG_INTERVAL_MS) {
      console.warn(`⚠️ Reverse geocode dibatasi (${context}). Menggunakan label koordinat sementara.`);
      geocodeRateLimitLogRef.current = Date.now();
    }
  }, []);

  const [userLocation, setUserLocation] = useState({
    latitude: -6.2088,
    longitude: 106.8456,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [locationLabel, setLocationLabel] = useState("Menentukan lokasi...");
  const [lahanSummaryText, setLahanSummaryText] = useState<string>("");
  const [isLahanSummaryLoading, setIsLahanSummaryLoading] = useState(false);
  const [lahanSummaryError, setLahanSummaryError] = useState<string | null>(null);
  const [isLahanSummaryCollapsed, setIsLahanSummaryCollapsed] = useState(false);
  const [showLahanActions, setShowLahanActions] = useState(false);
  const [editingLahanId, setEditingLahanId] = useState<string | null>(null);
  const [editLahanName, setEditLahanName] = useState("");
  const [showEditLahanModal, setShowEditLahanModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const lahanSummarySignatureRef = useRef<string | null>(null);

  const lahanSummaryPriorities = useMemo(() => {
    if (!lahanSummaryText) return [] as { id: string; priorityNumber: number; description: string }[];
    const lines = lahanSummaryText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    return lines
      .map((line, index) => {
        const match = /^(?:Catatan|Prioritas)\s*(\d+)\s*:\s*(.*)$/i.exec(line);
        const priorityNumber = match ? Number.parseInt(match[1], 10) : index + 1;
        const rawDescription = match ? match[2]?.trim() ?? "" : line.replace(/^(?:Catatan|Prioritas)\s*\d+\s*:\s*/i, "").trim();
        const description =
          rawDescription.length > 0
            ? rawDescription
            : line.replace(/^(?:Catatan|Prioritas)\s*\d+\s*:\s*/i, "").trim() || line;
        return { id: `${priorityNumber}-${index}`, priorityNumber, description };
      })
      .filter((item) => item.description.length > 0)
      .slice(0, 3);
  }, [lahanSummaryText]);

  const promptAuthSignup = useCallback(() => {
    Alert.alert(
      "Perlu Akun",
      "Kami akan membuka halaman daftar supaya kamu bisa menyimpan lahan.",
      [{ text: "Buka Halaman Daftar", onPress: () => router.replace("/auth/signup") }],
      { cancelable: true }
    );
  }, [router]);

  const toLatLngCoordinates = useCallback((geojson: any): LatLng[] => {
    if (!geojson) return [];
    const parsed = typeof geojson === "string" ? JSON.parse(geojson) : geojson;
    const ring: number[][] = parsed?.coordinates?.[0] ?? [];
    if (!Array.isArray(ring)) return [];
    const withoutClosingPoint = ring.slice(0, ring.length > 1 ? -1 : ring.length);
    return withoutClosingPoint.map((point) => ({ latitude: point[1], longitude: point[0] }));
  }, []);

  const loadSavedLahan = useCallback(async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? "";
        if (message.includes("Auth session missing")) return;
        throw authError;
      }
      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) return;
      const lahanList = (await lahanService.getLahanByUser(userId)) as LahanWithInfo[];
      if (!Array.isArray(lahanList)) return;
      const mapped = lahanList
        .map((item) => ({
          id: item.id,
          name: item.name,
          coordinates: toLatLngCoordinates(item.geojson),
          areaHa: item.area_ha,
          createdAt: item.created_at ?? null,
          thumbnailUrl:
            typeof item.thumbnail_url === "string" && item.thumbnail_url.length > 0
              ? item.thumbnail_url
              : null,
          category: item.category ?? null,
        }))
        .filter((item) => item.coordinates.length >= 3);
      mapped.sort((a, b) => parseDateToTime(b.createdAt) - parseDateToTime(a.createdAt));
      setSavedLahan(mapped);
    } catch (error) {
      console.error("❌ Gagal memuat data lahan:", error);
    }
  }, [fallbackUserId, toLatLngCoordinates]);

  const loadLahanHealth = useCallback(async (targetIds: string[]) => {
    if (!Array.isArray(targetIds) || targetIds.length === 0) { setLahanHealth([]); return; }
    try {
      const { data, error } = await supabase
        .from("measurement_observations")
        .select("id,lahan_id,ndvi_score,ndmi_score,status,captured_at,created_at")
        .in("lahan_id", targetIds)
        .order("captured_at", { ascending: false, nullsFirst: true })
        .order("created_at", { ascending: false, nullsFirst: true });
      if (error) throw error;
      setLahanHealth(Array.isArray(data) ? (data as LahanHealthRecord[]) : []);
    } catch (error) {
      console.error("Gagal memuat observasi lahan:", error);
      setLahanHealth([]);
    }
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      setNotesLoading(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? "";
        if (message.includes("Auth session missing")) { setNotes([]); setNotesLoading(false); return; }
        throw authError;
      }
      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) { setNotes([]); setNotesLoading(false); return; }
      const { data, error } = await supabase
        .from("lahan_notes")
        .select("id,lahan_id,title,content,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setNotes(Array.isArray(data) ? (data as LahanNoteRecord[]) : []);
    } catch (error) {
      console.error("❌ Gagal memuat catatan:", error);
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [fallbackUserId]);

  const getCurrentLocation = useCallback(async (moveMap = true) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Lokasi diperlukan untuk menampilkan peta");
        setLocationLabel("Izin lokasi belum diberikan");
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const baseRegion = currentRegionRef.current;
      const nextRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: clampDeltaValue(baseRegion?.latitudeDelta ?? 0.01),
        longitudeDelta: clampDeltaValue(baseRegion?.longitudeDelta ?? 0.01),
      };
      setUserLocation(nextRegion);
      if (moveMap) {
        currentRegionRef.current = nextRegion;
        mapRef.current?.animateToRegion(nextRegion, 350);
      }
      const fallbackLabel = buildCoordinateLabel(location.coords.latitude, location.coords.longitude);
      const cacheKey = buildGeocodeCacheKey(location.coords.latitude, location.coords.longitude);
      const cachedLabel = geocodeCacheRef.current.get(cacheKey);
      if (cachedLabel !== undefined) {
        setLocationLabel(cachedLabel ?? fallbackLabel);
      } else if (isGeocodeRateLimited()) {
        setLocationLabel(fallbackLabel);
      } else {
        try {
          const geocoded = await Location.reverseGeocodeAsync({ latitude: location.coords.latitude, longitude: location.coords.longitude });
          const formatted = formatGeocodedLocation(geocoded?.[0] ?? null);
          geocodeCacheRef.current.set(cacheKey, formatted ?? null);
          setLocationLabel(formatted ?? fallbackLabel);
        } catch (reverseError) {
          geocodeCacheRef.current.set(cacheKey, null);
          if (isRateLimitError(reverseError)) markGeocodeRateLimited("lokasi pengguna");
          else console.warn("Reverse geocode gagal", reverseError);
          setLocationLabel(fallbackLabel);
        }
      }
    } catch (error) {
      console.error("❌ Location error:", error);
      Alert.alert("Error", "Gagal mendapatkan lokasi");
      setLocationLabel("Lokasi tidak diketahui");
    }
  }, [isGeocodeRateLimited, markGeocodeRateLimited]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void getCurrentLocation(!requestedLahanId);
      void loadSavedLahan();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [getCurrentLocation, loadSavedLahan, requestedLahanId]);
  useEffect(() => {
    const timeoutId = setTimeout(() => void loadNotes(), 0);
    return () => clearTimeout(timeoutId);
  }, [loadNotes]);

  useEffect(() => {
    if (!requestedLahanId || !mapIsReady || savedLahan.length === 0) return;

    const requestSignature = `${requestedLahanId}:${requestedFocusToken ?? "default"}`;
    if (handledFocusRequestRef.current === requestSignature) return;

    const target = savedLahan.find((item) => item.id === requestedLahanId);
    if (!target || target.coordinates.length < 3) return;

    handledFocusRequestRef.current = requestSignature;
    setFocusedLahanId(target.id);
    setDrawingMode(false);
    setSearchMarker(null);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });

    const focusTimer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(target.coordinates, {
        edgePadding: { top: 96, right: 52, bottom: 96, left: 52 },
        animated: true,
      });
    }, 250);

    return () => clearTimeout(focusTimer);
  }, [mapIsReady, requestedFocusToken, requestedLahanId, savedLahan]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (mapScrollResetTimeoutRef.current) clearTimeout(mapScrollResetTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (savedLahan.length === 0) {
        setLahanHealth([]); setSelectedNoteLahanId(null); setLahanLocationLabels({});
        return;
      }
      const lahanIds = savedLahan.map((item) => item.id).filter(Boolean);
      setSelectedNoteLahanId((prev) => prev ?? lahanIds[0] ?? null);
      setLahanLocationLabels((prev) => {
        const next: Record<string, string | null> = {};
        let changed = false;
        savedLahan.forEach((item) => {
          if (prev[item.id] !== undefined) next[item.id] = prev[item.id] ?? null;
          else changed = true;
        });
        if (!changed && Object.keys(prev).length === savedLahan.length) return prev;
        return next;
      });
      if (lahanIds.length > 0) void loadLahanHealth(lahanIds);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadLahanHealth, savedLahan]);

  useEffect(() => {
    const query = searchQuery.trim();
    let isActive = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      if (query.length < 3) {
        setSearchResults([]);
        setShowSearchResults(false);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      setShowSearchResults(true);
      try {
        const endpoint = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`;
        const response = await fetch(endpoint, {
          headers: { "User-Agent": "MataniApp/1.0 (https://matani.app)", "Accept-Language": "id,en" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Gagal mencari lokasi");
        const raw = await response.json();
        if (!isActive) return;
        const normalized = (Array.isArray(raw) ? raw : [])
          .map((item: any, index: number) => {
            const lat = parseFloat(item?.lat);
            const lon = parseFloat(item?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
            const address = item?.address ?? {};
            const subtitleParts = [address.road, address.neighbourhood || address.suburb, address.city || address.town || address.village, address.state].filter(Boolean);
            return {
              id: String(item?.place_id ?? index),
              label: item?.display_name ?? subtitleParts[0] ?? "Lokasi tanpa nama",
              subtitle: subtitleParts.length > 0 ? subtitleParts.join(", ") : undefined,
              latitude: lat,
              longitude: lon,
            } as SearchSuggestion;
          })
          .filter(Boolean)
          .slice(0, 6) as SearchSuggestion[];
        setSearchResults(normalized);
        setShowSearchResults(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("❌ Gagal mencari lokasi:", error);
        if (isActive) { setSearchResults([]); setShowSearchResults(true); }
      } finally {
        if (isActive) setIsSearching(false);
      }
    }, query.length < 3 ? 0 : 400);
    return () => { isActive = false; controller.abort(); clearTimeout(timeoutId); };
  }, [searchQuery]);

  useEffect(() => {
    if (savedLahan.length === 0) return;
    const pending = savedLahan.filter((item) => {
      if (!Array.isArray(item.coordinates) || item.coordinates.length === 0) return false;
      return lahanLocationLabels[item.id] === undefined;
    });
    if (pending.length === 0) return;
    let isCancelled = false;
    (async () => {
      const updates: Record<string, string | null> = {};
      for (const lahan of pending) {
        if (isCancelled) break;
        const centroid = computePolygonCentroid(lahan.coordinates);
        if (!centroid) { updates[lahan.id] = null; continue; }
        const fallbackLabel = buildCoordinateLabel(centroid.latitude, centroid.longitude);
        const cacheKey = buildGeocodeCacheKey(centroid.latitude, centroid.longitude);
        const cachedLabel = geocodeCacheRef.current.get(cacheKey);
        if (cachedLabel !== undefined) { updates[lahan.id] = cachedLabel ?? fallbackLabel; continue; }
        if (isGeocodeRateLimited()) { updates[lahan.id] = fallbackLabel; continue; }
        try {
          const result = await Location.reverseGeocodeAsync({ latitude: centroid.latitude, longitude: centroid.longitude });
          const formatted = formatGeocodedLocation(result?.[0] ?? null);
          geocodeCacheRef.current.set(cacheKey, formatted ?? null);
          updates[lahan.id] = formatted ?? fallbackLabel;
        } catch (error) {
          geocodeCacheRef.current.set(cacheKey, null);
          if (isRateLimitError(error)) markGeocodeRateLimited(`lahan ${lahan.id}`);
          else console.warn("❌ Gagal reverse geocode lahan:", lahan.id, error);
          updates[lahan.id] = fallbackLabel;
        }
      }
      if (!isCancelled && Object.keys(updates).length > 0) {
        setLahanLocationLabels((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => { isCancelled = true; };
  }, [isGeocodeRateLimited, lahanLocationLabels, markGeocodeRateLimited, savedLahan]);

  const handleMapPress = (event: MapPressEvent) => {
    if (showSearchResults) { setShowSearchResults(false); Keyboard.dismiss(); }
    if (!drawingMode) return;
    const rawCoordinate = event.nativeEvent.coordinate;
    const lat = Number(rawCoordinate.latitude);
    const lon = Number(rawCoordinate.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      console.warn("❌ Invalid coordinate from map press:", rawCoordinate);
      return;
    }
    const coordinate: LatLng = {
      latitude: Number(lat.toFixed(7)),
      longitude: Number(lon.toFixed(7)),
    };
    const vertex = {
      id: `drawing-${nextDrawingVertexIdRef.current++}`,
      coordinate,
    };
    setCurrentVertices((prev) => [...prev, vertex]);
    setRedoVertices([]);
  };

  const clearActivePath = useCallback(() => {
    setCurrentVertices([]); setPendingPolygon([]); setRedoVertices([]);
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length === 0) { setSearchResults([]); setShowSearchResults(false); setSearchMarker(null); }
    else setShowSearchResults(true);
  };

  const handleClearSearch = () => {
    setSearchQuery(""); setSearchResults([]); setShowSearchResults(false); setSearchMarker(null); Keyboard.dismiss();
  };

  const handleSearchFocus = () => {
    if (searchResults.length > 0) setShowSearchResults(true);
  };

  const handleSelectSearchResult = (result: SearchSuggestion) => {
    Keyboard.dismiss();
    const coordinate = { latitude: result.latitude, longitude: result.longitude };
    setSearchQuery(result.label); setSearchResults([]); setShowSearchResults(false);
    setSearchMarker(coordinate); setLocationLabel(result.label);
    setFocusedLahanId(null);
    clearActivePath(); setDrawingMode(false); setShowSaveModal(false);
    const nextRegion: Region = { latitude: coordinate.latitude, longitude: coordinate.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 };
    setUserLocation((prev) => ({ ...prev, latitude: coordinate.latitude, longitude: coordinate.longitude }));
    currentRegionRef.current = nextRegion;
    mapRef.current?.animateToRegion(nextRegion, 350);
  };

  const animateToRegion = useCallback((region: Region, duration = 200) => {
    if (!mapRef.current) return;
    currentRegionRef.current = region;
    mapRef.current.animateToRegion(region, duration);
  }, []);

  const handleZoom = useCallback(
    (direction: "in" | "out") => {
      const baseRegion = currentRegionRef.current ?? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: userLocation.latitudeDelta,
        longitudeDelta: userLocation.longitudeDelta,
      };
      const factor = direction === "in" ? 0.6 : 1.6;
      const nextRegion: Region = {
        ...baseRegion,
        latitudeDelta: clampDeltaValue(baseRegion.latitudeDelta * factor),
        longitudeDelta: clampDeltaValue(baseRegion.longitudeDelta * factor),
      };
      animateToRegion(nextRegion);
    },
    [animateToRegion, userLocation]
  );

  const handleRecenter = useCallback(() => {
    const current = currentRegionRef.current ?? userLocation;
    const nextRegion: Region = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: clampDeltaValue(current.latitudeDelta ?? userLocation.latitudeDelta),
      longitudeDelta: clampDeltaValue(current.longitudeDelta ?? userLocation.longitudeDelta),
    };
    animateToRegion(nextRegion, 300);
    setFocusedLahanId(null);
    setSearchMarker(null);
    getCurrentLocation(true);
  }, [animateToRegion, getCurrentLocation, userLocation]);

  const handleMapTouchStart = useCallback(() => {
    mapTouchActiveRef.current = true;
    mapTouchLastActiveRef.current = Date.now();
    setScrollEnabled((prev) => { if (!prev) return prev; return false; });
    if (scrollTimeoutRef.current) { clearTimeout(scrollTimeoutRef.current); scrollTimeoutRef.current = null; }
    scheduleScrollLockReset();
  }, [scheduleScrollLockReset]);

  const handleMapTouchEnd = useCallback(() => {
    mapTouchActiveRef.current = false;
    mapTouchLastActiveRef.current = Date.now();
    if (mapScrollResetTimeoutRef.current) { clearTimeout(mapScrollResetTimeoutRef.current); mapScrollResetTimeoutRef.current = null; }
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => { releaseScrollLock(); scrollTimeoutRef.current = null; }, 50);
  }, [releaseScrollLock]);

  const handleMapPanDrag = useCallback(() => {
    mapTouchLastActiveRef.current = Date.now();
    if (!mapTouchActiveRef.current) mapTouchActiveRef.current = true;
    scheduleScrollLockReset();
  }, [scheduleScrollLockReset]);

  const startDrawing = () => {
    setDrawingMode(true); setShowSaveModal(false); setLahanName("");
    setFocusedLahanId(null);
    setPendingPolygonSource("draw"); setImportedFileName(null); clearActivePath();
    Alert.alert("Mode Gambar Aktif", "Tap pada peta untuk menandai titik-titik polygon.");
  };

  const finishDrawing = () => {
    if (activePath.length < 3) { Alert.alert("Error", "Minimal 3 titik diperlukan untuk membuat polygon lahan."); return; }
    const completedPath = activePath.map((coord) => ({ ...coord }));
    setPendingPolygonSource("draw"); setImportedFileName(null);
    setPendingPolygon(completedPath); setDrawingMode(false); setShowSaveModal(true);
    setCurrentVertices([]); setRedoVertices([]);
  };

  const cancelDrawing = () => {
    setDrawingMode(false); setShowSaveModal(false); setLahanName("");
    setPendingPolygonSource("draw"); setImportedFileName(null); clearActivePath();
  };

  const importGeoJson = async () => {
    if (drawingMode || geoJsonImportInFlightRef.current) return;
    try {
      geoJsonImportInFlightRef.current = true;
      setIsImportingGeoJson(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
        base64: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!/\.(?:geo)?json$/i.test(asset.name)) {
        throw new GeoJsonImportError(
          "INVALID_JSON",
          "Pilih file dengan ekstensi .geojson atau .json.",
        );
      }
      if (typeof asset.size === "number" && asset.size > MAX_GEOJSON_FILE_BYTES) {
        throw new GeoJsonImportError(
          "INVALID_JSON",
          "Ukuran GeoJSON maksimal 1 MB.",
        );
      }
      const text = await new File(asset.uri).text();
      if (text.length > MAX_GEOJSON_FILE_BYTES) {
        throw new GeoJsonImportError("INVALID_JSON", "Ukuran GeoJSON maksimal 1 MB.");
      }
      const imported = parseFieldGeoJson(text, asset.name);
      clearActivePath();
      setPendingPolygon(imported.coordinates);
      setPendingPolygonSource("geojson");
      setImportedFileName(asset.name);
      setLahanName(imported.suggestedName ?? "");
      setDrawingMode(false);
      setShowSaveModal(true);
      mapRef.current?.fitToCoordinates(imported.coordinates, {
        edgePadding: { top: 80, right: 48, bottom: 80, left: 48 },
        animated: true,
      });
    } catch (error) {
      console.warn("Gagal mengimpor GeoJSON:", error);
      Alert.alert(
        "GeoJSON tidak dapat diimpor",
        error instanceof GeoJsonImportError
          ? error.message
          : "File tidak dapat dibaca. Pastikan file berisi satu Polygon WGS84 yang valid.",
      );
    } finally {
      geoJsonImportInFlightRef.current = false;
      setIsImportingGeoJson(false);
    }
  };

  const openGeoJsonPreview = useCallback((
    name: string,
    coordinates: LatLng[],
    returnToSave = false,
  ) => {
    try {
      setGeoJsonPreview(buildFieldGeoJson(name, coordinates));
      setResumeSaveAfterGeoJsonPreview(returnToSave);
      if (returnToSave) setShowSaveModal(false);
    } catch (error) {
      console.warn("Gagal membuat GeoJSON:", error);
      Alert.alert("GeoJSON tidak dapat dibuat", "Polygon lahan belum valid untuk diekspor.");
    }
  }, []);

  const closeGeoJsonPreview = useCallback(() => {
    setGeoJsonPreview(null);
    if (resumeSaveAfterGeoJsonPreview) setShowSaveModal(true);
    setResumeSaveAfterGeoJsonPreview(false);
  }, [resumeSaveAfterGeoJsonPreview]);

  const copyGeoJson = useCallback(async (exported: ExportedFieldGeoJson) => {
    await Clipboard.setStringAsync(exported.text);
    Alert.alert("GeoJSON disalin", "Isi GeoJSON sudah disalin ke clipboard.");
  }, []);

  const shareGeoJson = useCallback(async (exported: ExportedFieldGeoJson) => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        await Clipboard.setStringAsync(exported.text);
        Alert.alert(
          "GeoJSON disalin",
          "Perangkat ini tidak menyediakan menu ekspor file, jadi isi GeoJSON disalin ke clipboard.",
        );
        return;
      }
      const outputFile = new File(Paths.cache, exported.fileName);
      outputFile.create({ overwrite: true, intermediates: true });
      outputFile.write(exported.text);
      await Sharing.shareAsync(outputFile.uri, {
        dialogTitle: `Ekspor ${exported.fileName}`,
        mimeType: "application/geo+json",
        UTI: "public.geojson",
      });
    } catch (error) {
      console.warn("Gagal mengekspor GeoJSON:", error);
      Alert.alert(
        "Ekspor gagal",
        "File GeoJSON belum dapat dibagikan. Coba tombol Salin GeoJSON pada pratinjau.",
      );
    }
  }, []);

  const switchBaseMap = useCallback(() => {
    setBaseMapType((current) => current === "satellite" ? "standard" : "satellite");
  }, []);

  const undoLastPoint = () => {
    if (currentVertices.length === 0) return;
    const removedVertex = currentVertices[currentVertices.length - 1];
    setCurrentVertices(currentVertices.slice(0, -1));
    setRedoVertices((prevRedo) => [...prevRedo, removedVertex]);
  };

  const redoLastPoint = () => {
    if (redoVertices.length === 0) return;
    const recoveredVertex = redoVertices[redoVertices.length - 1];
    setRedoVertices(redoVertices.slice(0, -1));
    setCurrentVertices((prevPath) => [...prevPath, recoveredVertex]);
  };

  const saveLahan = async () => {
    const trimmedName = lahanName.trim();
    if (!trimmedName) { Alert.alert("Error", "Nama lahan tidak boleh kosong"); return; }
    if (pendingPolygon.length < 3) { Alert.alert("Error", "Polygon lahan belum lengkap untuk disimpan."); return; }
    if (isSaving) return;
    const polygonToPersist = [...pendingPolygon];
    const area = calculatePolygonAreaHa(polygonToPersist);
    try {
      setIsSaving(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? "";
        if (message.includes("Auth session missing")) { promptAuthSignup(); setShowSaveModal(false); return; }
        throw authError;
      }
      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) { promptAuthSignup(); setShowSaveModal(false); return; }
      let categoryThumbnailUrl: string | null = null;
      try {
        const resolvedAsset = Image.resolveAssetSource(PADI_CATEGORY.thumbnail);
        categoryThumbnailUrl = resolvedAsset.uri;
      } catch (error) {
        console.warn("Gagal memuat thumbnail padi:", error);
      }
      const savedEntry = await lahanService.saveLahan(trimmedName, polygonToPersist, userId, area, {
        thumbnailUrl: categoryThumbnailUrl,
      });
      const savedArea = Number(savedEntry?.area_ha ?? area);
      const areaText = Number.isFinite(savedArea) ? savedArea.toFixed(2) : area.toFixed(2);
      const newSavedLahan: SavedLahanItem = {
        id: savedEntry?.id ?? `local-${Date.now()}`,
        name: trimmedName,
        coordinates: polygonToPersist,
        areaHa: savedArea,
        createdAt: savedEntry?.created_at ?? new Date().toISOString(),
        thumbnailUrl: savedEntry?.thumbnail_url ?? categoryThumbnailUrl ?? null,
        category: savedEntry?.category ?? PADI_CATEGORY.id,
      };
      setSavedLahan((prev) => {
        const filtered = prev.filter((item) => item.id !== newSavedLahan.id);
        return [...filtered, newSavedLahan];
      });
      loadSavedLahan();
      setShowSaveModal(false); setLahanName("");
      setPendingPolygonSource("draw"); setImportedFileName(null); clearActivePath();
      let measurementAccepted = false;
      if (savedEntry?.id) {
        try {
          await requestLahanMeasurement(savedEntry.id, { initial: true });
          measurementAccepted = true;
          void loadLahanHealth([savedEntry.id]);
        } catch (measurementError) {
          console.warn("Pengukuran lahan belum dapat diproses:", measurementError);
        }
      }
      if (exportAfterSave) {
        await shareGeoJson(buildFieldGeoJson(trimmedName, polygonToPersist));
      }
      Alert.alert(
        "Lahan tersimpan",
        `Lahan "${trimmedName}" berhasil disimpan.\nLuas: ${areaText} ha\n\n${
          measurementAccepted
            ? "Job NDVI/NDMI diterima dan sedang diproses; hasil hanya tampil jika acquisition dan kualitasnya tersedia."
            : "Job NDVI/NDMI belum berhasil dimulai. Detail lahan akan mencoba kembali secara otomatis; batas lahan tetap tersimpan."
        }`
      );
    } catch (error: any) {
      console.error("❌ Gagal menyimpan lahan:", error);
      const message =
        error?.message === "USER_ID_REQUIRED"
          ? "ID pengguna tidak ditemukan. Pastikan Anda sudah login."
          : error?.message || "Terjadi kesalahan saat menyimpan lahan.";
      Alert.alert("Gagal", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSave = () => {
    setShowSaveModal(false); setLahanName(""); setPendingPolygonSource("draw");
    setImportedFileName(null); clearActivePath();
  };

  const lahanNameLookup = useMemo(() => {
    const map = new Map<string, SavedLahanItem>();
    savedLahan.forEach((item) => map.set(item.id, item));
    return map;
  }, [savedLahan]);

  const latestHealthByLahan = useMemo(() => {
    const map = new Map<string, LahanHealthRecord>();
    lahanHealth.forEach((record) => {
      if (!record?.lahan_id) return;
      const existing = map.get(record.lahan_id);
      if (!existing) { map.set(record.lahan_id, record); return; }
      const recordTime = Math.max(parseDateToTime(record.captured_at), parseDateToTime(record.created_at));
      const existingTime = Math.max(parseDateToTime(existing.captured_at), parseDateToTime(existing.created_at));
      if (recordTime >= existingTime) map.set(record.lahan_id, record);
    });
    return map;
  }, [lahanHealth]);

  const lahanCards = useMemo<LahanCard[]>(() => {
    return savedLahan.map((item) => {
      const supabaseHealth = latestHealthByLahan.get(item.id);
      const hasObservationDate =
        typeof supabaseHealth?.captured_at === "string" &&
        !Number.isNaN(Date.parse(supabaseHealth.captured_at));
      const supabaseNdvi =
        hasObservationDate &&
        typeof supabaseHealth?.ndvi_score === "number" &&
        Number.isFinite(supabaseHealth.ndvi_score)
          ? supabaseHealth.ndvi_score
          : null;
      const supabaseNdmi =
        hasObservationDate &&
        typeof supabaseHealth?.ndmi_score === "number" &&
        Number.isFinite(supabaseHealth.ndmi_score)
          ? supabaseHealth.ndmi_score
          : null;
      const latestHealth =
        supabaseNdvi !== null
          ? { ...supabaseHealth!, ndvi_score: supabaseNdvi, ndmi_score: supabaseNdmi }
          : undefined;
      const centroid = computePolygonCentroid(item.coordinates ?? []);
      return {
        ...item,
        latestHealth,
        centroid,
        coordinateCount: Array.isArray(item.coordinates) ? item.coordinates.length : 0,
        locationLabel: lahanLocationLabels[item.id] ?? null,
      };
    });
  }, [lahanLocationLabels, latestHealthByLahan, savedLahan]);

  const resolveLahanThumbnailSource = useCallback(
    (card: LahanCard): ImageSourcePropType => {
      if (card.thumbnailUrl) return { uri: card.thumbnailUrl };
      return DEFAULT_LAHAN_THUMBNAIL;
    },
    []
  );

  const lahanSummaryPayload = useMemo(() => {
    if (lahanCards.length === 0) return null;
    let totalArea = 0, ndviSum = 0, ndviCount = 0, latestTimestamp = 0;
    const dataStateBreakdown: Record<NdviDataState, number> = {
      measured: 0,
      unavailable: 0,
    };
    const cardsPayload = lahanCards.map((card) => {
      if (typeof card.areaHa === "number" && Number.isFinite(card.areaHa)) totalArea += card.areaHa;
      const ndviScore =
        typeof card.latestHealth?.ndvi_score === "number" && Number.isFinite(card.latestHealth.ndvi_score)
          ? Number(card.latestHealth.ndvi_score.toFixed(2))
          : null;
      const ndmiScore =
        typeof card.latestHealth?.ndmi_score === "number" && Number.isFinite(card.latestHealth.ndmi_score)
          ? Number(card.latestHealth.ndmi_score.toFixed(2))
          : null;
      if (ndviScore !== null) { ndviSum += ndviScore; ndviCount += 1; }
      const timestamp = parseDateToTime(card.latestHealth?.captured_at ?? null);
      if (timestamp > latestTimestamp) latestTimestamp = timestamp;
      const dataState = getNdviDataState(card.latestHealth);
      dataStateBreakdown[dataState] += 1;
      return {
        id: card.id,
        name: card.name,
        dataState,
        areaHa: typeof card.areaHa === "number" && Number.isFinite(card.areaHa) ? Number(card.areaHa.toFixed(2)) : null,
        ndviScore,
        ndmiScore,
        coordinateCount: card.coordinateCount,
        capturedAt: card.latestHealth?.captured_at ?? null,
        locationLabel: card.locationLabel,
      };
    });
    return {
      lahanCards: cardsPayload,
      totals: {
        lahanCount: cardsPayload.length,
        totalAreaHa: Number(totalArea.toFixed(2)),
        averageNdvi: ndviCount > 0 ? Number((ndviSum / ndviCount).toFixed(2)) : null,
        dataStateBreakdown,
        latestDataTimestamp: latestTimestamp ? new Date(latestTimestamp).toISOString() : null,
      },
    };
  }, [lahanCards]);

  const totalLahanPages = useMemo(() => {
    if (lahanCards.length === 0) return 0;
    return Math.ceil(lahanCards.length / LAHAN_PAGE_SIZE);
  }, [lahanCards.length]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (totalLahanPages === 0) { setLahanPage(0); return; }
      setLahanPage((prev) => Math.min(prev, Math.max(totalLahanPages - 1, 0)));
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [totalLahanPages]);

  const paginatedLahanCards = useMemo(() => {
    if (lahanCards.length === 0) return [] as LahanCard[];
    const maxPageIndex = Math.max(totalLahanPages - 1, 0);
    const pageIndex = Math.min(Math.max(lahanPage, 0), maxPageIndex);
    const start = pageIndex * LAHAN_PAGE_SIZE;
    return lahanCards.slice(start, start + LAHAN_PAGE_SIZE);
  }, [lahanCards, lahanPage, totalLahanPages]);

  const hasLahanPagination = totalLahanPages > 1;
  const lahanPageDisplay = totalLahanPages === 0 ? 0 : Math.min(lahanPage + 1, totalLahanPages);
  const handlePrevLahanPage = useCallback(() => setLahanPage((prev) => Math.max(prev - 1, 0)), []);
  const handleNextLahanPage = useCallback(() => setLahanPage((prev) => Math.min(prev + 1, Math.max(totalLahanPages - 1, 0))), [totalLahanPages]);
  const isPrevLahanDisabled = lahanPage <= 0;
  const isNextLahanDisabled = totalLahanPages === 0 || lahanPage >= Math.max(totalLahanPages - 1, 0);

  const fetchLahanSummary = useCallback(
    async (forceRefresh = false) => {
      if (!lahanSummaryPayload || lahanSummaryPayload.lahanCards.length === 0) {
        setLahanSummaryText(""); setLahanSummaryError(null); lahanSummarySignatureRef.current = null;
        return;
      }
      const signature = JSON.stringify(lahanSummaryPayload);
      if (!forceRefresh && lahanSummarySignatureRef.current === signature) return;
      setIsLahanSummaryLoading(true); setLahanSummaryError(null); setLahanSummaryText("");
      const requestOptions: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: signature };
      const candidateUrls: string[] = [];
      API_BASE_CANDIDATES.forEach((baseUrl) => {
        const normalised = baseUrl.replace(/\/$/, "");
        const directUrl = `${normalised}/ai/summary`;
        if (!candidateUrls.includes(directUrl)) candidateUrls.push(directUrl);
        if (!/\/api\/?$/.test(normalised)) {
          const apiPrefixed = `${normalised}/api/ai/summary`;
          if (!candidateUrls.includes(apiPrefixed)) candidateUrls.push(apiPrefixed);
        }
      });
      try {
        let data: { summary?: unknown } | null = null;
        let lastErrorMessage = "";
        for (const url of candidateUrls) {
          try {
            const response = await authenticatedBackendFetch(url, requestOptions);
            data = await readBackendJson<{ summary?: unknown }>(response);
          }
          catch (networkError) {
            lastErrorMessage = retainMostUsefulBackendError(
              lastErrorMessage,
              networkError
            );
            continue;
          }
          break;
        }
        if (!data) throw new Error(lastErrorMessage || "Ringkasan lahan tidak dapat dimuat.");
        const summary = typeof data?.summary === "string" ? data.summary.trim() : "";
        lahanSummarySignatureRef.current = signature;
        setLahanSummaryText(summary);
      } catch (error) {
        console.error("❌ Gagal memuat ringkasan lahan:", error);
        setLahanSummaryError("Ringkasan belum bisa dibuat. Pastikan server Matani berjalan lalu coba lagi.");
        lahanSummarySignatureRef.current = null;
      } finally {
        setIsLahanSummaryLoading(false);
      }
    },
    [lahanSummaryPayload]
  );

  const handleRefreshSummary = useCallback(() => fetchLahanSummary(true), [fetchLahanSummary]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!lahanSummaryPayload || lahanSummaryPayload.lahanCards.length === 0) {
        setLahanSummaryText(""); setLahanSummaryError(null); lahanSummarySignatureRef.current = null;
        return;
      }
      const signature = JSON.stringify(lahanSummaryPayload);
      if (lahanSummarySignatureRef.current && lahanSummarySignatureRef.current !== signature) {
        lahanSummarySignatureRef.current = null; setLahanSummaryText(""); setLahanSummaryError(null);
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [lahanSummaryPayload]);

  useEffect(() => {
    if (!lahanSummaryText) return;
    const timeoutId = setTimeout(() => setIsLahanSummaryCollapsed(false), 0);
    return () => clearTimeout(timeoutId);
  }, [lahanSummaryText]);

  const notesWithMetadata = useMemo(() => {
    return notes.map((note) => ({
      ...note,
      lahanName: note.lahan_id ? lahanNameLookup.get(note.lahan_id)?.name ?? null : null,
    }));
  }, [lahanNameLookup, notes]);

  const selectedNoteLahanName = useMemo(() => {
    if (!selectedNoteLahanId) return null;
    return lahanNameLookup.get(selectedNoteLahanId)?.name ?? null;
  }, [lahanNameLookup, selectedNoteLahanId]);

  const handleOpenNoteModal = () => {
    if (!selectedNoteLahanId && savedLahan.length > 0) setSelectedNoteLahanId(savedLahan[0].id);
    setShowNoteModal(true); setIsLahanPickerVisible(false);
  };

  const closeNoteModal = () => { setShowNoteModal(false); setIsLahanPickerVisible(false); };
  const resetNoteForm = () => { setNoteTitle(""); setNoteContent(""); };
  const handleCancelNote = () => { resetNoteForm(); closeNoteModal(); };
  const handleSelectNoteLahan = (id: string | null) => { setSelectedNoteLahanId(id); setIsLahanPickerVisible(false); };

  const handleSaveNote = async () => {
    const trimmedTitle = noteTitle.trim();
    const trimmedContent = noteContent.trim();
    if (!trimmedTitle || !trimmedContent) { Alert.alert("Catatan belum lengkap", "Judul dan isi catatan wajib diisi."); return; }
    if (isSavingNote) return;
    try {
      setIsSavingNote(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? "";
        if (message.includes("Auth session missing")) { promptAuthSignup(); closeNoteModal(); return; }
        throw authError;
      }
      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) { promptAuthSignup(); closeNoteModal(); return; }
      if (editingNoteId) {
        const { data, error } = await supabase
          .from("lahan_notes")
          .update({ title: trimmedTitle, content: trimmedContent, lahan_id: selectedNoteLahanId })
          .eq("id", editingNoteId)
          .eq("user_id", userId)
          .select("id,lahan_id,title,content,created_at")
          .single();
        if (error) throw error;
        const updatedNote = data as LahanNoteRecord;
        setNotes((prev) => prev.map((note) => (note.id === updatedNote.id ? updatedNote : note)));
        Alert.alert("Berhasil", "Catatan berhasil diperbarui");
      } else {
        const { data, error } = await supabase
          .from("lahan_notes")
          .insert([{ user_id: userId, lahan_id: selectedNoteLahanId, title: trimmedTitle, content: trimmedContent }])
          .select("id,lahan_id,title,content,created_at")
          .single();
        if (error) throw error;
        const newNote = data as LahanNoteRecord;
        setNotes((prev) => { const filtered = prev.filter((item) => item.id !== newNote.id); return [newNote, ...filtered]; });
        Alert.alert("Berhasil", "Catatan berhasil disimpan");
      }
      resetNoteForm(); closeNoteModal(); setEditingNoteId(null); setShowEditNoteModal(false);
    } catch (error: any) {
      console.error("❌ Gagal menyimpan catatan:", error);
      const message = error?.message ?? "Terjadi kesalahan saat menyimpan catatan.";
      Alert.alert("Gagal menyimpan catatan", message);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleEditNote = (note: LahanNoteRecord & { lahanName: string | null }) => {
    setEditingNoteId(note.id); setNoteTitle(note.title); setNoteContent(note.content);
    setSelectedNoteLahanId(note.lahan_id); setShowEditNoteModal(true);
  };

  const handleDeleteNote = async (noteId: string) => {
    Alert.alert("Hapus Catatan", "Apakah Anda yakin ingin menghapus catatan ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus", style: "destructive",
        onPress: async () => {
          try {
            const { data: authData } = await supabase.auth.getUser();
            const userId = authData?.user?.id ?? fallbackUserId;
            const { error } = await supabase.from("lahan_notes").delete().eq("id", noteId).eq("user_id", userId);
            if (error) throw error;
            setNotes((prev) => prev.filter((note) => note.id !== noteId));
            Alert.alert("Berhasil", "Catatan berhasil dihapus");
          } catch (error: any) {
            console.error("❌ Gagal menghapus catatan:", error);
            Alert.alert("Gagal", "Terjadi kesalahan saat menghapus catatan");
          }
        },
      },
    ]);
  };

  const handleEditLahan = (lahan: SavedLahanItem) => {
    setEditingLahanId(lahan.id); setEditLahanName(lahan.name); setShowEditLahanModal(true);
  };

  const handleSaveEditLahan = async () => {
    const trimmedName = editLahanName.trim();
    if (!trimmedName) { Alert.alert("Error", "Nama lahan tidak boleh kosong"); return; }
    if (!editingLahanId) return;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? fallbackUserId;
      const { error } = await supabase.from("lahan").update({ name: trimmedName }).eq("id", editingLahanId).eq("user_id", userId);
      if (error) throw error;
      setSavedLahan((prev) => prev.map((item) => item.id === editingLahanId ? { ...item, name: trimmedName } : item));
      Alert.alert("Berhasil", "Nama lahan berhasil diperbarui");
      setShowEditLahanModal(false); setEditingLahanId(null); setEditLahanName("");
    } catch (error: any) {
      console.error("❌ Gagal memperbarui lahan:", error);
      Alert.alert("Gagal", "Terjadi kesalahan saat memperbarui lahan");
    }
  };

  const handleDeleteLahan = async (lahanId: string) => {
    Alert.alert(
      "Hapus Lahan",
      "Apakah Anda yakin ingin menghapus lahan ini? Semua data terkait akan hilang.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus", style: "destructive",
          onPress: async () => {
            try {
              const { data: authData } = await supabase.auth.getUser();
              const userId = authData?.user?.id ?? fallbackUserId;
              await supabase.from("lahan_notes").delete().eq("lahan_id", lahanId).eq("user_id", userId);
              const { error } = await supabase.from("lahan").delete().eq("id", lahanId).eq("user_id", userId);
              if (error) throw error;
              setSavedLahan((prev) => prev.filter((item) => item.id !== lahanId));
              setLahanHealth((prev) => prev.filter((item) => item.lahan_id !== lahanId));
              setNotes((prev) => prev.filter((note) => note.lahan_id !== lahanId));
              Alert.alert("Berhasil", "Lahan berhasil dihapus");
            } catch (error: any) {
              console.error("❌ Gagal menghapus lahan:", error);
              Alert.alert("Gagal", "Terjadi kesalahan saat menghapus lahan");
            }
          },
        },
      ]
    );
  };

  const pendingArea = calculatePolygonAreaHa(pendingPolygon);
  const formattedPendingArea = Number.isFinite(pendingArea) ? pendingArea.toFixed(2) : "0.00";
  const isFieldSaveDisabled = isSaving || !lahanName.trim();
  const isNoteFormValid = noteTitle.trim().length > 0 && noteContent.trim().length > 0;

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A3D1F" />

        <ScrollView
          ref={scrollViewRef}
          style={styles.contentScroll}
          contentContainerStyle={styles.contentScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
          removeClippedSubviews={true}
          scrollEventThrottle={16}
        >
          {/* ── HEADER ── */}
          <LinearGradient
            colors={["#062B14", "#0A3D1F", "#0E5229"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerTopRow}>
              <View style={styles.headerBrand}>
                <View style={styles.headerBrandDot} />
                <Text style={styles.headerBrandText}>MATANI</Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>Lokasi Ladang</Text>
            <View style={styles.headerLocationChip}>
              <Ionicons name="location" size={12} color="#86EFAC" />
              <Text style={styles.headerSubtitle} numberOfLines={1}>{locationLabel}</Text>
            </View>
          </LinearGradient>

          {/* ── MAP ── */}
          <View style={[styles.mapContainer, drawingMode && styles.mapContainerDrawing]}>
            {!drawingMode && (
              <View style={styles.searchContainer} pointerEvents="box-none">
                <View style={styles.searchInputWrapper}>
                <Ionicons name="search-outline" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari lokasi lahan..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  onFocus={handleSearchFocus}
                  returnKeyType="search"
                />
                {isSearching ? (
                  <ActivityIndicator size="small" color="#166534" style={styles.searchSpinner} />
                ) : searchQuery.length > 0 ? (
                  <Pressable
                    onPress={handleClearSearch}
                    style={({ pressed }) => [styles.clearSearchButton, pressed && { opacity: 0.2 }]}
                    accessibilityRole="button"
                    accessibilityLabel="Hapus pencarian"
                  >
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </Pressable>
                ) : null}
                </View>

                {showSearchResults && (
                  <View style={styles.searchResultsContainer}>
                  {isSearching ? (
                    <View style={styles.searchLoadingRow}>
                      <ActivityIndicator size="small" color="#166534" />
                      <Text style={styles.searchLoadingText}>Mencari lokasi…</Text>
                    </View>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result) => (
                      <Pressable
                        key={result.id}
                        style={({ pressed }) => [styles.searchResultItem, pressed && { opacity: 0.2 }]}
                        onPress={() => handleSelectSearchResult(result)}
                        accessibilityRole="button"
                      >
                        <Ionicons name="location-outline" size={14} color="#166534" style={{ marginRight: 8, marginTop: 1 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.searchResultTitle} numberOfLines={1}>{result.label}</Text>
                          {result.subtitle && <Text style={styles.searchResultSubtitle} numberOfLines={1}>{result.subtitle}</Text>}
                        </View>
                      </Pressable>
                    ))
                  ) : searchQuery.trim().length >= 3 ? (
                    <Text style={styles.searchResultEmpty}>Lokasi tidak ditemukan</Text>
                  ) : null}
                  </View>
                )}
              </View>
            )}

            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={userLocation}
              onPress={handleMapPress}
              onRegionChangeComplete={(region) => { currentRegionRef.current = region; }}
              onPanDrag={handleMapPanDrag}
              onTouchStart={handleMapTouchStart}
              onTouchEnd={handleMapTouchEnd}
              onTouchCancel={handleMapTouchEnd}
              provider={PROVIDER_GOOGLE}
              mapType={baseMapType}
              onMapReady={() => setMapIsReady(true)}
              loadingEnabled
              loadingBackgroundColor="#E8F3E8"
              loadingIndicatorColor="#166534"
              showsUserLocation
              showsMyLocationButton={false}
              showsCompass={false}
              showsScale={false}
              scrollEnabled={true}
              zoomEnabled={true}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              {drawingMode && previewPath.length > 0 && (
                <>
                  {activePath.length >= 3 && (
                    <Polygon
                      coordinates={previewPath.map((coord) => ({ ...coord }))}
                      fillColor="rgba(255, 138, 101, 0.25)"
                      strokeColor="rgba(255, 87, 34, 0.8)"
                      strokeWidth={2}
                    />
                  )}
                  {activePath.length > 1 && (
                    <Polyline
                      coordinates={previewPath.map((coord) => ({ ...coord }))}
                      strokeColor="#FF5722"
                      strokeWidth={6}
                      lineCap="round"
                      geodesic={activePath.length >= 3}
                    />
                  )}
                </>
              )}

              {!drawingMode && pendingPolygon.length > 2 && (
                <Polygon coordinates={pendingPolygon} fillColor="rgba(255, 138, 101, 0.25)" strokeColor="#FF7043" strokeWidth={3} />
              )}

              {searchMarker && <Marker coordinate={searchMarker} pinColor="#166534" />}

              {savedLahan.map((item) => {
                if (!item.coordinates || item.coordinates.length < 3) return null;
                const labelIndex = Math.floor(item.coordinates.length / 2);
                const labelCoordinate = item.coordinates[labelIndex] ?? item.coordinates[0];
                const paletteColor = getLahanColor(item.id);
                const strokeColor = paletteColor.stroke;
                const fillColor = paletteColor.fill;
                return (
                  <React.Fragment key={`saved-${item.id}`}>
                    <Polygon
                      coordinates={item.coordinates}
                      fillColor={fillColor}
                      strokeColor={strokeColor}
                      strokeWidth={focusedLahanId === item.id ? 6 : 3}
                      tappable={false}
                      zIndex={focusedLahanId === item.id ? 4 : 1}
                    />
                    {labelCoordinate && (
                      <Marker coordinate={labelCoordinate} anchor={{ x: 0.5, y: 0.5 }} tappable={false}>
                        <View
                          style={[
                            styles.savedLahanLabel,
                            { backgroundColor: strokeColor },
                            focusedLahanId === item.id && styles.savedLahanLabelFocused,
                          ]}
                        >
                          <Text style={styles.savedLahanLabelText}>{item.name}</Text>
                          {typeof item.areaHa === "number" && Number.isFinite(item.areaHa) && (
                            <Text style={styles.savedLahanLabelSubtext}>{item.areaHa.toFixed(2)} ha</Text>
                          )}
                        </View>
                      </Marker>
                    )}
                  </React.Fragment>
                );
              })}

              {drawingMode && currentVertices.map((vertex, index) => (
                <Marker
                  key={vertex.id}
                  coordinate={{ ...vertex.coordinate }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  zIndex={10 + index}
                >
                  <View style={[
                    styles.drawingVertex,
                    index === 0 && styles.startVertex,
                    index === currentVertices.length - 1 && styles.currentVertex,
                  ]} />
                </Marker>
              ))}
            </MapView>

            {drawingMode && (
              <DrawingModeIndicator
                onCancel={cancelDrawing}
                pointsCount={currentVertices.length}
              />
            )}

            <View style={[styles.mapControls, drawingMode && styles.mapControlsDrawing]}>
              <Pressable
                style={({ pressed }) => [styles.zoomButton, pressed && { opacity: 0.2 }]}
                onPress={switchBaseMap}
                accessibilityRole="button"
                accessibilityLabel={`Gunakan peta ${baseMapType === "satellite" ? "standar" : "satelit"}`}
              >
                <Ionicons name="layers-outline" size={18} color="#0A3D1F" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.zoomButton, pressed && { opacity: 0.2 }]}
                onPress={() => handleZoom("in")}
                accessibilityRole="button"
                accessibilityLabel="Perbesar peta"
              >
                <Ionicons name="add" size={20} color="#0A3D1F" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.zoomButton, pressed && { opacity: 0.2 }]}
                onPress={() => handleZoom("out")}
                accessibilityRole="button"
                accessibilityLabel="Perkecil peta"
              >
                <Ionicons name="remove" size={20} color="#0A3D1F" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.locationButton, pressed && { opacity: 0.2 }]}
                onPress={handleRecenter}
                accessibilityRole="button"
                accessibilityLabel="Kembali ke lokasiku"
              >
                <Ionicons name="locate" size={18} color="#0A3D1F" />
              </Pressable>
            </View>

            {drawingMode && (
              <View style={styles.drawingControlsOverlay}>
                <Pressable
                  style={({ pressed }) => [
                    styles.controlButton,
                    styles.controlButtonNeutral,
                    activePath.length === 0 && styles.controlButtonDisabled,
                    pressed && activePath.length > 0 && { opacity: 0.2 },
                  ]}
                  onPress={undoLastPoint}
                  disabled={activePath.length === 0}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: activePath.length === 0 }}
                  accessibilityLabel="Undo titik terakhir"
                >
                  <Ionicons name="arrow-undo-outline" size={20} color={activePath.length === 0 ? "#90A4AE" : "#1C313A"} />
                  <Text style={[styles.controlButtonText, activePath.length === 0 && styles.controlButtonTextDisabled]}>Undo</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.controlButton,
                    styles.controlButtonNeutral,
                    redoVertices.length === 0 && styles.controlButtonDisabled,
                    pressed && redoVertices.length > 0 && { opacity: 0.2 },
                  ]}
                  onPress={redoLastPoint}
                  disabled={redoVertices.length === 0}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: redoVertices.length === 0 }}
                  accessibilityLabel="Redo titik terakhir"
                >
                  <Ionicons name="arrow-redo-outline" size={20} color={redoVertices.length === 0 ? "#90A4AE" : "#1C313A"} />
                  <Text style={[styles.controlButtonText, redoVertices.length === 0 && styles.controlButtonTextDisabled]}>Redo</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.controlButton, styles.controlButtonDanger, pressed && { opacity: 0.2 }]}
                  onPress={cancelDrawing}
                  accessibilityRole="button"
                  accessibilityLabel="Batalkan gambar"
                >
                  <Ionicons name="close-outline" size={24} color="#B71C1C" />
                  <Text style={[styles.controlButtonText, styles.controlButtonTextDanger]}>Batal</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.controlButton,
                    styles.controlButtonPrimary,
                    activePath.length < 3 && styles.controlButtonPrimaryDisabled,
                    activePath.length < 3 && styles.controlButtonDisabled,
                    pressed && activePath.length >= 3 && { opacity: 0.2 },
                  ]}
                  onPress={finishDrawing}
                  disabled={activePath.length < 3}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: activePath.length < 3 }}
                  accessibilityLabel="Simpan polygon"
                >
                  <Ionicons name="checkmark-outline" size={22} color={activePath.length < 3 ? "#BBF7D0" : "#FFFFFF"} />
                  <Text style={[styles.controlButtonText, styles.controlButtonTextPrimary, activePath.length < 3 && styles.controlButtonTextPrimaryDisabled]}>Simpan</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* ── DRAWING INSTRUCTION BANNER ── */}
          {drawingMode && (
            <View style={styles.instructionBanner}>
              <Ionicons name="pencil" size={16} color="#166534" style={{ marginRight: 6 }} />
              <View>
                <Text style={styles.instructionText}>Tap pada peta untuk menandai titik lahan.</Text>
                {currentVertices.length >= 3 && (
                  <Text style={styles.instructionSubtext}>Tekan Simpan untuk menutup polygon</Text>
                )}
              </View>
            </View>
          )}

          {/* ── HELPER ROW ── */}
          <View style={styles.drawingHelperRow}>
            <Pressable
              style={({ pressed }) => [styles.drawingInfoButton, pressed && { opacity: 0.2 }]}
              onPress={() => Alert.alert(
                "Cara Penggambaran Lahan",
                "1. Tekan tombol Gambar Lahan Baru.\n2. Tandai minimal tiga titik pada peta sesuai batas lahan.\n3. Tekan Simpan setelah polygon tertutup untuk menyimpan lahan.",
                [{ text: "Mengerti" }]
              )}
              accessibilityRole="button"
              accessibilityLabel="Informasi cara penggambaran lahan"
            >
              <Ionicons name="information-circle-outline" size={15} color="#166534" style={styles.drawingInfoButtonIcon} />
              <Text style={styles.drawingInfoText}>Cara penggambaran lahan</Text>
            </Pressable>
          </View>

          {/* ── NEW FIELD CTA ── */}
          <Pressable
            style={({ pressed }) => [
              styles.newFieldButton,
              drawingMode && styles.disabledButton,
              pressed && !drawingMode && { opacity: 0.85 },
            ]}
            onPress={startDrawing}
            disabled={drawingMode}
            accessibilityRole="button"
            accessibilityState={{ disabled: drawingMode }}
          >
            {drawingMode ? (
              <View style={styles.newFieldButtonInner}>
                <Ionicons name="pencil" size={20} color="#9CA3AF" />
                <Text style={[styles.newFieldText, styles.disabledButtonText]}>Mode Gambar Aktif</Text>
              </View>
            ) : (
              <LinearGradient
                colors={["#0E5229", "#166534", "#15803D"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newFieldButtonGradient}
              >
                <View style={styles.newFieldButtonIcon}>
                  <Ionicons name="add" size={18} color="#0E5229" />
                </View>
                <Text style={styles.newFieldText}>Gambar Lahan Baru</Text>
                <Ionicons name="arrow-forward" size={16} color="#86EFAC" style={{ marginLeft: "auto" }} />
              </LinearGradient>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.importFieldButton,
              (drawingMode || isImportingGeoJson) && styles.importFieldButtonDisabled,
              pressed && !drawingMode && !isImportingGeoJson && { opacity: 0.72 },
            ]}
            onPress={importGeoJson}
            disabled={drawingMode || isImportingGeoJson}
            accessibilityRole="button"
            accessibilityLabel="Impor batas lahan dari GeoJSON"
            accessibilityHint="Membuka pemilih file untuk satu polygon WGS84"
            accessibilityState={{ disabled: drawingMode || isImportingGeoJson, busy: isImportingGeoJson }}
          >
            <View style={styles.importFieldIcon}>
              {isImportingGeoJson ? (
                <ActivityIndicator size="small" color="#166534" />
              ) : (
                <Ionicons name="document-attach-outline" size={20} color="#166534" />
              )}
            </View>
            <View style={styles.importFieldCopy}>
              <Text style={styles.importFieldTitle}>
                {isImportingGeoJson ? "Membaca GeoJSON..." : "Impor GeoJSON"}
              </Text>
              <Text style={styles.importFieldSubtitle}>Satu Polygon | WGS84 (EPSG:4326) | maks. 1 MB</Text>
            </View>
            {!isImportingGeoJson && <Ionicons name="chevron-forward" size={18} color="#4B7C5D" />}
          </Pressable>

          {/* ── LAHAN SAYA ── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.lahanHeaderLeft}>
                <Text style={styles.sectionTitle}>Lahan Saya</Text>
                {savedLahan.length > 0 && (
                  <View style={styles.lahanCountChip}>
                    <Text style={styles.lahanCountChipText}>{savedLahan.length} lahan terdaftar</Text>
                  </View>
                )}
              </View>
              {savedLahan.length > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.editToggleButton, pressed && { opacity: 0.2 }]}
                  onPress={() => setShowLahanActions(!showLahanActions)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showLahanActions }}
                >
                  <Ionicons name={showLahanActions ? "close" : "create-outline"} size={16} color="#166534" />
                  <Text style={styles.editToggleButtonText}>{showLahanActions ? "Selesai" : "Kelola"}</Text>
                </Pressable>
              )}
            </View>

            {hasLahanPagination && (
              <View style={styles.paginationContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.paginationButton,
                    isPrevLahanDisabled && styles.paginationButtonDisabled,
                    pressed && !isPrevLahanDisabled && { opacity: 0.2 },
                  ]}
                  onPress={handlePrevLahanPage}
                  disabled={isPrevLahanDisabled}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isPrevLahanDisabled }}
                >
                  <Ionicons name="chevron-back" size={14} color={isPrevLahanDisabled ? "#9CA3AF" : "#FFFFFF"} />
                  <Text style={[styles.paginationButtonText, isPrevLahanDisabled && styles.paginationButtonTextDisabled]}>Sebelumnya</Text>
                </Pressable>
                <Text style={styles.paginationLabel}>{lahanPageDisplay} / {totalLahanPages}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.paginationButton,
                    isNextLahanDisabled && styles.paginationButtonDisabled,
                    pressed && !isNextLahanDisabled && { opacity: 0.2 },
                  ]}
                  onPress={handleNextLahanPage}
                  disabled={isNextLahanDisabled}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isNextLahanDisabled }}
                >
                  <Text style={[styles.paginationButtonText, isNextLahanDisabled && styles.paginationButtonTextDisabled]}>Berikutnya</Text>
                  <Ionicons name="chevron-forward" size={14} color={isNextLahanDisabled ? "#9CA3AF" : "#FFFFFF"} />
                </Pressable>
              </View>
            )}

            {savedLahan.length === 0 ? (
              <View style={styles.emptyLahanState}>
                <View style={styles.emptyLahanIcon}>
                  <Ionicons name="map-outline" size={32} color="#166534" />
                </View>
                <Text style={styles.emptyLahanTitle}>Belum Ada Lahan</Text>
                <Text style={styles.sectionEmptyText}>Gunakan tombol “Gambar Lahan Baru” di atas untuk mulai menandai lahan Anda.</Text>
              </View>
            ) : (
              <>
                {paginatedLahanCards.map((card) => (
                  <View
                    key={`lahan-card-${card.id}`}
                    style={styles.lahanCard}
                  >
                    <Pressable
                      style={({ pressed }) => [styles.lahanCardMain, pressed && styles.lahanCardPressed]}
                      onPress={() =>
                        router.push({
                          pathname: "/detail-lahan-page",
                          params: { id: card.id },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Buka detail ${card.name}`}
                    >
                    <View style={styles.lahanCardRow}>
                      {/* Thumbnail */}
                      <View style={styles.lahanCardThumbnail}>
                        <ExpoImage
                          source={resolveLahanThumbnailSource(card)}
                          style={[StyleSheet.absoluteFill, styles.lahanCardThumbnailImage]}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(0,0,0,0.65)"]}
                          start={{ x: 0, y: 0.4 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.lahanCardThumbnailOverlay}
                        >
                          <View style={[styles.lahanCardBadgeOverlay, { backgroundColor: "#075985" }]}>
                            <Text style={styles.lahanCardBadgeOverlayText}>Deret waktu</Text>
                          </View>
                        </LinearGradient>
                      </View>

                      {/* Content */}
                      <View style={styles.lahanCardContent}>
                        <View style={styles.lahanCardHeader}>
                          <Text style={styles.lahanCardTitle} numberOfLines={1}>{card.name}</Text>
                          <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                        </View>

                        <View style={styles.lahanCardInfoRow}>
                          <View style={styles.lahanCardInfoItem}>
                            <Ionicons name="resize-outline" size={12} color="#166534" />
                            <Text style={styles.lahanCardInfoText}>{formatHa(card.areaHa)}</Text>
                          </View>
                          <View style={styles.lahanCardInfoItem}>
                            <Ionicons name="leaf-outline" size={12} color="#166534" />
                            <Text style={styles.lahanCardInfoText}>
                              {card.category === "padi" ? "Padi" : "Scope lama"}
                            </Text>
                          </View>
                          <View style={styles.lahanCardInfoItem}>
                            <Ionicons name="location-outline" size={12} color="#166534" />
                            <Text style={styles.lahanCardInfoText}>{card.coordinateCount} titik</Text>
                          </View>
                        </View>

                        {card.latestHealth?.ndvi_score !== undefined && card.latestHealth?.ndvi_score !== null ? (
                          <View style={[styles.lahanCardNdviContainer, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                            <View style={styles.lahanCardNdviHeader}>
                              <View style={[styles.lahanCardNdviDot, { backgroundColor: "#0284C7" }]} />
                              <Text style={[styles.lahanCardNdviLabel, { color: "#075985" }]}>
                                Rekaman terbaru · {NDVI_DATA_STATE_META[getNdviDataState(card.latestHealth)].label}
                              </Text>
                              {getNdviDataState(card.latestHealth) === "measured" && card.latestHealth?.captured_at && (
                                <Text style={[styles.lahanCardNdviDate, { color: "#075985" }]}>
                                  · {formatDisplayDate(card.latestHealth.captured_at)}
                                </Text>
                              )}
                            </View>
                            <View style={styles.lahanCardNdviValueRow}>
                              <Text style={[styles.lahanCardNdviValue, { color: "#075985" }]}>
                                NDVI {formatNdviValue(card.latestHealth.ndvi_score)}
                              </Text>
                              {typeof card.latestHealth?.ndmi_score === "number" && Number.isFinite(card.latestHealth.ndmi_score) && (
                                <View style={styles.lahanCardNdmiChip}>
                                  <Ionicons name="water-outline" size={11} color="#0369A1" />
                                  <Text style={[styles.lahanCardNdmiText, { color: "#0369A1" }]}>
                                    NDMI {formatNdviValue(card.latestHealth.ndmi_score)}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.lahanCardNdviState}>
                              {NDVI_DATA_STATE_META[getNdviDataState(card.latestHealth)].description}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.lahanCardNdviEmptyContainer}>
                            <Ionicons name="cloud-offline-outline" size={16} color="#9CA3AF" />
                            <Text style={styles.lahanCardNdviEmptyText}>Observasi belum tersedia</Text>
                          </View>
                        )}

                        {card.locationLabel && (
                          <View style={styles.lahanCardLocationRow}>
                            <Ionicons name="pin-outline" size={11} color="#9CA3AF" />
                            <Text style={styles.lahanCardLocationText} numberOfLines={1}>{card.locationLabel}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    </Pressable>

                    <View style={styles.lahanCardActions}>
                      <Pressable
                        style={({ pressed }) => [styles.lahanActionButton, pressed && { opacity: 0.2 }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          openGeoJsonPreview(card.name, card.coordinates);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Ekspor GeoJSON ${card.name}`}
                      >
                        <Ionicons name="code-download-outline" size={16} color="#166534" />
                        <Text style={styles.lahanActionButtonText}>GeoJSON</Text>
                      </Pressable>
                      {showLahanActions && (
                        <>
                        <Pressable
                          style={({ pressed }) => [styles.lahanActionButton, pressed && { opacity: 0.2 }]}
                          onPress={(e) => { e.stopPropagation(); handleEditLahan(card); }}
                          accessibilityRole="button"
                        >
                          <Ionicons name="create-outline" size={16} color="#166534" />
                          <Text style={styles.lahanActionButtonText}>Edit Nama</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.lahanActionButton,
                            styles.lahanActionButtonDelete,
                            pressed && { opacity: 0.2 },
                          ]}
                          onPress={(e) => { e.stopPropagation(); handleDeleteLahan(card.id); }}
                          accessibilityRole="button"
                        >
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                          <Text style={[styles.lahanActionButtonText, styles.lahanActionButtonDeleteText]}>Hapus</Text>
                        </Pressable>
                        </>
                      )}
                      <View style={styles.lahanCardActionSpacer} />
                      <Pressable
                        style={({ pressed }) => [styles.lahanDetailButton, pressed && { opacity: 0.72 }]}
                        onPress={() =>
                          router.push({
                            pathname: "/detail-lahan-page",
                            params: { id: card.id },
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Lihat detail ${card.name}`}
                      >
                        <Text style={styles.lahanDetailButtonText}>Lihat detail</Text>
                        <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* ── MATANI AI SUMMARY ── */}
          <View style={styles.aiSectionOuter}>
            <LinearGradient
              colors={["#030D07", "#061A0E", "#0A2B15"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiSection}
            >
              {/* AI Header */}
              <View style={styles.aiSectionHeader}>
                <View style={styles.aiHeaderLeft}>
                  <LinearGradient
                    colors={["#166534", "#15803D", "#16A34A"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiIconGradient}
                  >
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.aiHeaderCopy}>
                    <View style={styles.aiHeaderBadge}>
                      <Text style={styles.aiHeaderBadgeText}>MATANI AI</Text>
                    </View>
                    <Text style={styles.aiHeaderHeadline}>
                      Ringkasan opsional dari input demo
                    </Text>
                  </View>
                </View>
                <View style={styles.aiHeaderActions}>
                  {lahanSummaryText ? (
                    <>
                      <Pressable
                        style={({ pressed }) => [styles.aiToggleButton, pressed && { opacity: 0.2 }]}
                        onPress={() => setIsLahanSummaryCollapsed((prev) => !prev)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: !isLahanSummaryCollapsed }}
                        accessibilityLabel={isLahanSummaryCollapsed ? "Tampilkan ringkasan" : "Sembunyikan ringkasan"}
                      >
                        <Ionicons name={isLahanSummaryCollapsed ? "chevron-down" : "chevron-up"} size={16} color="#86EFAC" />
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.aiRefreshButton,
                          (isLahanSummaryLoading || savedLahan.length === 0) && styles.aiRefreshButtonDisabled,
                          pressed && !isLahanSummaryLoading && savedLahan.length > 0 && { opacity: 0.2 },
                        ]}
                        disabled={isLahanSummaryLoading || savedLahan.length === 0}
                        onPress={handleRefreshSummary}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isLahanSummaryLoading || savedLahan.length === 0 }}
                        accessibilityLabel="Perbarui ringkasan observasi"
                      >
                        {isLahanSummaryLoading ? (
                          <ActivityIndicator size="small" color="#86EFAC" />
                        ) : (
                          <>
                            <Ionicons name="refresh" size={14} color="#86EFAC" />
                            <Text style={styles.aiRefreshText}>Perbarui</Text>
                          </>
                        )}
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.aiAnalyzeButton,
                        (isLahanSummaryLoading || savedLahan.length === 0) && styles.aiRefreshButtonDisabled,
                        pressed && !isLahanSummaryLoading && savedLahan.length > 0 && { opacity: 0.2 },
                      ]}
                      disabled={isLahanSummaryLoading || savedLahan.length === 0}
                      onPress={handleRefreshSummary}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: isLahanSummaryLoading || savedLahan.length === 0 }}
                      accessibilityLabel="Ringkas observasi lahan"
                    >
                      {isLahanSummaryLoading ? (
                        <ActivityIndicator size="small" color="#0A2B15" />
                      ) : (
                        <>
                          <Ionicons name="analytics-outline" size={14} color="#0A2B15" />
                          <Text style={styles.aiAnalyzeText}>Ringkas Data</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Divider */}
              <View style={styles.aiDivider} />

              {/* AI Content */}
              {savedLahan.length === 0 ? (
                <View style={styles.aiEmptyState}>
                  <Ionicons name="leaf-outline" size={28} color="#166534" />
                  <Text style={styles.aiEmptyText}>Tambahkan lahan untuk membuat ringkasan demo opsional dari Matani AI.</Text>
                </View>
              ) : isLahanSummaryLoading ? (
                <View style={styles.aiLoadingRow}>
                  <View style={styles.aiLoadingDots}>
                    <ActivityIndicator size="small" color="#4ADE80" />
                  </View>
                  <Text style={styles.aiLoadingText}>Matani AI sedang merangkum input demo…</Text>
                </View>
              ) : lahanSummaryError ? (
                <View style={styles.aiErrorBox}>
                  <Ionicons name="warning-outline" size={20} color="#FCA5A5" />
                  <Text style={styles.aiErrorText}>{lahanSummaryError}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.aiRetryButton, pressed && { opacity: 0.2 }]}
                    onPress={handleRefreshSummary}
                    accessibilityRole="button"
                  >
                    <Text style={styles.aiRetryText}>Coba Lagi</Text>
                  </Pressable>
                </View>
              ) : lahanSummaryText ? (
                isLahanSummaryCollapsed ? (
                  <View style={styles.aiCollapsedState}>
                    <Ionicons name="eye-off-outline" size={16} color="#4B7C5D" />
                    <Text style={styles.aiCollapsedText}>Ringkasan disembunyikan. Ketuk panah untuk melihat.</Text>
                  </View>
                ) : (
                  <View style={styles.aiPrioritiesContainer}>
                    {lahanSummaryPriorities.length > 0 ? (
                      lahanSummaryPriorities.map((item, index) => {
                        const cfg = {
                          bg: "rgba(14,165,233,0.08)",
                          border: "rgba(14,165,233,0.24)",
                          icon: "information-circle" as const,
                          iconColor: "#7DD3FC",
                          badgeBg: "rgba(14,165,233,0.16)",
                          badgeText: "#BAE6FD",
                          label: `Catatan ${item.priorityNumber}`,
                        };

                        return (
                          <View key={item.id} style={[styles.aiPriorityCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                            <View style={styles.aiPriorityCardHeader}>
                              <Ionicons name={cfg.icon} size={18} color={cfg.iconColor} />
                              <View style={[styles.aiPriorityBadge, { backgroundColor: cfg.badgeBg }]}>
                                <Text style={[styles.aiPriorityBadgeText, { color: cfg.badgeText }]}>{cfg.label}</Text>
                              </View>
                            </View>
                            <Text style={styles.aiPriorityText}>{item.description}</Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.aiFallbackText}>{lahanSummaryText}</Text>
                    )}
                  </View>
                )
              ) : (
                <View style={styles.aiEmptyState}>
                  <Ionicons name="analytics-outline" size={28} color="#166534" />
                  <Text style={styles.aiEmptyText}>
                    Ringkasan AI bersifat opsional dan hanya merangkum nilai, tanggal,
                    serta status data. Matani tidak menghasilkan diagnosis.
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* ── CATATAN ── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.notesHeaderContent}>
                <LinearGradient colors={["#78350F", "#92400E"]} style={styles.notesIconWrapper}>
                  <Ionicons name="document-text" size={18} color="#FEF3C7" />
                </LinearGradient>
                <View>
                  <Text style={styles.sectionTitle}>Catatan Lapangan</Text>
                  {notesWithMetadata.length > 0 && (
                    <Text style={styles.notesSubheader}>{notesWithMetadata.length} catatan tersimpan</Text>
                  )}
                </View>
              </View>
              {notesLoading && <ActivityIndicator size="small" color="#D97706" />}
            </View>

            {notesLoading ? (
              <View style={styles.notesLoadingContainer}>
                <ActivityIndicator size="small" color="#D97706" />
                <Text style={styles.notesLoadingText}>Memuat catatan…</Text>
              </View>
            ) : notesWithMetadata.length === 0 ? (
              <View style={styles.notesEmptyState}>
                <Ionicons name="document-outline" size={40} color="#D97706" />
                <Text style={styles.notesEmptyTitle}>Belum Ada Catatan</Text>
                <Text style={styles.notesEmptyText}>Simpan temuan penting dari lapangan agar progress selalu tercatat.</Text>
              </View>
            ) : (
              <View style={styles.notesGrid}>
                {notesWithMetadata.slice(0, 6).map((note, index) => (
                  <View key={`note-${note.id}`} style={styles.noteCard}>
                    <View style={styles.noteCardMeta}>
                      <View style={styles.noteNumberBadge}>
                        <Text style={styles.noteNumberText}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.noteTimestamp}>
                          {formatDisplayDate(note.created_at)}
                        </Text>
                        {note.lahanName && (
                          <View style={styles.noteLahanBadge}>
                            <Ionicons name="location" size={10} color="#D97706" />
                            <Text style={styles.noteLahan}>{note.lahanName}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.noteCardFooterActions}>
                        <Pressable
                          style={({ pressed }) => [styles.noteActionButton, pressed && { opacity: 0.2 }]}
                          onPress={() => handleEditNote(note)}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit catatan ${note.title}`}
                        >
                          <Ionicons name="create-outline" size={15} color="#D97706" />
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [styles.noteActionButton, styles.noteDeleteButton, pressed && { opacity: 0.2 }]}
                          onPress={() => handleDeleteNote(note.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Hapus catatan ${note.title}`}
                        >
                          <Ionicons name="trash-outline" size={15} color="#DC2626" />
                        </Pressable>
                      </View>
                    </View>
                    <Text style={styles.noteTitle} numberOfLines={2}>{note.title}</Text>
                    <Text style={styles.noteContent} numberOfLines={3}>{note.content}</Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.newNoteButton, pressed && { opacity: 0.85 }]}
              onPress={handleOpenNoteModal}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={20} color="#D97706" />
              <Text style={styles.newNoteButtonText}>Tambah Catatan Baru</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* ── MODAL SIMPAN LAHAN ── */}
        <Modal
          visible={showSaveModal}
          transparent
          animationType="slide"
          onRequestClose={handleCancelSave}
        >
          <TouchableWithoutFeedback onPress={handleCancelSave}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>
                    {pendingPolygonSource === "geojson" ? "Tinjau GeoJSON" : "Simpan Lahan Baru"}
                  </Text>
                  {pendingPolygonSource === "geojson" && (
                    <View style={styles.importReviewBanner}>
                      <Ionicons name="checkmark-circle" size={20} color="#166534" />
                      <View style={styles.importReviewCopy}>
                        <Text style={styles.importReviewTitle}>Polygon siap disimpan</Text>
                        <Text style={styles.importReviewFile} numberOfLines={1}>
                          {importedFileName}
                        </Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.modalInfoRow}>
                    <View style={styles.modalInfoChip}>
                      <Ionicons name="resize-outline" size={13} color="#166534" />
                      <Text style={styles.modalInfoChipText}>{formattedPendingArea} ha</Text>
                    </View>
                    <View style={styles.modalInfoChip}>
                      <Ionicons name="location-outline" size={13} color="#166534" />
                      <Text style={styles.modalInfoChipText}>{pendingPolygon.length} titik</Text>
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.geoJsonPreviewButton, pressed && { opacity: 0.75 }]}
                    onPress={() => openGeoJsonPreview(
                      lahanName.trim() || "Lahan Matani",
                      pendingPolygon,
                      true,
                    )}
                    accessibilityRole="button"
                    accessibilityLabel="Pratinjau titik GeoJSON"
                  >
                    <Ionicons name="code-slash-outline" size={17} color="#166534" />
                    <View style={styles.geoJsonPreviewButtonCopy}>
                      <Text style={styles.geoJsonPreviewButtonTitle}>Pratinjau GeoJSON</Text>
                      <Text style={styles.geoJsonPreviewButtonSubtitle}>Periksa urutan longitude, latitude dan ring polygon</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#4B7C5D" />
                  </Pressable>

                  <Text style={styles.inputLabel}>Nama Lahan</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Contoh: Sawah Blok A"
                    placeholderTextColor="#9CA3AF"
                    value={lahanName}
                    onChangeText={setLahanName}
                    maxLength={80}
                    autoCapitalize="words"
                    returnKeyType="done"
                    accessibilityLabel="Nama lahan"
                  />

                  <Text style={styles.inputLabel}>Tanaman</Text>
                  <View style={styles.categoryPickerButton}>
                    <Ionicons name="leaf-outline" size={16} color="#166534" style={{ marginRight: 8 }} />
                    <Text style={styles.categoryPickerLabel}>
                      Padi
                    </Text>
                    <Ionicons name="lock-closed-outline" size={16} color="#166534" />
                  </View>

                  <View style={styles.exportAfterSaveRow}>
                    <View style={styles.exportAfterSaveCopy}>
                      <Text style={styles.exportAfterSaveTitle}>Ekspor setelah disimpan</Text>
                      <Text style={styles.exportAfterSaveSubtitle}>Buka menu simpan/bagikan untuk file .geojson</Text>
                    </View>
                    <Switch
                      value={exportAfterSave}
                      onValueChange={setExportAfterSave}
                      trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
                      thumbColor={exportAfterSave ? "#166534" : "#F9FAFB"}
                      accessibilityLabel="Ekspor GeoJSON setelah lahan disimpan"
                    />
                  </View>

                  <View style={styles.modalButtons}>
                    <Pressable
                      style={({ pressed }) => [styles.modalCancelButton, pressed && { opacity: 0.2 }]}
                      onPress={handleCancelSave}
                      accessibilityRole="button"
                    >
                      <Text style={styles.modalCancelText}>Batal</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalSaveButton,
                        isFieldSaveDisabled && styles.modalSaveButtonDisabled,
                        pressed && !isFieldSaveDisabled && { opacity: 0.2 },
                      ]}
                      onPress={saveLahan}
                      disabled={isFieldSaveDisabled}
                      accessibilityRole="button"
                      accessibilityLabel="Simpan lahan"
                      accessibilityState={{ disabled: isFieldSaveDisabled, busy: isSaving }}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.modalSaveText}>
                          {exportAfterSave ? "Simpan & Ekspor" : "Simpan Lahan"}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* ── MODAL CATATAN BARU ── */}
        <Modal
          visible={geoJsonPreview !== null}
          transparent
          animationType="slide"
          onRequestClose={closeGeoJsonPreview}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.geoJsonModalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.geoJsonModalHeader}>
                <View style={styles.geoJsonModalIcon}>
                  <Ionicons name="code-slash-outline" size={20} color="#166534" />
                </View>
                <View style={styles.geoJsonModalHeaderCopy}>
                  <Text style={styles.modalTitle}>Pratinjau GeoJSON</Text>
                  <Text style={styles.geoJsonModalFileName} numberOfLines={1}>
                    {geoJsonPreview?.fileName}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.geoJsonCloseButton, pressed && { opacity: 0.6 }]}
                  onPress={closeGeoJsonPreview}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup pratinjau GeoJSON"
                >
                  <Ionicons name="close" size={21} color="#374151" />
                </Pressable>
              </View>
              <View style={styles.geoJsonFormatBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#166534" />
                <Text style={styles.geoJsonFormatText}>
                  WGS84 · satu Polygon · siap diimpor ke Copernicus Browser
                </Text>
              </View>
              <ScrollView
                style={styles.geoJsonCodeScroll}
                contentContainerStyle={styles.geoJsonCodeContent}
                nestedScrollEnabled
              >
                <Text style={styles.geoJsonCodeText} selectable>
                  {geoJsonPreview?.text}
                </Text>
              </ScrollView>
              <Text style={styles.geoJsonCoordinateHint}>
                Setiap titik ditulis sebagai [longitude, latitude]. Titik pertama diulang di akhir untuk menutup ring.
              </Text>
              <View style={styles.geoJsonModalActions}>
                <Pressable
                  style={({ pressed }) => [styles.geoJsonCopyButton, pressed && { opacity: 0.75 }]}
                  onPress={() => geoJsonPreview && copyGeoJson(geoJsonPreview)}
                  accessibilityRole="button"
                >
                  <Ionicons name="copy-outline" size={17} color="#166534" />
                  <Text style={styles.geoJsonCopyButtonText}>Salin</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.geoJsonExportButton, pressed && { opacity: 0.85 }]}
                  onPress={() => geoJsonPreview && shareGeoJson(geoJsonPreview)}
                  accessibilityRole="button"
                >
                  <Ionicons name="share-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.geoJsonExportButtonText}>Ekspor file</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showNoteModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.noteModalContent}>
              <View style={styles.noteModalHeader}>
                <LinearGradient colors={["#78350F", "#92400E"]} style={styles.noteModalHeaderIcon}>
                  <Ionicons name="document-text" size={20} color="#FEF3C7" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Catatan Baru</Text>
                  <Text style={styles.modalSubtitle}>Catat hal penting dari lapangan</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Lahan (Opsional)</Text>
              <Pressable
                style={({ pressed }) => [styles.notePickerButton, pressed && { opacity: 0.2 }]}
                onPress={() => setIsLahanPickerVisible((prev) => !prev)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isLahanPickerVisible }}
              >
                <Ionicons name="location-outline" size={15} color="#D97706" style={{ marginRight: 8 }} />
                <Text style={[styles.notePickerLabel, !selectedNoteLahanName && { color: "#9CA3AF" }]}>
                  {selectedNoteLahanName ?? "Pilih lahan (opsional)"}
                </Text>
                <Ionicons name={isLahanPickerVisible ? "chevron-up" : "chevron-down"} size={16} color="#D97706" />
              </Pressable>
              {isLahanPickerVisible && (
                <View style={styles.notePickerDropdown}>
                  <ScrollView style={styles.notePickerList} keyboardShouldPersistTaps="handled">
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
                        key={`picker-${item.id}`}
                        style={({ pressed }) => [styles.notePickerOption, pressed && { opacity: 0.2 }]}
                        onPress={() => handleSelectNoteLahan(item.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selectedNoteLahanId === item.id }}
                      >
                        <Text style={styles.notePickerOptionText}>{item.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Judul</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: Pemupukan hari ke-3"
                placeholderTextColor="#9CA3AF"
                value={noteTitle}
                onChangeText={setNoteTitle}
              />

              <Text style={styles.inputLabel}>Isi Catatan</Text>
              <TextInput
                style={[styles.textInput, styles.noteInput]}
                placeholder="Tulis detail catatan Anda di sini..."
                placeholderTextColor="#9CA3AF"
                value={noteContent}
                onChangeText={setNoteContent}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.modalButtons}>
                <Pressable
                  style={({ pressed }) => [styles.modalCancelButton, pressed && !isSavingNote && { opacity: 0.2 }]}
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
                    (!isNoteFormValid || isSavingNote) && styles.modalSaveButtonDisabled,
                    pressed && isNoteFormValid && !isSavingNote && { opacity: 0.2 },
                  ]}
                  onPress={handleSaveNote}
                  disabled={!isNoteFormValid || isSavingNote}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !isNoteFormValid || isSavingNote }}
                >
                  {isSavingNote ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalSaveText}>Simpan</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── MODAL EDIT LAHAN ── */}
        <Modal visible={showEditLahanModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.noteModalContent}>
              <Text style={styles.modalTitle}>Edit Nama Lahan</Text>
              <Text style={styles.modalSubtitle}>Ubah nama lahan sesuai kebutuhan Anda.</Text>
              <Text style={styles.inputLabel}>Nama Lahan</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Nama lahan"
                placeholderTextColor="#9CA3AF"
                value={editLahanName}
                onChangeText={setEditLahanName}
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={({ pressed }) => [styles.modalCancelButton, pressed && { opacity: 0.2 }]}
                  onPress={() => { setShowEditLahanModal(false); setEditingLahanId(null); setEditLahanName(""); }}
                  accessibilityRole="button"
                >
                  <Text style={styles.modalCancelText}>Batal</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalSaveButton,
                    !editLahanName.trim() && styles.modalSaveButtonDisabled,
                    pressed && !!editLahanName.trim() && { opacity: 0.2 },
                  ]}
                  onPress={handleSaveEditLahan}
                  disabled={!editLahanName.trim()}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !editLahanName.trim() }}
                >
                  <Text style={styles.modalSaveText}>Simpan</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── MODAL EDIT CATATAN ── */}
        <Modal visible={showEditNoteModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.noteModalContent}>
              <View style={styles.noteModalHeader}>
                <LinearGradient colors={["#78350F", "#92400E"]} style={styles.noteModalHeaderIcon}>
                  <Ionicons name="create" size={20} color="#FEF3C7" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Edit Catatan</Text>
                  <Text style={styles.modalSubtitle}>Perbarui catatan Anda</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Lahan (Opsional)</Text>
              <Pressable
                style={({ pressed }) => [styles.notePickerButton, pressed && { opacity: 0.2 }]}
                onPress={() => setIsLahanPickerVisible((prev) => !prev)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isLahanPickerVisible }}
              >
                <Ionicons name="location-outline" size={15} color="#D97706" style={{ marginRight: 8 }} />
                <Text style={[styles.notePickerLabel, !selectedNoteLahanName && { color: "#9CA3AF" }]}>
                  {selectedNoteLahanName ?? "Pilih lahan (opsional)"}
                </Text>
                <Ionicons name={isLahanPickerVisible ? "chevron-up" : "chevron-down"} size={16} color="#D97706" />
              </Pressable>
              {isLahanPickerVisible && (
                <View style={styles.notePickerDropdown}>
                  <ScrollView style={styles.notePickerList} keyboardShouldPersistTaps="handled">
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
                        key={`picker-${item.id}`}
                        style={({ pressed }) => [styles.notePickerOption, pressed && { opacity: 0.2 }]}
                        onPress={() => handleSelectNoteLahan(item.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selectedNoteLahanId === item.id }}
                      >
                        <Text style={styles.notePickerOptionText}>{item.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Judul</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: Pemupukan hari ke-3"
                placeholderTextColor="#9CA3AF"
                value={noteTitle}
                onChangeText={setNoteTitle}
              />

              <Text style={styles.inputLabel}>Isi Catatan</Text>
              <TextInput
                style={[styles.textInput, styles.noteInput]}
                placeholder="Tulis detail catatan Anda di sini..."
                placeholderTextColor="#9CA3AF"
                value={noteContent}
                onChangeText={setNoteContent}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.modalButtons}>
                <Pressable
                  style={({ pressed }) => [styles.modalCancelButton, pressed && !isSavingNote && { opacity: 0.2 }]}
                  onPress={() => { setShowEditNoteModal(false); setEditingNoteId(null); resetNoteForm(); }}
                  disabled={isSavingNote}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isSavingNote }}
                >
                  <Text style={styles.modalCancelText}>Batal</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalSaveButton,
                    (!isNoteFormValid || isSavingNote) && styles.modalSaveButtonDisabled,
                    pressed && isNoteFormValid && !isSavingNote && { opacity: 0.2 },
                  ]}
                  onPress={handleSaveNote}
                  disabled={!isNoteFormValid || isSavingNote}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !isNoteFormValid || isSavingNote }}
                >
                  {isSavingNote ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalSaveText}>Simpan</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F4F1",
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContent: {
    paddingBottom: 48,
  },

  // ── HEADER ──
  header: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 28,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerBrandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
    marginRight: 6,
  },
  headerBrandText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#86EFAC",
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerLocationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    maxWidth: width - 48,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#BBF7D0",
    fontWeight: "500",
    flexShrink: 1,
  },

  // ── MAP ──
  mapContainer: {
    height: COLLAPSED_MAP_HEIGHT,
    minHeight: COLLAPSED_MAP_HEIGHT,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1A2E1E",
    shadowColor: "#0A3D1F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  mapContainerDrawing: {
    height: FULL_MAP_HEIGHT,
    minHeight: FULL_MAP_HEIGHT,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 12,
    borderRadius: 0,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  searchContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  searchSpinner: { marginLeft: 8 },
  clearSearchButton: { marginLeft: 4, padding: 2 },
  searchResultsContainer: {
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    maxHeight: 220,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  searchLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  searchLoadingText: { fontSize: 13, color: "#6B7280" },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  searchResultTitle: { fontSize: 13, fontWeight: "600", color: "#111827" },
  searchResultSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  searchResultEmpty: { paddingHorizontal: 16, paddingVertical: 14, textAlign: "center", color: "#9CA3AF", fontSize: 13 },

  // Map Controls
  mapControls: {
    position: "absolute",
    top: 128,
    right: 16,
    gap: 8,
  },
  mapControlsDrawing: { top: 168 },
  zoomButton: {
    width: 38,
    height: 38,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 6,
  },
  locationButton: {
    width: 38,
    height: 38,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  // Drawing controls
  drawingControlsOverlay: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 30,
    gap: 6,
  },
  controlButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 4,
  },
  controlButtonNeutral: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  controlButtonDanger: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  controlButtonPrimary: { backgroundColor: "#166534", borderColor: "#166534" },
  controlButtonPrimaryDisabled: { backgroundColor: "#BBF7D0", borderColor: "#86EFAC" },
  controlButtonDisabled: { opacity: 0.5 },
  controlButtonText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  controlButtonTextDanger: { color: "#DC2626" },
  controlButtonTextPrimary: { color: "#FFFFFF" },
  controlButtonTextDisabled: { color: "#9CA3AF" },
  controlButtonTextPrimaryDisabled: { color: "#DCFCE7" },

  // Map overlays
  savedLahanLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  savedLahanLabelFocused: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.08 }],
  },
  savedLahanLabelText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  savedLahanLabelSubtext: { color: "rgba(255,255,255,0.8)", fontSize: 10 },
  drawingVertex: {
    width: 12,
    height: 12,
    backgroundColor: "#FF5722",
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "white",
  },
  startVertex: {
    backgroundColor: "#22C55E",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  currentVertex: {
    backgroundColor: "#FCD34D",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#FF5722",
  },

  // ── FILTERS ──
  filterScroll: { paddingLeft: 16, marginTop: 12 },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    paddingVertical: 4,
    gap: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: "hidden",
  },
  filterButtonLast: {},
  activeFilterButton: {
    borderColor: "#166534",
    overflow: "hidden",
  },
  filterButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0,
  },
  filterText: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  activeFilterText: { fontSize: 13, color: "#FFFFFF", fontWeight: "700" },

  // ── INSTRUCTION ──
  instructionBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#DCFCE7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
    gap: 8,
  },
  instructionText: { color: "#166534", fontSize: 14, fontWeight: "600" },
  instructionSubtext: { color: "#166534", fontSize: 12, marginTop: 2, opacity: 0.8 },

  // ── DRAWING HELPER ──
  drawingHelperRow: { paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
  drawingInfoButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 6,
  },
  drawingInfoButtonIcon: {},
  drawingInfoText: { fontSize: 12, fontWeight: "600", color: "#166534" },

  // ── NEW FIELD BUTTON ──
  newFieldButton: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: "#F3F4F6",
    shadowOpacity: 0,
    elevation: 0,
  },
  newFieldButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  newFieldButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  newFieldButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#86EFAC",
    alignItems: "center",
    justifyContent: "center",
  },
  newFieldText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  disabledButtonText: { color: "#9CA3AF" },
  importFieldButton: {
    minHeight: 64,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#A7D7B7",
    backgroundColor: "#F4FBF6",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  importFieldButtonDisabled: { opacity: 0.5 },
  importFieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  importFieldCopy: { flex: 1 },
  importFieldTitle: { fontSize: 14, fontWeight: "800", color: "#0A3D1F" },
  importFieldSubtitle: { marginTop: 3, fontSize: 11, lineHeight: 15, color: "#4B7C5D" },

  // ── SECTIONS ──
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0A3D1F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  lahanHeaderLeft: { flex: 1 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0D1B12",
    letterSpacing: -0.3,
  },
  sectionEmptyText: { fontSize: 14, color: "#9CA3AF", lineHeight: 20 },

  lahanCountChip: {
    alignSelf: "flex-start",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  lahanCountChipText: { fontSize: 11, fontWeight: "600", color: "#166534" },

  emptyLahanState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyLahanIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyLahanTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
  },

  // ── LAHAN CARDS ──
  lahanCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DDE7DF",
    shadowColor: "#0A3D1F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
    overflow: "hidden",
  },
  lahanCardMain: { backgroundColor: "#FFFFFF" },
  lahanCardPressed: { backgroundColor: "#F7FBF8" },
  lahanCardRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  lahanCardThumbnail: {
    width: 104,
    alignSelf: "stretch",
    minHeight: 184,
  },
  lahanCardThumbnailImage: { borderRadius: 0 },
  lahanCardThumbnailOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "stretch",
    padding: 8,
  },
  lahanCardBadgeOverlay: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  lahanCardBadgeOverlayText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  lahanCardContent: {
    flex: 1,
    padding: 13,
  },
  lahanCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  lahanCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#0D1B12",
    letterSpacing: -0.3,
    marginRight: 4,
  },
  lahanCardInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 9,
  },
  lahanCardInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  lahanCardInfoText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
  },
  lahanCardNdviContainer: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    marginBottom: 8,
  },
  lahanCardNdviHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  lahanCardNdviDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  lahanCardNdviLabel: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  lahanCardNdviDate: {
    fontSize: 10,
    fontWeight: "500",
    opacity: 0.7,
  },
  lahanCardNdviValueRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  lahanCardNdviValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  lahanCardNdviState: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 4,
  },
  lahanCardNdmiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lahanCardNdmiText: { fontSize: 10, fontWeight: "700" },
  lahanCardNdviEmptyContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  lahanCardNdviEmptyText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  lahanCardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  lahanCardLocationText: {
    fontSize: 11,
    color: "#9CA3AF",
    flex: 1,
    fontWeight: "500",
  },
  lahanCardActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 8,
  },
  lahanActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 5,
  },
  lahanActionButtonDelete: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  lahanActionButtonText: { fontSize: 12, color: "#166534", fontWeight: "600" },
  lahanActionButtonDeleteText: { color: "#DC2626" },
  lahanDetailButton: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 9,
    backgroundColor: "#166534",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  lahanDetailButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  editToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 4,
  },
  editToggleButtonText: { fontSize: 12, color: "#166534", fontWeight: "600" },

  // Pagination
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 4,
  },
  paginationLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#166534",
    gap: 4,
  },
  paginationButtonDisabled: { backgroundColor: "#F3F4F6" },
  paginationButtonText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  paginationButtonTextDisabled: { color: "#9CA3AF" },

  // ── AI SECTION ──
  aiSectionOuter: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  aiSection: { padding: 20 },
  aiSectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  aiHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  aiIconGradient: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  aiHeaderCopy: { flex: 1 },
  aiHeaderBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(74,222,128,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
    marginBottom: 4,
  },
  aiHeaderBadgeText: { fontSize: 9, fontWeight: "800", color: "#4ADE80", letterSpacing: 1.5 },
  aiHeaderHeadline: { fontSize: 13, fontWeight: "600", color: "#D1FAE5" },
  aiHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiToggleButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  aiRefreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
    gap: 5,
  },
  aiRefreshButtonDisabled: { opacity: 0.4 },
  aiRefreshText: { fontSize: 12, fontWeight: "700", color: "#86EFAC" },
  aiAnalyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#4ADE80",
    gap: 6,
  },
  aiAnalyzeText: { fontSize: 12, fontWeight: "800", color: "#052E16" },
  aiDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 16,
  },
  aiEmptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  aiEmptyText: {
    fontSize: 13,
    color: "#4B7C5D",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  aiLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  aiLoadingDots: {},
  aiLoadingText: { fontSize: 13, color: "#4ADE80", flex: 1 },
  aiErrorBox: {
    flexDirection: "column",
    alignItems: "flex-start",
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    gap: 8,
  },
  aiErrorText: { fontSize: 13, color: "#FCA5A5", lineHeight: 19 },
  aiRetryButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.2)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  aiRetryText: { fontSize: 12, fontWeight: "700", color: "#FCA5A5" },
  aiCollapsedState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  aiCollapsedText: { fontSize: 13, color: "#4B7C5D", fontStyle: "italic" },
  aiPrioritiesContainer: { gap: 10 },
  aiPriorityCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  aiPriorityCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiPriorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  aiPriorityBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  aiPriorityText: { fontSize: 13.5, color: "#D1FAE5", lineHeight: 21, fontWeight: "500" },
  aiFallbackText: { fontSize: 13.5, color: "#D1FAE5", lineHeight: 21 },

  // ── NOTES ──
  notesHeaderContent: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  notesIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notesSubheader: { fontSize: 12, color: "#D97706", marginTop: 2, fontWeight: "600" },
  notesLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 10,
  },
  notesLoadingText: { fontSize: 13, color: "#D97706" },
  notesEmptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  notesEmptyTitle: { fontSize: 15, fontWeight: "700", color: "#D97706" },
  notesEmptyText: { fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 19 },
  notesGrid: { gap: 10 },
  noteCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
    borderWidth: 1,
    borderColor: "#FEF3C7",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  noteCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  noteNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  noteNumberText: { fontSize: 11, fontWeight: "800", color: "#D97706" },
  noteTimestamp: { fontSize: 11, color: "#D97706", fontWeight: "600" },
  noteLahanBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 3,
    marginTop: 3,
  },
  noteLahan: { fontSize: 10, color: "#D97706", fontWeight: "700" },
  noteCardFooterActions: { flexDirection: "row", gap: 6, marginLeft: "auto" },
  noteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#78350F",
    marginBottom: 6,
    lineHeight: 20,
  },
  noteContent: { fontSize: 13, color: "#92400E", lineHeight: 20 },
  noteActionButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  noteDeleteButton: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  newNoteButton: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    borderStyle: "dashed",
    gap: 8,
  },
  newNoteButtonText: {
    fontSize: 14,
    color: "#D97706",
    fontWeight: "700",
  },

  // ── MODALS ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
    paddingBottom: 36,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0D1B12", letterSpacing: -0.3 },
  importReviewBanner: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  importReviewCopy: { flex: 1 },
  importReviewTitle: { fontSize: 13, fontWeight: "700", color: "#14532D" },
  importReviewFile: { marginTop: 2, fontSize: 11, color: "#4B7C5D" },
  modalSubtitle: { fontSize: 13, color: "#9CA3AF", marginTop: 4, marginBottom: 16 },
  modalInfoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  modalInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 5,
  },
  modalInfoChipText: { fontSize: 12, fontWeight: "600", color: "#166534" },
  geoJsonPreviewButton: {
    minHeight: 54,
    marginBottom: 16,
    marginTop: -8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  geoJsonPreviewButtonCopy: { flex: 1 },
  geoJsonPreviewButtonTitle: { fontSize: 13, fontWeight: "700", color: "#14532D" },
  geoJsonPreviewButtonSubtitle: { marginTop: 2, fontSize: 10, lineHeight: 14, color: "#4B7C5D" },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    marginBottom: 16,
  },
  noteInput: { minHeight: 100 },
  categoryPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 13,
    marginBottom: 8,
  },
  categoryPickerLabel: { flex: 1, fontSize: 14, color: "#111827", fontWeight: "500" },
  exportAfterSaveRow: {
    minHeight: 56,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  exportAfterSaveCopy: { flex: 1 },
  exportAfterSaveTitle: { fontSize: 13, fontWeight: "700", color: "#1F2937" },
  exportAfterSaveSubtitle: { marginTop: 2, fontSize: 10, lineHeight: 14, color: "#6B7280" },
  categoryPickerDropdown: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  categoryPickerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  categoryPickerOptionActive: { backgroundColor: "#F0FDF4" },
  categoryPickerOptionText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  categoryPickerOptionTextActive: { color: "#166534", fontWeight: "700" },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalCancelText: { color: "#6B7280", fontSize: 14, fontWeight: "600" },
  modalSaveButton: {
    flex: 2,
    backgroundColor: "#166534",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  modalSaveButtonDisabled: { opacity: 0.5 },
  modalSaveText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  geoJsonModalContent: {
    width: "100%",
    maxHeight: height * 0.88,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
  },
  geoJsonModalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  geoJsonModalIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  geoJsonModalHeaderCopy: { flex: 1 },
  geoJsonModalFileName: { marginTop: 2, fontSize: 11, color: "#6B7280" },
  geoJsonCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  geoJsonFormatBanner: {
    marginTop: 16,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lahanCardActionSpacer: { flex: 1 },
  geoJsonFormatText: { flex: 1, fontSize: 11, lineHeight: 16, color: "#166534", fontWeight: "600" },
  geoJsonCodeScroll: {
    maxHeight: height * 0.43,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#0F172A",
  },
  geoJsonCodeContent: { padding: 14 },
  geoJsonCodeText: {
    color: "#D1FAE5",
    fontSize: 11,
    lineHeight: 17,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  geoJsonCoordinateHint: { marginTop: 10, fontSize: 11, lineHeight: 16, color: "#6B7280" },
  geoJsonModalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  geoJsonCopyButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  geoJsonCopyButtonText: { color: "#166534", fontSize: 14, fontWeight: "700" },
  geoJsonExportButton: {
    flex: 1.5,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#166534",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  geoJsonExportButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  noteModalContent: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
    maxHeight: height * 0.85,
    paddingBottom: 36,
  },
  noteModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FEF3C7",
  },
  noteModalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginBottom: 8,
  },
  notePickerLabel: { flex: 1, fontSize: 14, color: "#111827", fontWeight: "500" },
  notePickerDropdown: {
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    borderRadius: 12,
    maxHeight: 160,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  notePickerList: { paddingVertical: 4 },
  notePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#FEF3C7",
  },
  notePickerOptionText: { fontSize: 14, color: "#374151", fontWeight: "500" },
});

import { DrawingModeIndicator } from '@/components/drawing-mode-indicator';
import { ThemedView } from '@/components/themed-view';
import { NDVI_SEVERITY_CONFIG, NDVI_UNKNOWN_CONFIG, classifyNdviStatus, formatNdviValue, type NdviClassification, type NdviClassificationKey } from '@/constants/ndvi';
import { API_BASE_CANDIDATES, BASE_URL } from '@/hooks/config';
import { LahanWithInfo, lahanService, lahanThumbnailService, supabase } from '@/hooks/supabase';
import { computeSyntheticNdviForPolygon } from '@/utils/ndvi-simulator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  Keyboard,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MapView, {
  EdgePadding,
  LatLng,
  MapPressEvent,
  Marker,
  PROVIDER_GOOGLE,
  Polygon,
  Polyline,
  Region,
} from 'react-native-maps';

type LahanHealthRecord = {
  id: string;
  lahan_id: string;
  ndvi_score: number | null;
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
  classification: NdviClassification;
  centroid: LatLng | null;
  coordinateCount: number;
  locationLabel: string | null;
};

type NdviStatistic = {
  interval: string;
  ndvi_min: number;
  ndvi_max: number;
  ndvi_mean: number;
  ndvi_stdev: number;
};

const { width, height } = Dimensions.get("window");
const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLLAPSED_MAP_HEIGHT = Math.max(SCREEN_HEIGHT * 0.5, 320);
const FULL_MAP_HEIGHT = Math.max(
  SCREEN_HEIGHT * 0.85,
  COLLAPSED_MAP_HEIGHT + 140
);
const NDVI_BBOX_PADDING = 0.0004;
const LAHAN_PAGE_SIZE = 5;
const DEFAULT_LAHAN_THUMBNAIL = {
  uri: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
} as const;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const ndviStatisticCache = new Map<string, NdviStatistic | null>();
const ndviStatisticInflight = new Map<string, Promise<NdviStatistic | null>>();
const ndviStatisticErrorCount = new Map<string, number>();

const computePolygonCentroid = (points: LatLng[]): LatLng | null => {
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }

  const validPoints = points.filter(
    (coord): coord is LatLng =>
      Number.isFinite(coord?.latitude) && Number.isFinite(coord?.longitude)
  );

  if (validPoints.length === 0) {
    return null;
  }

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

const formatCoordinateValue = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }
  return value.toFixed(4);
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const ensureSpread = (
  minValue: number,
  maxValue: number,
  minimumSpread: number,
  lowerBound: number,
  upperBound: number
) => {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return [minValue, maxValue] as const;
  }

  if (maxValue - minValue >= minimumSpread) {
    return [minValue, maxValue] as const;
  }

  const midPoint = (maxValue + minValue) / 2;
  const halfSpread = minimumSpread / 2;
  const adjustedMin = clamp(midPoint - halfSpread, lowerBound, upperBound);
  const adjustedMax = clamp(midPoint + halfSpread, lowerBound, upperBound);
  return [adjustedMin, adjustedMax] as const;
};

const getBoundingBoxFromCoordinates = (
  coordinates: LatLng[]
): [number, number, number, number] | null => {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return null;
  }

  let minLat = Infinity;
  let minLon = Infinity;
  let maxLat = -Infinity;
  let maxLon = -Infinity;

  coordinates.forEach(({ latitude, longitude }) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }
    minLat = Math.min(minLat, latitude);
    minLon = Math.min(minLon, longitude);
    maxLat = Math.max(maxLat, latitude);
    maxLon = Math.max(maxLon, longitude);
  });

  if (
    !Number.isFinite(minLat) ||
    !Number.isFinite(minLon) ||
    !Number.isFinite(maxLat) ||
    !Number.isFinite(maxLon)
  ) {
    return null;
  }

  const paddedMinLat = clamp(minLat - NDVI_BBOX_PADDING, -90, 90);
  const paddedMinLon = clamp(minLon - NDVI_BBOX_PADDING, -180, 180);
  const paddedMaxLat = clamp(maxLat + NDVI_BBOX_PADDING, -90, 90);
  const paddedMaxLon = clamp(maxLon + NDVI_BBOX_PADDING, -180, 180);

  const [adjustedMinLat, adjustedMaxLat] = ensureSpread(
    paddedMinLat,
    paddedMaxLat,
    0.0008,
    -90,
    90
  );
  const [adjustedMinLon, adjustedMaxLon] = ensureSpread(
    paddedMinLon,
    paddedMaxLon,
    0.0008,
    -180,
    180
  );

  return [adjustedMinLon, adjustedMinLat, adjustedMaxLon, adjustedMaxLat];
};

const createNdviRecordFromStatistic = (
  lahanId: string,
  stat: NdviStatistic | null
): LahanHealthRecord | null => {
  if (
    !stat ||
    typeof stat.ndvi_mean !== "number" ||
    Number.isNaN(stat.ndvi_mean)
  ) {
    return null;
  }

  const capturedDateIso = stat.interval ? `${stat.interval}T00:00:00Z` : null;

  return {
    id: `ndvi-${lahanId}-${stat.interval ?? Date.now()}`,
    lahan_id: lahanId,
    ndvi_score: stat.ndvi_mean,
    status: null,
    captured_at: capturedDateIso,
    created_at: new Date().toISOString(),
  };
};

const createSyntheticNdviRecord = (
  lahan: SavedLahanItem
): LahanHealthRecord | null => {
  if (!Array.isArray(lahan.coordinates) || lahan.coordinates.length === 0) {
    return null;
  }

  const synthetic = computeSyntheticNdviForPolygon(
    lahan.coordinates,
    lahan.areaHa ?? null
  );
  if (!synthetic) {
    return null;
  }

  const ndviScore = Number(synthetic.ndviCurrent.toFixed(2));
  const latestHistory = synthetic.ndviHistory.at(-1);

  return {
    id: `ndvi-synthetic-${lahan.id}`,
    lahan_id: lahan.id,
    ndvi_score: ndviScore,
    status: "synthetic",
    captured_at: latestHistory?.date?.toISOString() ?? new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
};

const parseDateToTime = (value?: string | null) => {
  if (!value) {
    return 0;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
};

const applyAlphaToHex = (hex: string, alpha: number) => {
  const normalisedAlpha = Math.max(0, Math.min(alpha, 1));
  const alphaValue = Math.round(normalisedAlpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alphaValue}`;
};

const formatDisplayDate = (value?: string | null) => {
  const time = parseDateToTime(value ?? undefined);
  if (!time) {
    return "Baru";
  }

  try {
    const formatter = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return formatter.format(time);
  } catch {
    return new Date(time).toISOString().split("T")[0];
  }
};

const formatHa = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  return `${value.toFixed(2)} ha`;
};

const formatYearLabel = (value?: string | null) => {
  const time = parseDateToTime(value ?? undefined);
  if (!time) {
    return "Lahan baru";
  }
  return `Sejak ${new Date(time).getFullYear()}`;
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

export default function ExploreScreen() {
  const router = useRouter();
  const fallbackUserId = process.env.EXPO_PUBLIC_SUPABASE_DEFAULT_USER_ID;
  const [selectedFilter, setSelectedFilter] = useState("NDVI");
  const [drawingMode, setDrawingMode] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [lahanName, setLahanName] = useState("");
  const [currentVertices, setCurrentVertices] = useState<LatLng[]>([]);
  const [pendingPolygon, setPendingPolygon] = useState<LatLng[]>([]);
  const [redoVertices, setRedoVertices] = useState<LatLng[]>([]);

  const activePath = useMemo(
    () =>
      currentVertices
        .map((coord) => ({
          latitude: coord.latitude,
          longitude: coord.longitude,
        }))
        .filter(
          (coord): coord is LatLng =>
            Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude)
        ),
    [currentVertices]
  );

  const previewPath = useMemo(() => {
    if (activePath.length >= 3) {
      return [...activePath, { ...activePath[0] }];
    }
    return activePath;
  }, [activePath]);
  const [savedLahan, setSavedLahan] = useState<SavedLahanItem[]>([]);
  const [lahanLocationLabels, setLahanLocationLabels] = useState<
    Record<string, string | null>
  >({});
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
  const [selectedNoteLahanId, setSelectedNoteLahanId] = useState<string | null>(
    null
  );
  const [isLahanPickerVisible, setIsLahanPickerVisible] = useState(false);
  const [ndviOverrides, setNdviOverrides] = useState<
    Record<string, LahanHealthRecord | null | undefined>
  >({});
  const [ndviFetchingMap, setNdviFetchingMap] = useState<
    Record<string, boolean>
  >({});
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const mapRef = useRef<MapView>(null);
  const currentRegionRef = useRef<Region | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapScrollResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const mapTouchActiveRef = useRef(false);
  const mapTouchLastActiveRef = useRef<number>(0);
  const releaseScrollLock = useCallback(() => {
    setScrollEnabled((prev) => {
      if (prev) {
        return prev;
      }
      return true;
    });
  }, []);
  const scheduleScrollLockReset = useCallback(() => {
    // Keep rescheduling while the user is actively dragging the map so the parent scroll stays locked
    if (mapScrollResetTimeoutRef.current) {
      clearTimeout(mapScrollResetTimeoutRef.current);
    }

    mapScrollResetTimeoutRef.current = setTimeout(() => {
      const idleDuration = Date.now() - mapTouchLastActiveRef.current;
      if (!mapTouchActiveRef.current || idleDuration >= 1000) {
        mapTouchActiveRef.current = false;
        releaseScrollLock();
        mapScrollResetTimeoutRef.current = null;
        return;
      }

      scheduleScrollLockReset();
    }, 1600);
  }, [releaseScrollLock]);
  const [userLocation, setUserLocation] = useState({
    latitude: -6.2088,
    longitude: 106.8456,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [locationLabel, setLocationLabel] = useState('Menentukan lokasi...');
  const [lahanSummaryText, setLahanSummaryText] = useState<string>('');
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
    if (!lahanSummaryText) {
      return [] as { id: string; priorityNumber: number; description: string }[];
    }

    const lines = lahanSummaryText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    return lines
      .map((line, index) => {
        const match = /^Prioritas\s*(\d+)\s*:\s*(.*)$/i.exec(line);
        const priorityNumber = match ? Number.parseInt(match[1], 10) : index + 1;
        const rawDescription = match ? match[2]?.trim() ?? '' : line.replace(/^Prioritas\s*\d+\s*:\s*/i, '').trim();
        const description = rawDescription.length > 0 ? rawDescription : line.replace(/^Prioritas\s*\d+\s*:\s*/i, '').trim() || line;
        return {
          id: `${priorityNumber}-${index}`,
          priorityNumber,
          description,
        };
      })
      .filter((item) => item.description.length > 0)
      .slice(0, 3);
  }, [lahanSummaryText]);

  const filters = ["NDVI", "Kontras NDVI", "Pengendapan", "Tanah"];

  const promptAuthSignup = useCallback(() => {
    Alert.alert(
      "Perlu Akun",
      "Kami akan membuka halaman daftar supaya kamu bisa menyimpan lahan.",
      [
        {
          text: "Buka Halaman Daftar",
          onPress: () => router.replace("/auth/signup"),
        },
      ],
      { cancelable: true }
    );
  }, [router]);

  const toLatLngCoordinates = useCallback((geojson: any): LatLng[] => {
    if (!geojson) return [];

    const parsed = typeof geojson === "string" ? JSON.parse(geojson) : geojson;
    const ring: number[][] = parsed?.coordinates?.[0] ?? [];
    if (!Array.isArray(ring)) return [];

    const withoutClosingPoint = ring.slice(
      0,
      ring.length > 1 ? -1 : ring.length
    );
    return withoutClosingPoint.map((point) => ({
      latitude: point[1],
      longitude: point[0],
    }));
  }, []);

  const loadSavedLahan = useCallback(async () => {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? "";
        if (message.includes("Auth session missing")) {
          return;
        }
        throw authError;
      }

      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) {
        return;
      }

      const lahanList = (await lahanService.getLahanByUser(
        userId
      )) as LahanWithInfo[];
      if (!Array.isArray(lahanList)) {
        return;
      }

      const mapped = lahanList
        .map((item) => ({
          id: item.id,
          name: item.name,
          coordinates: toLatLngCoordinates(item.geojson),
          areaHa: item.area_ha,
          createdAt: item.created_at ?? null,
          thumbnailUrl:
            typeof item.thumbnail_url === "string" &&
            item.thumbnail_url.length > 0
              ? item.thumbnail_url
              : null,
        }))
        .filter((item) => item.coordinates.length >= 3);

      mapped.sort(
        (a, b) => parseDateToTime(b.createdAt) - parseDateToTime(a.createdAt)
      );

      setSavedLahan(mapped);
    } catch (error) {
      console.error("❌ Gagal memuat data lahan:", error);
    }
  }, [fallbackUserId, toLatLngCoordinates]);

  const loadLahanHealth = useCallback(async (targetIds: string[]) => {
    if (!Array.isArray(targetIds) || targetIds.length === 0) {
      setLahanHealth([]);
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

      setLahanHealth(Array.isArray(data) ? (data as LahanHealthRecord[]) : []);
    } catch (error) {
      console.error("❌ Gagal memuat kesehatan lahan:", error);
      setLahanHealth([]);
    }
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      setNotesLoading(true);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? "";
        if (message.includes("Auth session missing")) {
          setNotes([]);
          setNotesLoading(false);
          return;
        }
        throw authError;
      }

      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) {
        setNotes([]);
        setNotesLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("lahan_notes")
        .select("id,lahan_id,title,content,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      setNotes(Array.isArray(data) ? (data as LahanNoteRecord[]) : []);
    } catch (error) {
      console.error("❌ Gagal memuat catatan:", error);
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [fallbackUserId]);

  const getCurrentLocation = useCallback(async () => {
    try {
      console.log("📍 Requesting location permission...");
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("❌ Location permission denied");
        Alert.alert(
          "Permission Denied",
          "Lokasi diperlukan untuk menampilkan peta"
        );
        setLocationLabel("Izin lokasi belum diberikan");
        return;
      }

      console.log("✅ Getting current position...");
      let location = await Location.getCurrentPositionAsync({});
      console.log(
        `📍 User location: ${location.coords.latitude}, ${location.coords.longitude}`
      );

      const baseRegion = currentRegionRef.current;
      const nextRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: clampDeltaValue(baseRegion?.latitudeDelta ?? 0.01),
        longitudeDelta: clampDeltaValue(baseRegion?.longitudeDelta ?? 0.01),
      };

      setUserLocation(nextRegion);
      currentRegionRef.current = nextRegion;
      mapRef.current?.animateToRegion(nextRegion, 350);

      try {
        const geocoded = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setLocationLabel(
          formatGeocodedLocation(geocoded?.[0] ?? null) ??
            `Lat ${location.coords.latitude.toFixed(
              2
            )}, Lon ${location.coords.longitude.toFixed(2)}`
        );
      } catch (reverseError) {
        console.warn("Reverse geocode gagal", reverseError);
        setLocationLabel(
          `Lat ${location.coords.latitude.toFixed(
            2
          )}, Lon ${location.coords.longitude.toFixed(2)}`
        );
      }
    } catch (error) {
      console.error("❌ Location error:", error);
      Alert.alert("Error", "Gagal mendapatkan lokasi");
      setLocationLabel("Lokasi tidak diketahui");
    }
  }, []);

  useEffect(() => {
    getCurrentLocation();
    loadSavedLahan();
  }, [getCurrentLocation, loadSavedLahan]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (mapScrollResetTimeoutRef.current) {
        clearTimeout(mapScrollResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (savedLahan.length === 0) {
      setLahanHealth([]);
      setSelectedNoteLahanId(null);
      setLahanLocationLabels({});
      return;
    }

    const lahanIds = savedLahan.map((item) => item.id).filter(Boolean);
    setSelectedNoteLahanId((prev) => prev ?? lahanIds[0] ?? null);

    setLahanLocationLabels((prev) => {
      const next: Record<string, string | null> = {};
      let changed = false;
      savedLahan.forEach((item) => {
        if (prev[item.id] !== undefined) {
          next[item.id] = prev[item.id] ?? null;
        } else {
          changed = true;
        }
      });

      if (!changed && Object.keys(prev).length === savedLahan.length) {
        return prev;
      }

      return next;
    });

    if (lahanIds.length > 0) {
      loadLahanHealth(lahanIds);
    }
  }, [loadLahanHealth, savedLahan]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    let isActive = true;
    const controller = new AbortController();
    setIsSearching(true);
    setShowSearchResults(true);

    const timeoutId = setTimeout(async () => {
      try {
        const endpoint = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(
          query
        )}`;
        const response = await fetch(endpoint, {
          headers: {
            "User-Agent": "MataniApp/1.0 (https://matani.app)",
            "Accept-Language": "id,en",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Gagal mencari lokasi");
        }

        const raw = await response.json();
        if (!isActive) return;

        const normalized = (Array.isArray(raw) ? raw : [])
          .map((item: any, index: number) => {
            const lat = parseFloat(item?.lat);
            const lon = parseFloat(item?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
              return null;
            }

            const address = item?.address ?? {};
            const subtitleParts = [
              address.road,
              address.neighbourhood || address.suburb,
              address.city || address.town || address.village,
              address.state,
            ].filter(Boolean);

            return {
              id: String(item?.place_id ?? index),
              label:
                item?.display_name ?? subtitleParts[0] ?? "Lokasi tanpa nama",
              subtitle:
                subtitleParts.length > 0 ? subtitleParts.join(", ") : undefined,
              latitude: lat,
              longitude: lon,
            } as SearchSuggestion;
          })
          .filter(Boolean)
          .slice(0, 6) as SearchSuggestion[];

        setSearchResults(normalized);
        setShowSearchResults(true);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("❌ Gagal mencari lokasi:", error);
        if (isActive) {
          setSearchResults([]);
          setShowSearchResults(true);
        }
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      isActive = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (savedLahan.length === 0) {
      return;
    }

    const pending = savedLahan.filter((item) => {
      if (!Array.isArray(item.coordinates) || item.coordinates.length === 0) {
        return false;
      }
      return lahanLocationLabels[item.id] === undefined;
    });

    if (pending.length === 0) {
      return;
    }

    let isCancelled = false;

    (async () => {
      const updates: Record<string, string | null> = {};

      for (const lahan of pending) {
        const centroid = computePolygonCentroid(lahan.coordinates);
        if (!centroid) {
          updates[lahan.id] = null;
          continue;
        }

        try {
          const result = await Location.reverseGeocodeAsync({
            latitude: centroid.latitude,
            longitude: centroid.longitude,
          });
          const formatted = formatGeocodedLocation(result?.[0] ?? null);
          updates[lahan.id] = formatted ?? null;
        } catch (error) {
          console.warn("❌ Gagal reverse geocode lahan:", lahan.id, error);
          updates[lahan.id] = null;
        }

        if (isCancelled) {
          break;
        }
      }

      if (!isCancelled && Object.keys(updates).length > 0) {
        setLahanLocationLabels((prev) => ({
          ...prev,
          ...updates,
        }));
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [lahanLocationLabels, savedLahan]);
  // Enhanced map interaction for polygon drawing like in the image
  const handleMapPress = (event: MapPressEvent) => {
    if (showSearchResults) {
      setShowSearchResults(false);
      Keyboard.dismiss();
    }

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

    setCurrentVertices((prev) => [...prev, coordinate]);
    setRedoVertices([]);
  };

  const calculateArea = (coordinates: LatLng[]) => {
    if (coordinates.length < 3) return 0;

    // Simple area calculation (not accurate for real use)
    // For demo purposes only
    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
      const j = (i + 1) % coordinates.length;
      area += coordinates[i].longitude * coordinates[j].latitude;
      area -= coordinates[j].longitude * coordinates[i].latitude;
    }
    area = Math.abs(area) / 2;

    // Convert to hectares (very rough approximation)
    return area * 10000; // Convert to hectares
  };

  const clearActivePath = useCallback(() => {
    setCurrentVertices([]);
    setPendingPolygon([]);
    setRedoVertices([]);
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      setSearchMarker(null);
    } else {
      setShowSearchResults(true);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchMarker(null);
    Keyboard.dismiss();
  };

  const handleSearchFocus = () => {
    if (searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  const handleSelectSearchResult = (result: SearchSuggestion) => {
    Keyboard.dismiss();

    const coordinate = {
      latitude: result.latitude,
      longitude: result.longitude,
    };

    setSearchQuery(result.label);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchMarker(coordinate);

    setLocationLabel(result.label);

    clearActivePath();
    setDrawingMode(false);
    setShowSaveModal(false);

    const nextRegion: Region = {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    };

    setUserLocation((prev) => ({
      ...prev,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    }));
    currentRegionRef.current = nextRegion;
    mapRef.current?.animateToRegion(nextRegion, 350);
  };

  const animateToRegion = useCallback((region: Region, duration = 200) => {
    if (!mapRef.current) return;
    currentRegionRef.current = region;
    mapRef.current.animateToRegion(region, duration);
  }, []);

  const fetchNdviStatistic = useCallback(
    async (
      bbox: [number, number, number, number]
    ): Promise<NdviStatistic | null> => {
      const bboxKey = bbox.map((value) => value.toFixed(6)).join(",");

      if (ndviStatisticCache.has(bboxKey)) {
        return ndviStatisticCache.get(bboxKey) ?? null;
      }

      if (ndviStatisticInflight.has(bboxKey)) {
        return ndviStatisticInflight.get(bboxKey) ?? null;
      }

      const request = (async () => {
        try {
          const searchParams = new URLSearchParams();
          searchParams.set("bbox", bboxKey);

          const response = await fetch(
            `${BASE_URL}/ndvi?${searchParams.toString()}`
          );
          if (!response.ok) {
            throw new Error(
              `NDVI request failed with status ${response.status}`
            );
          }

          const payload = await response.json();
          if (!Array.isArray(payload) || payload.length === 0) {
            ndviStatisticCache.set(bboxKey, null);
            return null;
          }

          const latestEntry = payload[
            payload.length - 1
          ] as Partial<NdviStatistic>;
          if (
            typeof latestEntry?.ndvi_mean !== "number" ||
            Number.isNaN(latestEntry.ndvi_mean)
          ) {
            ndviStatisticCache.set(bboxKey, null);
            return null;
          }

          const result: NdviStatistic = {
            interval:
              typeof latestEntry.interval === "string"
                ? latestEntry.interval
                : new Date().toISOString().split("T")[0],
            ndvi_mean: latestEntry.ndvi_mean,
            ndvi_min:
              typeof latestEntry.ndvi_min === "number"
                ? latestEntry.ndvi_min
                : latestEntry.ndvi_mean,
            ndvi_max:
              typeof latestEntry.ndvi_max === "number"
                ? latestEntry.ndvi_max
                : latestEntry.ndvi_mean,
            ndvi_stdev:
              typeof latestEntry.ndvi_stdev === "number"
                ? latestEntry.ndvi_stdev
                : 0,
          };

          ndviStatisticCache.set(bboxKey, result);
          return result;
        } catch (error) {
          const count = (ndviStatisticErrorCount.get(bboxKey) ?? 0) + 1;
          ndviStatisticErrorCount.set(bboxKey, count);
          if (__DEV__ && count <= 3) {
            console.warn("⚠️ NDVI fetch fallback akan digunakan:", error);
          }
          ndviStatisticCache.set(bboxKey, null);
          return null;
        } finally {
          ndviStatisticInflight.delete(bboxKey);
        }
      })();

      ndviStatisticInflight.set(bboxKey, request);
      return request;
    },
    []
  );

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
      latitudeDelta: clampDeltaValue(
        current.latitudeDelta ?? userLocation.latitudeDelta
      ),
      longitudeDelta: clampDeltaValue(
        current.longitudeDelta ?? userLocation.longitudeDelta
      ),
    };

    animateToRegion(nextRegion, 300);
    setSearchMarker(null);
    getCurrentLocation();
  }, [animateToRegion, getCurrentLocation, userLocation]);

  const handleMapTouchStart = useCallback(() => {
    mapTouchActiveRef.current = true;
    mapTouchLastActiveRef.current = Date.now();

    setScrollEnabled((prev) => {
      if (!prev) {
        return prev;
      }
      return false;
    });

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    scheduleScrollLockReset();
  }, [scheduleScrollLockReset]);

  const handleMapTouchEnd = useCallback(() => {
    mapTouchActiveRef.current = false;
    mapTouchLastActiveRef.current = Date.now();

    if (mapScrollResetTimeoutRef.current) {
      clearTimeout(mapScrollResetTimeoutRef.current);
      mapScrollResetTimeoutRef.current = null;
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      releaseScrollLock();
      scrollTimeoutRef.current = null;
    }, 80);
  }, [releaseScrollLock]);

  const handleMapPanDrag = useCallback(() => {
    mapTouchLastActiveRef.current = Date.now();
    if (!mapTouchActiveRef.current) {
      mapTouchActiveRef.current = true;
    }
    scheduleScrollLockReset();
  }, [scheduleScrollLockReset]);

  const startDrawing = () => {
    setDrawingMode(true);
    setShowSaveModal(false);
    setLahanName("");
    clearActivePath();
    Alert.alert(
      "Mode Gambar Aktif",
      "Tap pada peta untuk menandai titik-titik polygon."
    );
  };

  const finishDrawing = () => {
    if (activePath.length < 3) {
      Alert.alert(
        "Error",
        "Minimal 3 titik diperlukan untuk membuat polygon lahan."
      );
      return;
    }

    const completedPath = activePath.map((coord) => ({ ...coord }));
    setPendingPolygon(completedPath);
    setDrawingMode(false);
    setShowSaveModal(true);
    setCurrentVertices([]);
    setRedoVertices([]);
  };

  const cancelDrawing = () => {
    setDrawingMode(false);
    setShowSaveModal(false);
    setLahanName("");
    clearActivePath();
  };

  const undoLastPoint = () => {
    setCurrentVertices((prevPath) => {
      if (prevPath.length === 0) {
        return prevPath;
      }

      const nextPath = prevPath.slice(0, -1);
      const removedVertex = prevPath[prevPath.length - 1];
      setRedoVertices((prevRedo) => [...prevRedo, removedVertex]);
      return nextPath;
    });
  };

  const redoLastPoint = () => {
    setRedoVertices((prevRedo) => {
      if (prevRedo.length === 0) {
        return prevRedo;
      }

      const recoveredVertex = prevRedo[prevRedo.length - 1];
      setCurrentVertices((prevPath) => [...prevPath, recoveredVertex]);
      return prevRedo.slice(0, -1);
    });
  };

  const capturePolygonSnapshot = useCallback(
    async (coordinates: LatLng[]): Promise<string | null> => {
      if (!mapRef.current || coordinates.length < 3) {
        return null;
      }

      try {
        const previousRegion = currentRegionRef.current ?? null;
        const edgePadding: EdgePadding = {
          top: 120,
          right: 120,
          bottom: 120,
          left: 120,
        };

        try {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding,
            animated: false,
          });
        } catch (fitError) {
          console.warn("❌ fitToCoordinates gagal sebelum snapshot:", fitError);
        }

        await sleep(200);

        const snapshotPath = await mapRef.current.takeSnapshot({
          width: Math.round(width * 1.15),
          height: Math.round(width * 0.75),
          format: "png",
          quality: 0.9,
          result: "file",
        });

        if (previousRegion) {
          try {
            mapRef.current.animateToRegion(previousRegion, 0);
            currentRegionRef.current = previousRegion;
          } catch (restoreError) {
            console.warn(
              "❌ Gagal mengembalikan region peta setelah snapshot:",
              restoreError
            );
          }
        }

        if (snapshotPath && typeof snapshotPath === "string") {
          return snapshotPath;
        }
      } catch (error) {
        console.warn("❌ Gagal mengambil snapshot lahan:", error);
      }

      return null;
    },
    []
  );

  const saveLahan = async () => {
    const trimmedName = lahanName.trim();

    if (!trimmedName) {
      Alert.alert("Error", "Nama lahan tidak boleh kosong");
      return;
    }

    if (pendingPolygon.length < 3) {
      Alert.alert("Error", "Polygon lahan belum lengkap untuk disimpan.");
      return;
    }

    if (isSaving) {
      return;
    }

    const polygonToPersist = [...pendingPolygon];
    const area = calculateArea(polygonToPersist);

    try {
      setIsSaving(true);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? "";
        if (message.includes("Auth session missing")) {
          promptAuthSignup();
          setShowSaveModal(false);
          return;
        }
        throw authError;
      }

      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) {
        promptAuthSignup();
        setShowSaveModal(false);
        return;
      }

      let uploadResult: {
        publicUrl: string | null;
        storagePath: string | null;
      } = {
        publicUrl: null,
        storagePath: null,
      };

      const snapshotUri = await capturePolygonSnapshot(polygonToPersist);
      if (snapshotUri) {
        try {
          uploadResult = await lahanService.uploadThumbnailFromFile(
            userId,
            snapshotUri
          );
          console.log(
            "� Thumbnail lahan tersimpan di storage Supabase:",
            uploadResult
          );
        } catch (thumbnailUploadError) {
          console.warn(
            "❌ Gagal mengunggah thumbnail lahan:",
            thumbnailUploadError
          );
        }
      }

      console.log("�💾 Saving lahan to Supabase:", {
        name: trimmedName,
        coordinates: polygonToPersist,
        area,
        userId,
      });

      const savedEntry = await lahanService.saveLahan(
        trimmedName,
        polygonToPersist,
        userId,
        area,
        {
          thumbnailUrl: uploadResult.publicUrl,
        }
      );

      console.log("✅ Lahan saved response:", savedEntry);

      if (
        savedEntry?.id &&
        (uploadResult.publicUrl || uploadResult.storagePath)
      ) {
        try {
          await lahanThumbnailService.createThumbnailRecord({
            lahanId: savedEntry.id,
            userId,
            storagePath: uploadResult.storagePath,
            publicUrl: savedEntry.thumbnail_url ?? uploadResult.publicUrl,
            capturedAt: new Date(),
          });
        } catch (metadataError) {
          console.warn(
            "❌ Gagal membuat metadata thumbnail lahan:",
            metadataError
          );
        }
      }

      const savedArea = Number(savedEntry?.area_ha ?? area);
      const areaText = Number.isFinite(savedArea)
        ? savedArea.toFixed(2)
        : area.toFixed(2);

      const newSavedLahan: SavedLahanItem = {
        id: savedEntry?.id ?? `local-${Date.now()}`,
        name: trimmedName,
        coordinates: polygonToPersist,
        areaHa: savedArea,
        createdAt: savedEntry?.created_at ?? new Date().toISOString(),
        thumbnailUrl:
          savedEntry?.thumbnail_url ?? uploadResult.publicUrl ?? null,
      };

      setSavedLahan((prev) => {
        const filtered = prev.filter((item) => item.id !== newSavedLahan.id);
        return [...filtered, newSavedLahan];
      });

      loadSavedLahan();

      setShowSaveModal(false);
      setLahanName("");
      clearActivePath();
      Alert.alert(
        "Sukses",
        `Lahan "${trimmedName}" berhasil disimpan!\nLuas: ${areaText} ha`
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
    setShowSaveModal(false);
    setLahanName("");
    clearActivePath();
  };

  const lahanNameLookup = useMemo(() => {
    const map = new Map<string, SavedLahanItem>();
    savedLahan.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [savedLahan]);

  const latestHealthByLahan = useMemo(() => {
    const map = new Map<string, LahanHealthRecord>();
    lahanHealth.forEach((record) => {
      if (!record?.lahan_id) {
        return;
      }

      const existing = map.get(record.lahan_id);
      if (!existing) {
        map.set(record.lahan_id, record);
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
        map.set(record.lahan_id, record);
      }
    });
    return map;
  }, [lahanHealth]);

  useEffect(() => {
    if (savedLahan.length === 0) {
      return;
    }

    setNdviOverrides((prev) => {
      const updates: Record<string, LahanHealthRecord | null | undefined> = {};

      savedLahan.forEach((lahan) => {
        if (prev[lahan.id] === undefined) {
          updates[lahan.id] = createSyntheticNdviRecord(lahan) ?? null;
        }
      });

      if (Object.keys(updates).length === 0) {
        return prev;
      }

      return {
        ...prev,
        ...updates,
      };
    });
  }, [savedLahan]);

  const lahanCards = useMemo<LahanCard[]>(() => {
    return savedLahan.map((item) => {
      const supabaseHealth = latestHealthByLahan.get(item.id);
      const validSupabaseHealth =
        supabaseHealth &&
        supabaseHealth.ndvi_score !== null &&
        supabaseHealth.ndvi_score !== undefined
          ? supabaseHealth
          : undefined;
      const override = ndviOverrides[item.id];
      const latestHealth = validSupabaseHealth ?? override ?? undefined;
      const classification = classifyNdviStatus(
        latestHealth?.ndvi_score ?? null,
        latestHealth?.status ?? null
      );
      const centroid = computePolygonCentroid(item.coordinates ?? []);
      return {
        ...item,
        latestHealth,
        classification,
        centroid,
        coordinateCount: Array.isArray(item.coordinates)
          ? item.coordinates.length
          : 0,
        locationLabel: lahanLocationLabels[item.id] ?? null,
      };
    });
  }, [lahanLocationLabels, latestHealthByLahan, ndviOverrides, savedLahan]);

  const lahanCardsById = useMemo(() => {
    const map = new Map<string, LahanCard>();
    lahanCards.forEach((card) => {
      map.set(card.id, card);
    });
    return map;
  }, [lahanCards]);

  const lahanSummaryPayload = useMemo(() => {
    if (lahanCards.length === 0) {
      return null;
    }

    let totalArea = 0;
    let ndviSum = 0;
    let ndviCount = 0;
    let latestTimestamp = 0;
    const classificationBreakdown: Record<string, number> = {};

    const cardsPayload = lahanCards.map((card) => {
      if (typeof card.areaHa === 'number' && Number.isFinite(card.areaHa)) {
        totalArea += card.areaHa;
      }

      const ndviScore =
        typeof card.latestHealth?.ndvi_score === 'number' && Number.isFinite(card.latestHealth.ndvi_score)
          ? Number(card.latestHealth.ndvi_score.toFixed(2))
          : null;

      if (ndviScore !== null) {
        ndviSum += ndviScore;
        ndviCount += 1;
      }

      const timestamp = parseDateToTime(card.latestHealth?.captured_at ?? card.createdAt);
      if (timestamp > latestTimestamp) {
        latestTimestamp = timestamp;
      }

      const statusTitle = card.classification.title;
      classificationBreakdown[statusTitle] = (classificationBreakdown[statusTitle] ?? 0) + 1;

      return {
        id: card.id,
        name: card.name,
        areaHa:
          typeof card.areaHa === 'number' && Number.isFinite(card.areaHa)
            ? Number(card.areaHa.toFixed(2))
            : null,
        ndviScore,
        ndviStatus: card.classification.title,
        ndviKey: card.classification.key,
        coordinateCount: card.coordinateCount,
        capturedAt: card.latestHealth?.captured_at ?? card.createdAt ?? null,
        locationLabel: card.locationLabel,
      };
    });

    return {
      lahanCards: cardsPayload,
      totals: {
        lahanCount: cardsPayload.length,
        totalAreaHa: Number(totalArea.toFixed(2)),
        averageNdvi: ndviCount > 0 ? Number((ndviSum / ndviCount).toFixed(2)) : null,
        classificationBreakdown,
        latestDataTimestamp: latestTimestamp ? new Date(latestTimestamp).toISOString() : null,
      },
    };
  }, [lahanCards]);

  const totalLahanPages = useMemo(() => {
    if (lahanCards.length === 0) {
      return 0;
    }
    return Math.ceil(lahanCards.length / LAHAN_PAGE_SIZE);
  }, [lahanCards.length]);

  useEffect(() => {
    if (totalLahanPages === 0) {
      setLahanPage(0);
      return;
    }
    setLahanPage((prev) => {
      const maxPageIndex = Math.max(totalLahanPages - 1, 0);
      return Math.min(prev, maxPageIndex);
    });
  }, [totalLahanPages]);

  const paginatedLahanCards = useMemo(() => {
    if (lahanCards.length === 0) {
      return [] as LahanCard[];
    }
    const maxPageIndex = Math.max(totalLahanPages - 1, 0);
    const pageIndex = Math.min(Math.max(lahanPage, 0), maxPageIndex);
    const start = pageIndex * LAHAN_PAGE_SIZE;
    return lahanCards.slice(start, start + LAHAN_PAGE_SIZE);
  }, [lahanCards, lahanPage, totalLahanPages]);

  const hasLahanPagination = totalLahanPages > 1;
  const lahanPageDisplay =
    totalLahanPages === 0 ? 0 : Math.min(lahanPage + 1, totalLahanPages);
  const handlePrevLahanPage = useCallback(() => {
    setLahanPage((prev) => Math.max(prev - 1, 0));
  }, []);
  const handleNextLahanPage = useCallback(() => {
    setLahanPage((prev) => {
      const maxPageIndex = Math.max(totalLahanPages - 1, 0);
      return Math.min(prev + 1, maxPageIndex);
    });
  }, [totalLahanPages]);
  const isPrevLahanDisabled = lahanPage <= 0;
  const isNextLahanDisabled =
    totalLahanPages === 0 || lahanPage >= Math.max(totalLahanPages - 1, 0);

  const lahanHealthSummary = useMemo(() => {
    const seed = NDVI_SEVERITY_CONFIG.reduce(
      (acc, item) => {
        acc[item.key] = 0;
        return acc;
      },
      { unknown: 0 } as Record<NdviClassificationKey, number>
    );

    return lahanCards.reduce((acc, card) => {
      acc[card.classification.key] += 1;
      return acc;
    }, seed);
  }, [lahanCards]);

  const fetchLahanSummary = useCallback(
    async (forceRefresh = false) => {
      if (!lahanSummaryPayload || lahanSummaryPayload.lahanCards.length === 0) {
        setLahanSummaryText('');
        setLahanSummaryError(null);
        lahanSummarySignatureRef.current = null;
        return;
      }

      const signature = JSON.stringify(lahanSummaryPayload);
      if (!forceRefresh && lahanSummarySignatureRef.current === signature) {
        return;
      }

      setIsLahanSummaryLoading(true);
      setLahanSummaryError(null);
      setLahanSummaryText('');

      const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: signature,
      };

      const candidateUrls: string[] = [];

      API_BASE_CANDIDATES.forEach((baseUrl) => {
        const normalised = baseUrl.replace(/\/$/, '');
        const directUrl = `${normalised}/ai/summary`;
        if (!candidateUrls.includes(directUrl)) {
          candidateUrls.push(directUrl);
        }

        if (!/\/api\/?$/.test(normalised)) {
          const apiPrefixed = `${normalised}/api/ai/summary`;
          if (!candidateUrls.includes(apiPrefixed)) {
            candidateUrls.push(apiPrefixed);
          }
        }
      });

      try {
        let response: Response | null = null;
        let lastErrorMessage = '';

        for (const url of candidateUrls) {
          try {
            response = await fetch(url, requestOptions);
          } catch (networkError) {
            lastErrorMessage = networkError instanceof Error ? networkError.message : String(networkError);
            continue;
          }

          if (response.ok) {
            break;
          }

          const message = await response.text();
          lastErrorMessage = message || `Request failed with status ${response.status}`;
          response = null;
        }

        if (!response) {
          throw new Error(lastErrorMessage || 'Ringkasan lahan tidak dapat dimuat.');
        }

        const data = await response.json();
        const summary = typeof data?.summary === 'string' ? data.summary.trim() : '';
        lahanSummarySignatureRef.current = signature;
        setLahanSummaryText(summary);
      } catch (error) {
        console.error('❌ Gagal memuat ringkasan lahan:', error);
        setLahanSummaryError(
          'Ringkasan belum bisa dibuat. Pastikan server Matani berjalan lalu coba lagi.'
        );
        lahanSummarySignatureRef.current = null;
      } finally {
        setIsLahanSummaryLoading(false);
      }
    },
    [lahanSummaryPayload]
  );

  const handleRefreshSummary = useCallback(() => {
    fetchLahanSummary(true);
  }, [fetchLahanSummary]);

  useEffect(() => {
    if (!lahanSummaryPayload || lahanSummaryPayload.lahanCards.length === 0) {
      setLahanSummaryText('');
      setLahanSummaryError(null);
      lahanSummarySignatureRef.current = null;
      return;
    }

    const signature = JSON.stringify(lahanSummaryPayload);
    if (lahanSummarySignatureRef.current && lahanSummarySignatureRef.current !== signature) {
      lahanSummarySignatureRef.current = null;
      setLahanSummaryText('');
      setLahanSummaryError(null);
    }
  }, [lahanSummaryPayload]);

  useEffect(() => {
    if (lahanSummaryText) {
      setIsLahanSummaryCollapsed(false);
    }
  }, [lahanSummaryText]);

  const notesWithMetadata = useMemo(() => {
    return notes.map((note) => ({
      ...note,
      lahanName: note.lahan_id
        ? lahanNameLookup.get(note.lahan_id)?.name ?? null
        : null,
    }));
  }, [lahanNameLookup, notes]);

  const selectedNoteLahanName = useMemo(() => {
    if (!selectedNoteLahanId) {
      return null;
    }
    return lahanNameLookup.get(selectedNoteLahanId)?.name ?? null;
  }, [lahanNameLookup, selectedNoteLahanId]);

  useEffect(() => {
    let isCancelled = false;

    const lahanWithoutHealth = savedLahan.filter((item) => {
      if (!item.coordinates || item.coordinates.length < 3) {
        return false;
      }
      const hasSupabaseHealth = latestHealthByLahan.get(item.id);
      const overrideState = ndviOverrides[item.id];
      const isFetching = ndviFetchingMap[item.id];
      return !hasSupabaseHealth && overrideState === undefined && !isFetching;
    });

    if (lahanWithoutHealth.length === 0) {
      return () => {
        isCancelled = true;
      };
    }

    lahanWithoutHealth.forEach((lahan) => {
      const bbox = getBoundingBoxFromCoordinates(lahan.coordinates);
      if (!bbox) {
        setNdviOverrides((prev) => ({
          ...prev,
          [lahan.id]: createSyntheticNdviRecord(lahan) ?? null,
        }));
        return;
      }

      setNdviFetchingMap((prev) => ({ ...prev, [lahan.id]: true }));

      fetchNdviStatistic(bbox)
        .then((stat) => {
          if (isCancelled) {
            return;
          }
          const recordFromApi = createNdviRecordFromStatistic(lahan.id, stat);
          const fallbackRecord =
            recordFromApi ?? createSyntheticNdviRecord(lahan);
          setNdviOverrides((prev) => ({
            ...prev,
            [lahan.id]: fallbackRecord ?? null,
          }));
        })
        .catch((error) => {
          if (isCancelled) {
            return;
          }
          console.error(`❌ Gagal memproses NDVI lahan ${lahan.id}:`, error);
          setNdviOverrides((prev) => ({
            ...prev,
            [lahan.id]: createSyntheticNdviRecord(lahan) ?? null,
          }));
        })
        .finally(() => {
          if (isCancelled) {
            return;
          }
          setNdviFetchingMap((prev) => {
            const next = { ...prev };
            delete next[lahan.id];
            return next;
          });
        });
    });

    return () => {
      isCancelled = true;
    };
  }, [
    savedLahan,
    latestHealthByLahan,
    ndviOverrides,
    ndviFetchingMap,
    fetchNdviStatistic,
  ]);

  const handleOpenNoteModal = () => {
    if (!selectedNoteLahanId && savedLahan.length > 0) {
      setSelectedNoteLahanId(savedLahan[0].id);
    }
    setShowNoteModal(true);
    setIsLahanPickerVisible(false);
  };

  const closeNoteModal = () => {
    setShowNoteModal(false);
    setIsLahanPickerVisible(false);
  };

  const resetNoteForm = () => {
    setNoteTitle("");
    setNoteContent("");
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
          promptAuthSignup();
          closeNoteModal();
          return;
        }
        throw authError;
      }

      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) {
        promptAuthSignup();
        closeNoteModal();
        return;
      }

      if (editingNoteId) {
        // Update existing note
        const { data, error } = await supabase
          .from("lahan_notes")
          .update({
            title: trimmedTitle,
            content: trimmedContent,
            lahan_id: selectedNoteLahanId,
          })
          .eq("id", editingNoteId)
          .eq("user_id", userId)
          .select("id,lahan_id,title,content,created_at")
          .single();

        if (error) {
          throw error;
        }

        const updatedNote = data as LahanNoteRecord;
        setNotes((prev) =>
          prev.map((note) => (note.id === updatedNote.id ? updatedNote : note))
        );
        Alert.alert("Berhasil", "Catatan berhasil diperbarui");
      } else {
        // Create new note
        const { data, error } = await supabase
          .from("lahan_notes")
          .insert([
            {
              user_id: userId,
              lahan_id: selectedNoteLahanId,
              title: trimmedTitle,
              content: trimmedContent,
            },
          ])
          .select("id,lahan_id,title,content,created_at")
          .single();

        if (error) {
          throw error;
        }

        const newNote = data as LahanNoteRecord;
        setNotes((prev) => {
          const filtered = prev.filter((item) => item.id !== newNote.id);
          return [newNote, ...filtered];
        });
        Alert.alert("Berhasil", "Catatan berhasil disimpan");
      }
      
      resetNoteForm();
      closeNoteModal();
      setEditingNoteId(null);
      setShowEditNoteModal(false);
    } catch (error: any) {
      console.error("❌ Gagal menyimpan catatan:", error);
      const message =
        error?.message ?? "Terjadi kesalahan saat menyimpan catatan.";
      Alert.alert("Gagal menyimpan catatan", message);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleEditNote = (note: LahanNoteRecord & { lahanName: string | null }) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setSelectedNoteLahanId(note.lahan_id);
    setShowEditNoteModal(true);
  };

  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      "Hapus Catatan",
      "Apakah Anda yakin ingin menghapus catatan ini?",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: authData } = await supabase.auth.getUser();
              const userId = authData?.user?.id ?? fallbackUserId;

              const { error } = await supabase
                .from("lahan_notes")
                .delete()
                .eq("id", noteId)
                .eq("user_id", userId);

              if (error) {
                throw error;
              }

              setNotes((prev) => prev.filter((note) => note.id !== noteId));
              Alert.alert("Berhasil", "Catatan berhasil dihapus");
            } catch (error: any) {
              console.error("❌ Gagal menghapus catatan:", error);
              Alert.alert("Gagal", "Terjadi kesalahan saat menghapus catatan");
            }
          },
        },
      ]
    );
  };

  const handleEditLahan = (lahan: SavedLahanItem) => {
    setEditingLahanId(lahan.id);
    setEditLahanName(lahan.name);
    setShowEditLahanModal(true);
  };

  const handleSaveEditLahan = async () => {
    const trimmedName = editLahanName.trim();

    if (!trimmedName) {
      Alert.alert("Error", "Nama lahan tidak boleh kosong");
      return;
    }

    if (!editingLahanId) return;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? fallbackUserId;

      const { error } = await supabase
        .from("lahan")
        .update({ name: trimmedName })
        .eq("id", editingLahanId)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      setSavedLahan((prev) =>
        prev.map((item) =>
          item.id === editingLahanId ? { ...item, name: trimmedName } : item
        )
      );

      Alert.alert("Berhasil", "Nama lahan berhasil diperbarui");
      setShowEditLahanModal(false);
      setEditingLahanId(null);
      setEditLahanName("");
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
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              const { data: authData } = await supabase.auth.getUser();
              const userId = authData?.user?.id ?? fallbackUserId;

              // Delete related health records first
              await supabase
                .from("lahan_health")
                .delete()
                .eq("lahan_id", lahanId)
                .eq("user_id", userId);

              // Delete related notes
              await supabase
                .from("lahan_notes")
                .delete()
                .eq("lahan_id", lahanId)
                .eq("user_id", userId);

              // Delete the lahan
              const { error } = await supabase
                .from("lahan")
                .delete()
                .eq("id", lahanId)
                .eq("user_id", userId);

              if (error) {
                throw error;
              }

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

  const pendingArea = calculateArea(pendingPolygon);
  const formattedPendingArea = Number.isFinite(pendingArea)
    ? pendingArea.toFixed(2)
    : "0.00";
  const isNoteFormValid =
    noteTitle.trim().length > 0 && noteContent.trim().length > 0;

  return (
    <TouchableWithoutFeedback
      onPress={() => Keyboard.dismiss()}
      accessible={false}
    >
      <ThemedView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

        <ScrollView
          ref={scrollViewRef}
          style={styles.contentScroll}
          contentContainerStyle={styles.contentScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Lokasi Ladang</Text>
              <Text style={styles.headerSubtitle}>{locationLabel}</Text>
            </View>
          </View>

          <View
            style={[
              styles.mapContainer,
              drawingMode && styles.mapContainerDrawing,
            ]}
          >
            <View style={styles.searchContainer} pointerEvents="box-none">
              <View style={styles.searchInputWrapper}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari lokasi lahan..."
                  placeholderTextColor="#999999"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  onFocus={handleSearchFocus}
                  returnKeyType="search"
                />
                {isSearching ? (
                  <ActivityIndicator
                    size="small"
                    color="#4CAF50"
                    style={styles.searchSpinner}
                  />
                ) : searchQuery.length > 0 ? (
                  <TouchableOpacity
                    onPress={handleClearSearch}
                    style={styles.clearSearchButton}
                    accessibilityLabel="Hapus pencarian"
                  >
                    <Text style={styles.clearSearchText}>×</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {showSearchResults && (
                <View style={styles.searchResultsContainer}>
                  {isSearching ? (
                    <View style={styles.searchLoadingRow}>
                      <ActivityIndicator size="small" color="#4CAF50" />
                      <Text style={styles.searchLoadingText}>
                        Mencari lokasi…
                      </Text>
                    </View>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result) => (
                      <TouchableOpacity
                        key={result.id}
                        style={styles.searchResultItem}
                        onPress={() => handleSelectSearchResult(result)}
                      >
                        <Text
                          style={styles.searchResultTitle}
                          numberOfLines={1}
                        >
                          {result.label}
                        </Text>
                        {result.subtitle && (
                          <Text
                            style={styles.searchResultSubtitle}
                            numberOfLines={1}
                          >
                            {result.subtitle}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))
                  ) : searchQuery.trim().length >= 3 ? (
                    <Text style={styles.searchResultEmpty}>
                      Lokasi tidak ditemukan
                    </Text>
                  ) : null}
                </View>
              )}
            </View>

            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={userLocation}
              onPress={handleMapPress}
              onRegionChangeComplete={(region) => {
                currentRegionRef.current = region;
              }}
              onPanDrag={handleMapPanDrag}
              onTouchStart={handleMapTouchStart}
              onTouchEnd={handleMapTouchEnd}
              onTouchCancel={handleMapTouchEnd}
              provider={PROVIDER_GOOGLE}
              mapType="satellite"
              showsUserLocation
              showsMyLocationButton={false}
              showsCompass={false}
              showsScale={false}
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
                <Polygon
                  coordinates={pendingPolygon}
                  fillColor="rgba(255, 138, 101, 0.25)"
                  strokeColor="#FF7043"
                  strokeWidth={3}
                />
              )}

              {searchMarker && (
                <Marker coordinate={searchMarker} pinColor="#2E7D32" />
              )}

              {savedLahan.map((item) => {
                if (!item.coordinates || item.coordinates.length < 3) {
                  return null;
                }

                const labelIndex = Math.floor(item.coordinates.length / 2);
                const labelCoordinate =
                  item.coordinates[labelIndex] ?? item.coordinates[0];
                const paletteColor = getLahanColor(item.id);
                const cardInfo = lahanCardsById.get(item.id);
                const strokeColor =
                  cardInfo?.classification.color ?? paletteColor.stroke;
                const fillColor =
                  cardInfo?.classification.background ?? paletteColor.fill;
                const labelBackground = strokeColor;

                return (
                  <React.Fragment key={`saved-${item.id}`}>
                    <Polygon
                      coordinates={item.coordinates}
                      fillColor={fillColor}
                      strokeColor={strokeColor}
                      strokeWidth={3}
                      tappable={false}
                    />
                    {labelCoordinate && (
                      <Marker
                        coordinate={labelCoordinate}
                        anchor={{ x: 0.5, y: 0.5 }}
                        tappable={false}
                      >
                        <View
                          style={[
                            styles.savedLahanLabel,
                            { backgroundColor: labelBackground },
                          ]}
                        >
                          <Text style={styles.savedLahanLabelText}>
                            {item.name}
                          </Text>
                          {typeof item.areaHa === "number" &&
                            Number.isFinite(item.areaHa) && (
                              <Text style={styles.savedLahanLabelSubtext}>
                                {item.areaHa.toFixed(2)} ha
                              </Text>
                            )}
                        </View>
                      </Marker>
                    )}
                  </React.Fragment>
                );
              })}

              {drawingMode &&
                currentVertices.map((coordinate, index) => (
                  <Marker
                    key={`draw-vertex-${index}-${coordinate.latitude}-${coordinate.longitude}`}
                    coordinate={{ ...coordinate }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    zIndex={10 + index}
                  >
                    <View
                      style={[
                        styles.drawingVertex,
                        index === 0 && styles.startVertex,
                        index === currentVertices.length - 1 &&
                          styles.currentVertex,
                      ]}
                    />
                  </Marker>
                ))}
            </MapView>

            {drawingMode && (
              <DrawingModeIndicator
                onCancel={() => {
                  setDrawingMode(false);
                  setCurrentVertices([]);
                }}
                pointsCount={currentVertices.length}
              />
            )}

            <View
              style={[
                styles.mapControls,
                drawingMode && styles.mapControlsDrawing,
              ]}
            >
              <TouchableOpacity
                style={styles.zoomButton}
                onPress={() => handleZoom("in")}
                accessibilityLabel="Perbesar peta"
              >
                <Text style={styles.zoomText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.zoomButton}
                onPress={() => handleZoom("out")}
                accessibilityLabel="Perkecil peta"
              >
                <Text style={styles.zoomText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleRecenter}
                accessibilityLabel="Kembali ke lokasiku"
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={20}
                  color="#000000"
                />
              </TouchableOpacity>
            </View>
            {drawingMode && (
              <View style={styles.drawingControlsOverlay}>
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    styles.controlButtonNeutral,
                    activePath.length === 0 && styles.controlButtonDisabled,
                  ]}
                  onPress={undoLastPoint}
                  disabled={activePath.length === 0}
                  accessibilityLabel="Undo titik terakhir"
                >
                  <Ionicons
                    name="arrow-undo-outline"
                    size={22}
                    color={activePath.length === 0 ? "#90A4AE" : "#1C313A"}
                  />
                  <Text
                    style={[
                      styles.controlButtonText,
                      activePath.length === 0 &&
                        styles.controlButtonTextDisabled,
                    ]}
                  >
                    Undo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    styles.controlButtonNeutral,
                    redoVertices.length === 0 && styles.controlButtonDisabled,
                  ]}
                  onPress={redoLastPoint}
                  disabled={redoVertices.length === 0}
                  accessibilityLabel="Redo titik terakhir"
                >
                  <Ionicons
                    name="arrow-redo-outline"
                    size={22}
                    color={redoVertices.length === 0 ? "#90A4AE" : "#1C313A"}
                  />
                  <Text
                    style={[
                      styles.controlButtonText,
                      redoVertices.length === 0 &&
                        styles.controlButtonTextDisabled,
                    ]}
                  >
                    Redo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.controlButton, styles.controlButtonDanger]}
                  onPress={cancelDrawing}
                  accessibilityLabel="Batalkan gambar"
                >
                  <Ionicons name="close-outline" size={26} color="#B71C1C" />
                  <Text
                    style={[
                      styles.controlButtonText,
                      styles.controlButtonTextDanger,
                    ]}
                  >
                    Batal
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    styles.controlButtonPrimary,
                    activePath.length < 3 &&
                      styles.controlButtonPrimaryDisabled,
                    activePath.length < 3 && styles.controlButtonDisabled,
                  ]}
                  onPress={finishDrawing}
                  disabled={activePath.length < 3}
                  accessibilityLabel="Simpan polygon"
                >
                  <Ionicons
                    name="save-outline"
                    size={24}
                    color={activePath.length < 3 ? "#F1F8E9" : "#FFFFFF"}
                  />
                  <Text
                    style={[
                      styles.controlButtonText,
                      styles.controlButtonTextPrimary,
                      activePath.length < 3 &&
                        styles.controlButtonTextPrimaryDisabled,
                    ]}
                  >
                    Simpan
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            {filters.map((filter, index) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  index === filters.length - 1 && styles.filterButtonLast,
                  selectedFilter === filter && styles.activeFilterButton,
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === filter && styles.activeFilterText,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {drawingMode && (
            <View style={styles.instructionBanner}>
              <Text style={styles.instructionText}>
                Tap pada peta untuk menandai titik lahan.
              </Text>
              {currentVertices.length >= 3 && (
                <Text style={styles.instructionSubtext}>
                  Tekan Selesai untuk menutup polygon
                </Text>
              )}
            </View>
          )}

          <View style={styles.drawingHelperRow}>
            <TouchableOpacity
              style={styles.drawingInfoButton}
              onPress={() =>
                Alert.alert(
                  "Cara Penggambaran Lahan",
                  "1. Tekan tombol Gambar Lahan Baru.\n2. Tandai minimal tiga titik pada peta sesuai batas lahan.\n3. Tekan Simpan setelah polygon tertutup untuk menyimpan lahan.",
                  [{ text: "Mengerti" }]
                )
              }
              accessibilityLabel="Informasi cara penggambaran lahan"
            >
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#1E88E5"
                style={styles.drawingInfoButtonIcon}
              />
              <Text style={styles.drawingInfoText}>Cara penggambaran lahan</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.newFieldButton,
              drawingMode && styles.disabledButton,
            ]}
            onPress={startDrawing}
            disabled={drawingMode}
          >
            <View style={styles.cameraIcon} />
            <Text
              style={[
                styles.newFieldText,
                drawingMode && styles.disabledButtonText,
              ]}
            >
              {drawingMode ? "Mode Gambar Aktif" : "Gambar Lahan Baru"}
            </Text>
          </TouchableOpacity>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.lahanHeaderLeft}>
              <Text style={styles.sectionTitle}>Lahan Saya</Text>
              {savedLahan.length > 0 && <Text style={styles.sectionSubtitle}>{savedLahan.length} lahan</Text>}
            </View>
            {savedLahan.length > 0 && (
              <TouchableOpacity
                style={styles.editToggleButton}
                onPress={() => setShowLahanActions(!showLahanActions)}
              >
                <Ionicons
                  name={showLahanActions ? "close" : "create-outline"}
                  size={20}
                  color="#1E88E5"
                />
                <Text style={styles.editToggleButtonText}>
                  {showLahanActions ? "Selesai" : "Edit"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
           {hasLahanPagination && (
                <View style={styles.paginationContainer}>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      isPrevLahanDisabled && styles.paginationButtonDisabled,
                    ]}
                    onPress={handlePrevLahanPage}
                    disabled={isPrevLahanDisabled}
                    accessibilityLabel="Halaman sebelumnya"
                  >
                    <Text
                      style={[styles.paginationButtonText, isPrevLahanDisabled && styles.paginationButtonTextDisabled]}
                    >
                      Sebelumnya
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.paginationLabel}>
                    Halaman {lahanPageDisplay} dari {totalLahanPages}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      isNextLahanDisabled && styles.paginationButtonDisabled,
                    ]}
                    onPress={handleNextLahanPage}
                    disabled={isNextLahanDisabled}
                    accessibilityLabel="Halaman berikutnya"
                  >
                    <Text
                      style={[styles.paginationButtonText, isNextLahanDisabled && styles.paginationButtonTextDisabled]}
                    >
                      Berikutnya
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
          {savedLahan.length === 0 ? (
            <Text style={styles.sectionEmptyText}>
              Belum ada lahan tersimpan. Gunakan tombol “Gambar Lahan Baru” di atas.
            </Text>
          ) : (
            <>
              {paginatedLahanCards.map((card) => (
                <TouchableOpacity
                  key={`lahan-card-${card.id}`}
                  style={styles.lahanCard}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: '/detail-lahan-page',
                      params: {
                        id: card.id,
                        ndviKey: card.classification.key,
                        ndviScore:
                          card.latestHealth?.ndvi_score !== undefined &&
                          card.latestHealth?.ndvi_score !== null
                            ? String(card.latestHealth.ndvi_score)
                            : undefined,
                      },
                    })
                  }
                >
                  <View style={styles.lahanCardRow}>
                    <ImageBackground
                      source={card.thumbnailUrl ? { uri: card.thumbnailUrl } : DEFAULT_LAHAN_THUMBNAIL}
                      style={styles.lahanCardThumbnail}
                      imageStyle={styles.lahanCardThumbnailImage}
                      resizeMode="cover"
                    >
                      <View style={styles.lahanCardThumbnailOverlay}>
                        {!card.thumbnailUrl && (
                          <View style={styles.lahanCardThumbnailFallback}>
                            <Ionicons name="leaf-outline" size={28} color="#FFFFFF" />
                            <Text style={styles.lahanCardThumbnailFallbackText}>Foto Lahan</Text>
                          </View>
                        )}
                        <View
                          style={[
                            styles.lahanCardBadgeOverlay,
                            { backgroundColor: card.classification.color },
                          ]}
                        >
                          <Text style={styles.lahanCardBadgeOverlayText}>
                            {card.classification.title}
                          </Text>
                        </View>
                      </View>
                    </ImageBackground>
                    <View style={styles.lahanCardContent}>
                      <View style={styles.lahanCardHeader}>
                        <Text style={styles.lahanCardTitle} numberOfLines={1}>
                          {card.name}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                      </View>
                      
                      <View style={styles.lahanCardInfoRow}>
                        <View style={styles.lahanCardInfoItem}>
                          <Ionicons name="resize-outline" size={14} color="#6B7280" />
                          <Text style={styles.lahanCardInfoText}>{formatHa(card.areaHa)}</Text>
                        </View>
                        {card.createdAt && (
                          <View style={styles.lahanCardInfoItem}>
                            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                            <Text style={styles.lahanCardInfoText}>{formatYearLabel(card.createdAt)}</Text>
                          </View>
                        )}
                        <View style={styles.lahanCardInfoItem}>
                          <Ionicons name="navigate-outline" size={14} color="#6B7280" />
                          <Text style={styles.lahanCardInfoText}>{card.coordinateCount} titik</Text>
                        </View>
                      </View>

                      {card.latestHealth?.ndvi_score !== undefined && card.latestHealth?.ndvi_score !== null ? (
                        <View style={[
                          styles.lahanCardNdviContainer,
                          { 
                            backgroundColor: card.classification.background || 'rgba(16, 185, 129, 0.1)',
                            borderColor: card.classification.color,
                          }
                        ]}>
                          <View style={styles.lahanCardNdviHeader}>
                            <Ionicons name="leaf" size={14} color={card.classification.color} />
                            <Text style={[styles.lahanCardNdviLabel, { color: card.classification.color }]}>
                              Indeks NDVI
                            </Text>
                          </View>
                          <Text style={[styles.lahanCardNdviValue, { color: card.classification.color }]}>
                            {formatNdviValue(card.latestHealth.ndvi_score)}
                          </Text>
                          {card.latestHealth?.captured_at && (
                            <Text style={[styles.lahanCardNdviDate, { color: card.classification.color }]}>
                              {formatDisplayDate(card.latestHealth.captured_at)}
                            </Text>
                          )}
                        </View>
                      ) : (
                        <View style={styles.lahanCardNdviEmptyContainer}>
                          <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
                          <Text style={styles.lahanCardNdviEmptyText}>Data NDVI belum tersedia</Text>
                        </View>
                      )}

                      {card.locationLabel && (
                        <View style={styles.lahanCardLocationRow}>
                          <Ionicons name="location-outline" size={13} color="#9CA3AF" />
                          <Text style={styles.lahanCardLocationText} numberOfLines={1}>
                            {card.locationLabel}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {showLahanActions && (
                    <View style={styles.lahanCardActions}>
                      <TouchableOpacity
                        style={styles.lahanActionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleEditLahan(card);
                        }}
                      >
                        <Ionicons name="create-outline" size={20} color="#1E88E5" />
                        <Text style={styles.lahanActionButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.lahanActionButton, styles.lahanActionButtonDelete]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteLahan(card.id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF5350" />
                        <Text style={[styles.lahanActionButtonText, styles.lahanActionButtonDeleteText]}>Hapus</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
             
            </>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <View style={[styles.sectionHeaderRow, styles.lahanSummaryHeaderRow]}>
            <View style={styles.lahanSummaryCardHeader}>
              <LinearGradient
                colors={['#0022ffa6', '#0834afff', '#80f19cb6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.lahanSummarySparkleIcon}
              >
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.lahanSummaryHeaderCopy}>
                <Text style={styles.lahanSummaryChipText}>Matani AI</Text>
                <Text style={styles.lahanSummaryHeadline}>Prioritas terbaik untuk lahanmu</Text>
              </View>
            </View>
            <View style={styles.lahanSummaryActions}>
              {lahanSummaryText ? (
                <>
                  <TouchableOpacity
                    style={styles.lahanSummaryToggleButton}
                    onPress={() => setIsLahanSummaryCollapsed((prev) => !prev)}
                    accessibilityLabel={
                      isLahanSummaryCollapsed
                        ? "Tampilkan ringkasan Matani AI"
                        : "Sembunyikan ringkasan Matani AI"
                    }
                  >
                    <Ionicons
                      name={
                        isLahanSummaryCollapsed ? "chevron-down" : "chevron-up"
                      }
                      size={18}
                      color="#1B5E20"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.lahanSummaryRefreshButton,
                      styles.lahanSummaryRefreshButtonCompact,
                      (isLahanSummaryLoading || savedLahan.length === 0) && styles.lahanSummaryRefreshButtonDisabled,
                    ]}
                    disabled={isLahanSummaryLoading || savedLahan.length === 0}
                    onPress={handleRefreshSummary}
                    accessibilityLabel="Ringkaskan kondisi lahan"
                  >
                    {isLahanSummaryLoading ? (
                      <ActivityIndicator size="small" color="#1B5E20" />
                    ) : (
                      <View style={styles.lahanSummaryRefreshContent}>
                        <Ionicons name="refresh" size={18} color="#1B5E20" />
                        <Text style={styles.lahanSummaryRefreshText}>Ringkaskan</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.lahanSummaryRefreshButton,
                    (isLahanSummaryLoading || savedLahan.length === 0) && styles.lahanSummaryRefreshButtonDisabled,
                  ]}
                  disabled={isLahanSummaryLoading || savedLahan.length === 0}
                  onPress={handleRefreshSummary}
                  accessibilityLabel="Ringkaskan kondisi lahan"
                >
                  {isLahanSummaryLoading ? (
                    <ActivityIndicator size="small" color="#1B5E20" />
                  ) : (
                    <View style={styles.lahanSummaryRefreshContent}>
                      <Ionicons name="refresh" size={18} color="#1B5E20" />
                      <Text style={styles.lahanSummaryRefreshText}>Ringkaskan</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {savedLahan.length === 0 ? (
            <Text style={styles.sectionEmptyText}>
              Tambahkan lahan terlebih dahulu untuk mendapatkan ringkasan cerdas dari Matani AI.
            </Text>
          ) : isLahanSummaryLoading ? (
            <View style={styles.lahanSummaryLoadingRow}>
              <ActivityIndicator size="small" color="#1B5E20" />
              <Text style={styles.lahanSummaryLoadingText}>Matani AI sedang menganalisis lahan kamu...</Text>
            </View>
          ) : lahanSummaryError ? (
            <View style={styles.lahanSummaryErrorBox}>
              <Text style={styles.lahanSummaryErrorText}>{lahanSummaryError}</Text>
              <TouchableOpacity
                style={styles.lahanSummaryRetryButton}
                onPress={handleRefreshSummary}
                accessibilityLabel="Coba muat ringkasan lahan lagi"
              >
                <Text style={styles.lahanSummaryRetryButtonText}>Coba lagi</Text>
              </TouchableOpacity>
            </View>
          ) : lahanSummaryText ? (
            isLahanSummaryCollapsed ? (
              <Text style={styles.lahanSummaryCollapsedText}>
                Ringkasan disembunyikan. Ketuk ikon panah di header untuk melihat kembali.
              </Text>
            ) : (
              <View style={styles.lahanSummaryBubble}>
                <LinearGradient
                  colors={['#9592c404', 'rgba(195, 180, 255, 0.05)', 'rgba(159, 231, 217, 0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.lahanSummaryGalaxyOverlay}
                  pointerEvents="none"
                />
                <View style={styles.lahanSummaryContent}>
                
                  {lahanSummaryPriorities.length > 0 ? (
                    <View style={styles.lahanSummaryPriorities}>
                      {lahanSummaryPriorities.map((item, index) => {
                        const priorityConfig =
                          item.priorityNumber === 1
                            ? {
                                card: styles.lahanSummaryPriorityCardHigh,
                                badge: styles.lahanSummaryPriorityBadgeHigh,
                                badgeText: styles.lahanSummaryPriorityBadgeTextHigh,
                                text: styles.lahanSummaryPriorityTextHigh,
                                icon: 'flame' as const,
                                iconColor: '#D32F2F',
                                accentColor: '#FFEBEE',
                              }
                            : item.priorityNumber === 2
                            ? {
                                card: styles.lahanSummaryPriorityCardMedium,
                                badge: styles.lahanSummaryPriorityBadgeMedium,
                                badgeText: styles.lahanSummaryPriorityBadgeTextMedium,
                                text: styles.lahanSummaryPriorityTextMedium,
                                icon: 'alert-circle' as const,
                                iconColor: '#F57C00',
                                accentColor: '#FFF3E0',
                              }
                            : {
                                card: styles.lahanSummaryPriorityCardLow,
                                badge: styles.lahanSummaryPriorityBadgeLow,
                                badgeText: styles.lahanSummaryPriorityBadgeTextLow,
                                text: styles.lahanSummaryPriorityTextLow,
                                icon: 'checkmark-circle' as const,
                                iconColor: '#388E3C',
                                accentColor: '#E8F5E9',
                              };

                        return (
                          <View key={item.id} style={[styles.lahanSummaryPriorityCard, priorityConfig.card]}>
                            <View style={styles.lahanSummaryPriorityHeader}>
                              <View style={[styles.lahanSummaryPriorityIconWrapper, { backgroundColor: priorityConfig.accentColor }]}>
                                <Ionicons name={priorityConfig.icon} size={22} color={priorityConfig.iconColor} />
                              </View>
                              <View style={[styles.lahanSummaryPriorityBadge, priorityConfig.badge]}>
                                <Text style={[styles.lahanSummaryPriorityBadgeText, priorityConfig.badgeText]}>
                                  Prioritas {item.priorityNumber}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.lahanSummaryPriorityText, priorityConfig.text]}>
                              {item.description}
                            </Text>
                            {index < lahanSummaryPriorities.length - 1 && (
                              <View style={styles.lahanSummaryPriorityDivider} />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.lahanSummaryFallbackText}>{lahanSummaryText}</Text>
                  )}
                </View>
              </View>
            )
          ) : (
            <Text style={styles.sectionEmptyText}>
              Ringkasan belum tersedia. Ketuk Ringkaskan untuk memulai analisis atau periksa data lahan kamu.
            </Text>
          )}
        </View>
  

          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
              Status Kesehatan Tanaman
            </Text>
            <View style={styles.healthLegendGrid}>
              {NDVI_SEVERITY_CONFIG.map((item) => (
                <View
                  key={`legend-${item.key}`}
                  style={[
                    styles.healthLegendItem,
                    {
                      backgroundColor:
                        item.background ?? applyAlphaToHex(item.color, 0.12),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.healthLegendColor,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <View style={styles.healthLegendCopy}>
                    <Text
                      style={[styles.healthLegendTitle, { color: item.color }]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.healthLegendRange, { color: item.color }]}
                    >
                      NDVI {item.range}
                    </Text>
                    <Text style={styles.healthLegendDescription}>
                      {item.description}
                    </Text>
                  </View>
                  <Text style={styles.healthLegendCount}>
                    {lahanHealthSummary[item.key]} lahan
                  </Text>
                </View>
              ))}
              <View
                style={[
                  styles.healthLegendItem,
                  { backgroundColor: NDVI_UNKNOWN_CONFIG.background },
                ]}
              >
                <View
                  style={[
                    styles.healthLegendColor,
                    { backgroundColor: NDVI_UNKNOWN_CONFIG.color },
                  ]}
                />
                <View style={styles.healthLegendCopy}>
                  <Text
                    style={[
                      styles.healthLegendTitle,
                      { color: NDVI_UNKNOWN_CONFIG.color },
                    ]}
                  >
                    {NDVI_UNKNOWN_CONFIG.title}
                  </Text>
                  <Text
                    style={[
                      styles.healthLegendRange,
                      { color: NDVI_UNKNOWN_CONFIG.color },
                    ]}
                  >
                    NDVI {NDVI_UNKNOWN_CONFIG.range}
                  </Text>
                  <Text style={styles.healthLegendDescription}>
                    {NDVI_UNKNOWN_CONFIG.description}
                  </Text>
                </View>
                <Text style={styles.healthLegendCount}>
                  {lahanHealthSummary.unknown} lahan
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.sectionContainer, styles.tipsSection]}>
            <View style={styles.tipsSectionHeader}>
              <View style={styles.tipsIconContainer}>
                <View style={styles.tipsIconGradient}>
                  <Ionicons name="bulb" size={26} color="#5C6BC0" />
                </View>
              </View>
              <View style={styles.tipsSectionHeaderText}>
                <Text style={[styles.sectionTitle, styles.tipsSectionTitle]}>
                  Tips Penggunaan
                </Text>
                <Text style={styles.tipsSectionSubtitle}>
                  Maksimalkan pengalaman Anda
                </Text>
              </View>
            </View>
            <View style={styles.tipsCardsContainer}>
              <View style={styles.tipCard}>
                <View style={styles.tipCardIconWrapper}>
                  <Ionicons name="hand-left" size={20} color="#5C6BC0" />
                </View>
                <View style={styles.tipCardContent}>
                  <Text style={styles.tipCardTitle}>Interaksi Peta</Text>
                  <Text style={styles.tipCardText}>
                    Tap lahan di peta untuk melihat detail lengkap
                  </Text>
                </View>
              </View>
              <View style={styles.tipCard}>
                <View style={styles.tipCardIconWrapper}>
                  <Ionicons name="expand" size={20} color="#5C6BC0" />
                </View>
                <View style={styles.tipCardContent}>
                  <Text style={styles.tipCardTitle}>Gambar Presisi</Text>
                  <Text style={styles.tipCardText}>
                    Gunakan zoom untuk menggambar lahan lebih akurat
                  </Text>
                </View>
              </View>
              <View style={styles.tipCard}>
                <View style={styles.tipCardIconWrapper}>
                  <Ionicons name="create" size={20} color="#5C6BC0" />
                </View>
                <View style={styles.tipCardContent}>
                  <Text style={styles.tipCardTitle}>Catat Perubahan</Text>
                  <Text style={styles.tipCardText}>
                    Simpan catatan untuk melacak progress lapangan
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.notesHeaderContent}>
                <View style={styles.notesIconWrapper}>
                  <Ionicons name="document-text" size={20} color="#F57F17" />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Catatan</Text>
                  {notesWithMetadata.length > 0 && (
                    <Text style={styles.notesSubheader}>
                      {notesWithMetadata.length} catatan tersimpan
                    </Text>
                  )}
                </View>
              </View>
              {notesLoading && (
                <ActivityIndicator size="small" color="#FFD600" />
              )}
            </View>
            {notesLoading ? (
              <View style={styles.notesLoadingContainer}>
                <ActivityIndicator size="small" color="#FFD600" />
                <Text style={styles.notesLoadingText}>Memuat catatan…</Text>
              </View>
            ) : notesWithMetadata.length === 0 ? (
              <View style={styles.notesEmptyState}>
                <View style={styles.notesEmptyIconWrapper}>
                  <Ionicons name="document-outline" size={48} color="#F9A825" />
                </View>
                <Text style={styles.notesEmptyTitle}>Belum Ada Catatan</Text>
                <Text style={styles.notesEmptyText}>
                  Simpan setiap temuan penting dari lapangan agar progress selalu tercatat dengan baik.
                </Text>
              </View>
            ) : (
              <View style={styles.notesGrid}>
                {notesWithMetadata.slice(0, 6).map((note, index) => (
                  <View key={`note-${note.id}`} style={styles.noteCard}>
                    <View style={styles.noteCardHeader}>
                      <View style={styles.noteCardHeaderLeft}>
                        <View style={styles.noteNumberBadge}>
                          <Text style={styles.noteNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.noteCardHeaderInfo}>
                          <Text style={styles.noteTimestamp}>
                            <Ionicons name="time-outline" size={12} color="#F9A825" />
                            {'  '}
                            {formatDisplayDate(note.created_at)}
                          </Text>
                          {note.lahanName && (
                            <View style={styles.noteLahanBadge}>
                              <Ionicons name="location" size={11} color="#F57F17" />
                              <Text style={styles.noteLahan}>{note.lahanName}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <View style={styles.noteCardBody}>
                      <Text style={styles.noteTitle} numberOfLines={2}>
                        {note.title}
                      </Text>
                      <Text style={styles.noteContent} numberOfLines={3}>
                        {note.content}
                      </Text>
                    </View>
                    <View style={styles.noteCardFooter}>
                      <TouchableOpacity
                        style={styles.noteActionButton}
                        onPress={() => handleEditNote(note)}
                      >
                        <Ionicons name="create-outline" size={18} color="#F57F17" />
                        <Text style={styles.noteActionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.noteActionButton}
                        onPress={() => handleDeleteNote(note.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF5350" />
                        <Text style={[styles.noteActionText, { color: '#EF5350' }]}>Hapus</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.newNoteButton}
              onPress={handleOpenNoteModal}
            >
              <View style={styles.newNoteButtonIconWrapper}>
                <Ionicons name="add-circle" size={22} color="#F57F17" />
              </View>
              <Text style={styles.newNoteButtonText}>Tambah Catatan Baru</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal visible={showSaveModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Simpan Lahan</Text>
              <Text style={styles.modalSubtitle}>
                Luas: {formattedPendingArea} ha
              </Text>
              <Text style={styles.modalSubtitle}>
                {pendingPolygon.length} titik koordinat
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Nama lahan (contoh: Lahan Jagung A)"
                value={lahanName}
                onChangeText={setLahanName}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={handleCancelSave}
                >
                  <Text style={styles.modalCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSaveButton,
                    isSaving && styles.modalSaveButtonDisabled,
                  ]}
                  onPress={saveLahan}
                  disabled={isSaving}
                >
                  <Text style={styles.modalSaveText}>
                    {isSaving ? "Menyimpan..." : "Simpan"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showNoteModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.noteModalContent}>
              <View style={styles.noteModalHeader}>
                <View style={styles.noteModalHeaderIconWrapper}>
                  <Ionicons name="document-text" size={24} color="#F57F17" />
                </View>
                <View style={styles.noteModalHeaderText}>
                  <Text style={styles.modalTitle}>Catatan Baru</Text>
                  <Text style={styles.modalSubtitle}>
                    Catat hal penting dari lapangan agar tidak terlewat
                  </Text>
                </View>
              </View>

              <View style={styles.formSection}>
                <View style={styles.formFieldHeader}>
                  <Ionicons name="location-outline" size={16} color="#F57F17" />
                  <Text style={styles.formFieldLabel}>Lahan (Opsional)</Text>
                </View>
                <TouchableOpacity
                  style={styles.notePickerButton}
                  onPress={() => setIsLahanPickerVisible((prev) => !prev)}
                >
                  <Text style={styles.notePickerLabel}>
                    {selectedNoteLahanName ?? "Pilih lahan"}
                  </Text>
                  <Ionicons 
                    name={isLahanPickerVisible ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#F57F17" 
                  />
                </TouchableOpacity>

                {isLahanPickerVisible && (
                  <View style={styles.notePickerDropdown}>
                    <ScrollView
                      style={styles.notePickerList}
                      keyboardShouldPersistTaps="handled"
                    >
                      <TouchableOpacity
                        key="picker-none"
                        style={styles.notePickerOption}
                        onPress={() => handleSelectNoteLahan(null)}
                      >
                        <Text style={styles.notePickerOptionText}>
                          Tanpa lahan
                        </Text>
                      </TouchableOpacity>
                      {savedLahan.map((item) => (
                        <TouchableOpacity
                          key={`picker-${item.id}`}
                          style={styles.notePickerOption}
                          onPress={() => handleSelectNoteLahan(item.id)}
                        >
                          <Text style={styles.notePickerOptionText}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <View style={styles.formFieldHeader}>
                  <Ionicons name="text-outline" size={16} color="#F57F17" />
                  <Text style={styles.formFieldLabel}>Judul Catatan</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Contoh: Pemupukan hari ke-3"
                  value={noteTitle}
                  onChangeText={setNoteTitle}
                />
              </View>

              <View style={styles.formSection}>
                <View style={styles.formFieldHeader}>
                  <Ionicons name="create-outline" size={16} color="#F57F17" />
                  <Text style={styles.formFieldLabel}>Isi Catatan</Text>
                </View>
                <TextInput
                  style={[styles.textInput, styles.noteInput]}
                  placeholder="Tulis detail catatan Anda di sini..."
                  value={noteContent}
                  onChangeText={setNoteContent}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
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
                >
                  <Text style={styles.modalSaveText}>
                    {isSavingNote ? "Menyimpan..." : "Simpan"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showEditLahanModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.noteModalContent}>
              <Text style={styles.modalTitle}>Edit Lahan</Text>
              <Text style={styles.modalSubtitle}>
                Ubah nama lahan sesuai kebutuhan Anda.
              </Text>

              <TextInput
                style={styles.textInput}
                placeholder="Nama lahan"
                value={editLahanName}
                onChangeText={setEditLahanName}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowEditLahanModal(false);
                    setEditingLahanId(null);
                    setEditLahanName("");
                  }}
                >
                  <Text style={styles.modalCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSaveButton,
                    !editLahanName.trim() && styles.modalSaveButtonDisabled,
                  ]}
                  onPress={handleSaveEditLahan}
                  disabled={!editLahanName.trim()}
                >
                  <Text style={styles.modalSaveText}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showEditNoteModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.noteModalContent}>
              <View style={styles.noteModalHeader}>
                <View style={styles.noteModalHeaderIconWrapper}>
                  <Ionicons name="create" size={24} color="#F57F17" />
                </View>
                <View style={styles.noteModalHeaderText}>
                  <Text style={styles.modalTitle}>Edit Catatan</Text>
                  <Text style={styles.modalSubtitle}>
                    Perbarui catatan Anda
                  </Text>
                </View>
              </View>

              <View style={styles.formSection}>
                <View style={styles.formFieldHeader}>
                  <Ionicons name="location-outline" size={16} color="#F57F17" />
                  <Text style={styles.formFieldLabel}>Lahan (Opsional)</Text>
                </View>
                <TouchableOpacity
                  style={styles.notePickerButton}
                  onPress={() => setIsLahanPickerVisible((prev) => !prev)}
                >
                  <Text style={styles.notePickerLabel}>
                    {selectedNoteLahanName ?? "Pilih lahan"}
                  </Text>
                  <Ionicons 
                    name={isLahanPickerVisible ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#F57F17" 
                  />
                </TouchableOpacity>

                {isLahanPickerVisible && (
                  <View style={styles.notePickerDropdown}>
                    <ScrollView
                      style={styles.notePickerList}
                      keyboardShouldPersistTaps="handled"
                    >
                      <TouchableOpacity
                        key="picker-none"
                        style={styles.notePickerOption}
                        onPress={() => handleSelectNoteLahan(null)}
                      >
                        <Text style={styles.notePickerOptionText}>
                          Tanpa lahan
                        </Text>
                      </TouchableOpacity>
                      {savedLahan.map((item) => (
                        <TouchableOpacity
                          key={`picker-${item.id}`}
                          style={styles.notePickerOption}
                          onPress={() => handleSelectNoteLahan(item.id)}
                        >
                          <Text style={styles.notePickerOptionText}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <View style={styles.formFieldHeader}>
                  <Ionicons name="text-outline" size={16} color="#F57F17" />
                  <Text style={styles.formFieldLabel}>Judul Catatan</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Contoh: Pemupukan hari ke-3"
                  value={noteTitle}
                  onChangeText={setNoteTitle}
                />
              </View>

              <View style={styles.formSection}>
                <View style={styles.formFieldHeader}>
                  <Ionicons name="create-outline" size={16} color="#F57F17" />
                  <Text style={styles.formFieldLabel}>Isi Catatan</Text>
                </View>
                <TextInput
                  style={[styles.textInput, styles.noteInput]}
                  placeholder="Tulis detail catatan Anda di sini..."
                  value={noteContent}
                  onChangeText={setNoteContent}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowEditNoteModal(false);
                    setEditingNoteId(null);
                    resetNoteForm();
                  }}
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
                >
                  <Text style={styles.modalSaveText}>
                    {isSavingNote ? "Menyimpan..." : "Simpan"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContent: {
    paddingBottom: 32,
  },
  header: {
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#f5f5f5",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  sectionContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  lahanHeaderLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000ff",
  },
  sectionTitleSpaced: {
    marginBottom: 16,
    paddingBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#607D8B",
  },
  sectionEmptyText: {
    fontSize: 14,
    color: "#78909C",
    lineHeight: 20,
  },
  sectionLoadingText: {
    fontSize: 14,
    color: "#78909C",
  },
  mapContainer: {
    height: COLLAPSED_MAP_HEIGHT,
    minHeight: COLLAPSED_MAP_HEIGHT,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#D7CCC8",
  },
  mapContainerDrawing: {
    height: FULL_MAP_HEIGHT,
    minHeight: FULL_MAP_HEIGHT,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 0,
    backgroundColor: "#D7CCC8",
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
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333333",
  },
  searchSpinner: {
    marginLeft: 8,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  clearSearchText: {
    fontSize: 18,
    color: "#999999",
    fontWeight: "600",
  },
  searchResultsContainer: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    maxHeight: 220,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchLoadingText: {
    fontSize: 13,
    color: "#555555",
    marginLeft: 12,
  },
  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E0E0",
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
  },
  searchResultSubtitle: {
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
  },
  searchResultEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: "center",
    color: "#777777",
    fontSize: 12,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapBackground: {
    flex: 1,
    backgroundColor: "#8B7355",
    position: "relative",
  },
  fieldArea: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 3,
  },
  jagungArea: {
    top: 80,
    left: 40,
    width: 120,
    height: 100,
    backgroundColor: "rgba(139, 195, 74, 0.3)",
    borderColor: "#8BC34A",
  },
  kedelaiArea: {
    top: 200,
    right: 60,
    width: 140,
    height: 120,
    backgroundColor: "rgba(255, 152, 0, 0.3)",
    borderColor: "#FF9800",
  },
  padiArea: {
    bottom: 100,
    right: 40,
    width: 100,
    height: 80,
    backgroundColor: "rgba(244, 67, 54, 0.3)",
    borderColor: "#F44336",
  },
  fieldLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "#A5D6A7",
    borderWidth: 1,
    borderColor: "#2E7D32",
  },
  drawingSubtext: {
    fontSize: 14,
    color: "#37474F",
    fontWeight: "600",
  },
  savedLahanLabel: {
    color: "#1B5E20",
    fontWeight: "700",
    borderRadius: 8,
    minWidth: 110,
  },
  savedLahanLabelText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  savedLahanLabelSubtext: {
    color: "#E8F5E9",
    fontSize: 12,
    marginTop: 2,
  },
  mapControls: {
    position: "absolute",
    top: 132,
    right: 20,
    marginTop: 12,
  },
  mapControlsDrawing: {
    top: 116,
    right: 20,
    marginTop: 8,
  },
  zoomButton: {
    width: 40,
    height: 40,
    backgroundColor: "white",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  zoomText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  locationButton: {
    width: 40,
    height: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawingControlsOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 102,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 6,
  },
  controlButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "transparent",
  },
  controlButtonNeutral: {
    backgroundColor: "#ECEFF1",
    borderColor: "#90A4AE",
  },
  controlButtonDanger: {
    backgroundColor: "#FFCDD2",
    borderColor: "#EF5350",
  },
  controlButtonPrimary: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
  },
  controlButtonPrimaryDisabled: {
    backgroundColor: "#81C784",
    borderColor: "#81C784",
  },
  controlButtonDisabled: {
    opacity: 0.65,
  },
  controlButtonText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#102027",
  },
  controlButtonTextDanger: {
    color: "#B71C1C",
  },
  controlButtonTextPrimary: {
    color: "#FFFFFF",
  },
  controlButtonTextDisabled: {
    color: "#90A4AE",
  },
  controlButtonTextPrimaryDisabled: {
    color: "#E8F5E9",
  },
  filterScroll: {
    paddingLeft: 20,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    paddingRight: 20,
    paddingVertical: 14,
  },
  filterButton: {
    flexGrow: 0,
    flexShrink: 0,
    width: 136,
    paddingVertical: 9,
    paddingHorizontal: 0,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D7DE",
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonLast: {
    marginRight: 0,
  },
  activeFilterButton: {
    backgroundColor: "#A5D6A7",
    borderColor: "#2E7D32",
  },
  filterText: {
    fontSize: 14,
    color: "#37474F",
    fontWeight: "600",
  },
  activeFilterText: {
    color: "#1B5E20",
    fontWeight: "700",
  },
  newFieldButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C8E6C9",
    margin: 20,
    paddingVertical: 15,
    borderRadius: 25,
  },
  disabledButton: {
    backgroundColor: "#E0E0E0",
  },
  cameraIcon: {
    width: 24,
    height: 24,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    marginRight: 10,
  },
  newFieldText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  disabledButtonText: {
    color: "#616161",
  },
  lahanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  lahanCardRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  lahanCardThumbnail: {
    width: 130,
    alignSelf: 'stretch',
    minHeight: 180,
    justifyContent: 'space-between',
    alignItems: 'stretch',
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  lahanCardThumbnailImage: {
    borderRadius: 0,
  },
  lahanCardThumbnailOverlay: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  lahanCardThumbnailFallback: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  lahanCardThumbnailFallbackText: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  lahanCardBadgeOverlay: {
    alignSelf: "stretch",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  lahanCardBadgeOverlayText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  lahanCardBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  lahanCardBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  lahanCardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  lahanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lahanCardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  lahanCardInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  lahanCardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lahanCardInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 5,
  },
  lahanCardNdviContainer: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  lahanCardNdviHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  lahanCardNdviLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lahanCardNdviValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  lahanCardNdviDate: {
    fontSize: 10,
    fontWeight: '500',
  },
  lahanCardNdviEmptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lahanCardNdviEmptyText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  lahanCardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  lahanCardLocationText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 5,
    flex: 1,
    fontWeight: '500',
  },
  lahanCardSubtitle: {
    fontSize: 13,
    color: '#000000ff',
  },
  lahanCardMeta: {
    fontSize: 13,
    color: "#4E342E",
  },
  lahanCardMetaSecondary: {
    fontSize: 12,
    color: "#6D4C41",
  },
  lahanSummaryHeader: {
    flex: 1,
    paddingRight: 12,
  },
  lahanSummaryDescription: {
    fontSize: 13,
    color: '#546E7A',
    marginTop: 4,
  },
  lahanSummaryRefreshButton: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#C8E6C9',
    borderWidth: 1,
    borderColor: '#81C784',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  lahanSummaryRefreshButtonCompact: {
    marginTop: 0,
  },
  lahanSummaryRefreshButtonDisabled: {
    opacity: 0.6,
  },
  lahanSummaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lahanSummaryToggleButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    backgroundColor: '#E8F5E9',
    marginRight: 8,
  },
  lahanSummaryRefreshContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lahanSummaryRefreshText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#1B5E20',
  },
  lahanSummaryHeaderRow: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  lahanSummaryBubble: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF6',
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  lahanSummaryGalaxyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  lahanSummaryContent: {
    position: 'relative',
  },
  lahanSummaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  lahanSummarySparkleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lahanSummaryHeaderCopy: {
    flex: 1,
  },
  lahanSummaryChipText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#274FA5',
    letterSpacing: 0.4,
  },
  lahanSummaryHeadline: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2A4B',
  },
  lahanSummaryPriorities: {
    marginTop: 8,
    gap: 0,
  },
  lahanSummaryPriorityCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lahanSummaryPriorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  lahanSummaryPriorityIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  lahanSummaryPriorityCardHigh: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(211, 47, 47, 0.35)',
  },
  lahanSummaryPriorityCardMedium: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(245, 124, 0, 0.35)',
  },
  lahanSummaryPriorityCardLow: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(56, 142, 60, 0.35)',
  },
  lahanSummaryPriorityBadge: {
    flex: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  lahanSummaryPriorityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  lahanSummaryPriorityBadgeHigh: {
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.3)',
  },
  lahanSummaryPriorityBadgeTextHigh: {
    color: '#B71C1C',
  },
  lahanSummaryPriorityBadgeMedium: {
    backgroundColor: 'rgba(245, 124, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 124, 0, 0.3)',
  },
  lahanSummaryPriorityBadgeTextMedium: {
    color: '#E65100',
  },
  lahanSummaryPriorityBadgeLow: {
    backgroundColor: 'rgba(56, 142, 60, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 142, 60, 0.3)',
  },
  lahanSummaryPriorityBadgeTextLow: {
    color: '#1B5E20',
  },
  lahanSummaryPriorityText: {
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: '500',
    color: '#263238',
    letterSpacing: 0.1,
  },
  lahanSummaryPriorityTextHigh: {
    color: '#37474F',
  },
  lahanSummaryPriorityTextMedium: {
    color: '#37474F',
  },
  lahanSummaryPriorityTextLow: {
    color: '#37474F',
  },
  lahanSummaryPriorityDivider: {
    height: 1,
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  lahanSummaryFallbackText: {
    fontSize: 14.5,
    lineHeight: 23,
    color: '#37474F',
    letterSpacing: 0.1,
  },
  lahanSummaryCollapsedText: {
    marginTop: 10,
    fontSize: 13.5,
    color: '#607D8B',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  lahanSummaryLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lahanSummaryLoadingText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#607D8B',
  },
  lahanSummaryErrorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EF9A9A',
  },
  lahanSummaryErrorText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#C62828',
  },
  lahanSummaryRetryButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#C62828',
  },
  lahanSummaryRetryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  paginationLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4E342E",
  },
  paginationButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
  },
  paginationButtonDisabled: {
    backgroundColor: "#E0F2F1",
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  paginationButtonTextDisabled: {
    color: "#2E7D32",
    opacity: 0.7,
  },
  healthLegendGrid: {
    flexDirection: "column",
  },
  healthLegendItem: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  healthLegendColor: {
    width: 14,
    height: 42,
    borderRadius: 8,
    marginRight: 12,
  },
  healthLegendCopy: {
    flex: 1,
  },
  healthLegendTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  healthLegendRange: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  healthLegendDescription: {
    fontSize: 12,
    color: "#546E7A",
  },
  healthLegendCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#37474F",
  },
  tipsSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  tipsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tipsIconContainer: {
    marginRight: 14,
  },
  tipsIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EAF6',
    borderWidth: 2,
    borderColor: '#C5CAE9',
  },
  tipsSectionHeaderText: {
    flex: 1,
  },
  tipsSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 4,
  },
  tipsSectionSubtitle: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
  },
  tipsCardsContainer: {
    gap: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  tipCardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tipCardContent: {
    flex: 1,
  },
  tipCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  tipCardText: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 19,
  },
  tipBullet: {
    fontSize: 13,
    color: "#37474F",
    marginBottom: 4,
  },
  notesHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notesIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF9C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  notesSubheader: {
    fontSize: 12,
    color: '#F57F17',
    marginTop: 2,
    fontWeight: '600',
  },
  notesLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  notesLoadingText: {
    marginLeft: 12,
    fontSize: 13,
    color: '#F57F17',
  },
  notesEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: '#FFFDE7',
    borderRadius: 16,
  },
  notesEmptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#FFF9C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  notesEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F57F17',
    marginBottom: 8,
  },
  notesEmptyText: {
    fontSize: 14,
    color: '#d38e20ff',
    textAlign: 'center',
    lineHeight: 21,
  },
  notesGrid: {
    marginTop: 4,
  },
  noteCard: {
    backgroundColor: '#fffef180',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD600',
    shadowColor: '#F9A825',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  noteCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  noteNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFF9C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  noteNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F57F17',
  },
  noteCardHeaderInfo: {
    flex: 1,
  },
  noteTimestamp: {
    fontSize: 11,
    color: '#F9A825',
    fontWeight: '600',
    marginBottom: 4,
  },
  noteLahanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  noteLahan: {
    fontSize: 11,
    color: '#F57F17',
    fontWeight: '700',
    marginLeft: 4,
  },
  noteCardBody: {
    marginBottom: 10,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#793f0cff',
    marginBottom: 8,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  noteContent: {
    fontSize: 14,
    color: '#ce8a1eff',
    lineHeight: 21,
  },
  noteCardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#FFF59D',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  newNoteButton: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#FFF9C4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#FFE082',
    shadowColor: '#F9A825',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  newNoteButtonIconWrapper: {
    marginRight: 8,
  },
  newNoteButtonText: {
    fontSize: 15,
    color: '#F57F17',
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: width * 0.8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  modalCancelButton: {
    backgroundColor: "#ccc",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  modalCancelText: {
    color: "#333",
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
    color: "white",
    fontWeight: "bold",
  },
  noteModalContent: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 16,
    width: width * 0.88,
    maxHeight: height * 0.85,
  },
  noteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  noteModalHeaderIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF9C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  noteModalHeaderText: {
    flex: 1,
  },
  formSection: {
    marginBottom: 20,
  },
  formFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  formFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57F17',
    marginLeft: 6,
  },
  notePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFDE7',
  },
  notePickerLabel: {
    fontSize: 14,
    color: '#F57F17',
    flex: 1,
  },
  notePickerDropdown: {
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 12,
    maxHeight: 180,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#F9A825',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  noteInput: {
    minHeight: 120,
  },
  drawingCursor: {
    width: 20,
    height: 20,
    backgroundColor: "#FF5722",
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawingVertex: {
    width: 12,
    height: 12,
    backgroundColor: "#FF5722",
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "white",
  },
  startVertex: {
    backgroundColor: "#4CAF50",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 4,
  },
  currentVertex: {
    backgroundColor: "#FFD54F",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#FF5722",
    elevation: 5,
  },
  instructionBanner: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginVertical: 8,
    alignItems: "center",
  },
  instructionText: {
    color: "#2E7D32",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  instructionSubtext: {
    color: "#455A64",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  drawingHelperRow: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 6,
  },
  drawingInfoButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
  },
  drawingInfoButtonIcon: {
    marginRight: 6,
  },
  drawingInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1565C0',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  // Empty State Styles
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    backgroundColor: "#F5F5F5",
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#263238",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateDescription: {
    fontSize: 16,
    color: "#607D8B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateCTA: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 40,
  },
  emptyStateCTAText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyStateStepsContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateStepsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#263238",
    marginBottom: 16,
    textAlign: "center",
  },
  emptyStateStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  emptyStateStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emptyStateStepNumberText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyStateStepContent: {
    flex: 1,
    paddingTop: 4,
  },
  emptyStateStepText: {
    fontSize: 15,
    color: "#263238",
    lineHeight: 22,
  },
  // Drawing Mode Indicator
  drawingModeIndicator: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: "#FF5722",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  drawingModeIndicatorText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  drawingModeIndicatorClose: {
    padding: 4,
  },
  editToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  editToggleButtonText: {
    fontSize: 13,
    color: '#1E88E5',
    marginLeft: 4,
    fontWeight: '500',
  },
  lahanCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
  },
  lahanActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  lahanActionButtonDelete: {
    backgroundColor: '#FFEBEE',
  },
  lahanActionButtonText: {
    fontSize: 13,
    color: '#1E88E5',
    marginLeft: 4,
    fontWeight: '500',
  },
  lahanActionButtonDeleteText: {
    color: '#EF5350',
  },
  noteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#FFF9C4',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  noteActionText: {
    fontSize: 13,
    color: '#F57F17',
    marginLeft: 4,
    fontWeight: '700',
  },
});

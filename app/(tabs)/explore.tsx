import { ThemedView } from '@/components/themed-view';
import { NDVI_SEVERITY_CONFIG, NDVI_UNKNOWN_CONFIG, classifyNdviStatus, formatNdviValue, type NdviClassification, type NdviClassificationKey } from '@/constants/ndvi';
import { BASE_URL } from '@/hooks/config';
import { LahanWithInfo, lahanService, supabase } from '@/hooks/supabase';
import { computeSyntheticNdviForPolygon } from '@/utils/ndvi-simulator';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import MapView, { LatLng, MapPressEvent, Marker, PROVIDER_GOOGLE, Polygon, Polyline, Region } from 'react-native-maps';

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

const { width } = Dimensions.get('window');
const MAP_HEIGHT = Math.max(320, Math.min(width * 1.15, 520));
const NDVI_BBOX_PADDING = 0.0004;
const LAHAN_PAGE_SIZE = 5;

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
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }
  return value.toFixed(4);
};

const LAHAN_COLOR_PALETTE = [
  { stroke: '#2E7D32', fill: 'rgba(76, 175, 80, 0.22)' },
  { stroke: '#F57C00', fill: 'rgba(255, 183, 77, 0.22)' },
  { stroke: '#7B1FA2', fill: 'rgba(186, 104, 200, 0.24)' },
  { stroke: '#0288D1', fill: 'rgba(144, 202, 249, 0.24)' },
  { stroke: '#C2185B', fill: 'rgba(244, 143, 177, 0.24)' },
  { stroke: '#00897B', fill: 'rgba(165, 214, 167, 0.24)' },
];

const clampDeltaValue = (value: number) => Math.min(Math.max(value, 0.0005), 1.8);

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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const ensureSpread = (minValue: number, maxValue: number, minimumSpread: number, lowerBound: number, upperBound: number) => {
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

const getBoundingBoxFromCoordinates = (coordinates: LatLng[]): [number, number, number, number] | null => {
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

  if (!Number.isFinite(minLat) || !Number.isFinite(minLon) || !Number.isFinite(maxLat) || !Number.isFinite(maxLon)) {
    return null;
  }

  const paddedMinLat = clamp(minLat - NDVI_BBOX_PADDING, -90, 90);
  const paddedMinLon = clamp(minLon - NDVI_BBOX_PADDING, -180, 180);
  const paddedMaxLat = clamp(maxLat + NDVI_BBOX_PADDING, -90, 90);
  const paddedMaxLon = clamp(maxLon + NDVI_BBOX_PADDING, -180, 180);

  const [adjustedMinLat, adjustedMaxLat] = ensureSpread(paddedMinLat, paddedMaxLat, 0.0008, -90, 90);
  const [adjustedMinLon, adjustedMaxLon] = ensureSpread(paddedMinLon, paddedMaxLon, 0.0008, -180, 180);

  return [adjustedMinLon, adjustedMinLat, adjustedMaxLon, adjustedMaxLat];
};

const createNdviRecordFromStatistic = (lahanId: string, stat: NdviStatistic | null): LahanHealthRecord | null => {
  if (!stat || typeof stat.ndvi_mean !== 'number' || Number.isNaN(stat.ndvi_mean)) {
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

const createSyntheticNdviRecord = (lahan: SavedLahanItem): LahanHealthRecord | null => {
  if (!Array.isArray(lahan.coordinates) || lahan.coordinates.length === 0) {
    return null;
  }

  const synthetic = computeSyntheticNdviForPolygon(lahan.coordinates, lahan.areaHa ?? null);
  if (!synthetic) {
    return null;
  }

  const ndviScore = Number(synthetic.ndviCurrent.toFixed(2));
  const latestHistory = synthetic.ndviHistory.at(-1);

  return {
    id: `ndvi-synthetic-${lahan.id}`,
    lahan_id: lahan.id,
    ndvi_score: ndviScore,
    status: 'synthetic',
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
    .padStart(2, '0');
  return `${hex}${alphaValue}`;
};

const lightenHex = (hex: string, intensity: number) => {
  const normalised = Math.max(0, Math.min(intensity, 1));
  const parsed = hex.replace('#', '').trim();
  const expanded = parsed.length === 3
    ? parsed.split('').map((char) => `${char}${char}`).join('')
    : parsed;

  const numeric = parseInt(expanded, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;

  const mix = (channel: number) => Math.round(channel + (255 - channel) * normalised);
  const next = (mix(r) << 16) | (mix(g) << 8) | mix(b);

  return `#${next.toString(16).padStart(6, '0')}`;
};

const getThumbnailGradient = (classification: NdviClassification) => {
  const primary = classification.color;
  const soft = lightenHex(primary, 0.55);
  const medium = lightenHex(primary, 0.25);
  return [soft, medium, primary] as const;
};

const formatDisplayDate = (value?: string | null) => {
  const time = parseDateToTime(value ?? undefined);
  if (!time) {
    return 'Baru';
  }

  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return formatter.format(time);
  } catch {
    return new Date(time).toISOString().split('T')[0];
  }
};

const formatHa = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }
  return `${value.toFixed(2)} ha`;
};

const formatYearLabel = (value?: string | null) => {
  const time = parseDateToTime(value ?? undefined);
  if (!time) {
    return 'Lahan baru';
  }
  return `Sejak ${new Date(time).getFullYear()}`;
};

const formatGeocodedLocation = (place?: Location.LocationGeocodedAddress | null) => {
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
      (existing) => existing.localeCompare(normalised, undefined, { sensitivity: 'accent', usage: 'search' }) === 0
    );
    if (!alreadyIncluded) {
      uniqueParts.push(normalised);
    }
  });

  if (uniqueParts.length === 0) {
    return null;
  }

  return uniqueParts.slice(0, 3).join(', ');
};

export default function ExploreScreen() {
  const router = useRouter();
  const fallbackUserId = process.env.EXPO_PUBLIC_SUPABASE_DEFAULT_USER_ID;
  const [selectedFilter, setSelectedFilter] = useState('NDVI');
  const [drawingMode, setDrawingMode] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [lahanName, setLahanName] = useState('');
  const [currentVertices, setCurrentVertices] = useState<LatLng[]>([]);
  const [pendingPolygon, setPendingPolygon] = useState<LatLng[]>([]);

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
  const [lahanLocationLabels, setLahanLocationLabels] = useState<Record<string, string | null>>({});
  const [lahanPage, setLahanPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchMarker, setSearchMarker] = useState<LatLng | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lahanHealth, setLahanHealth] = useState<LahanHealthRecord[]>([]);
  const [notes, setNotes] = useState<LahanNoteRecord[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [selectedNoteLahanId, setSelectedNoteLahanId] = useState<string | null>(null);
  const [isLahanPickerVisible, setIsLahanPickerVisible] = useState(false);
  const [ndviOverrides, setNdviOverrides] = useState<Record<string, LahanHealthRecord | null | undefined>>({});
  const [ndviFetchingMap, setNdviFetchingMap] = useState<Record<string, boolean>>({});
  const mapRef = useRef<MapView>(null);
  const currentRegionRef = useRef<Region | null>(null);
  const [userLocation, setUserLocation] = useState({
    latitude: -6.2088,
    longitude: 106.8456,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [locationLabel, setLocationLabel] = useState('Menentukan lokasi...');

  const filters = ['NDVI', 'Kontras NDVI', 'Pengendapan', 'Tanah'];

  const promptAuthSignup = useCallback(() => {
    Alert.alert(
      'Perlu Akun',
      'Kami akan membuka halaman daftar supaya kamu bisa menyimpan lahan.',
      [
        {
          text: 'Buka Halaman Daftar',
          onPress: () => router.push('/auth/signup'),
        },
      ],
      { cancelable: true }
    );
  }, [router]);

  const toLatLngCoordinates = useCallback((geojson: any): LatLng[] => {
    if (!geojson) return [];

    const parsed = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
    const ring: number[][] = parsed?.coordinates?.[0] ?? [];
    if (!Array.isArray(ring)) return [];

    const withoutClosingPoint = ring.slice(0, ring.length > 1 ? -1 : ring.length);
    return withoutClosingPoint.map(point => ({
      latitude: point[1],
      longitude: point[0],
    }));
  }, []);

  const loadSavedLahan = useCallback(async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? '';
        if (message.includes('Auth session missing')) {
          return;
        }
        throw authError;
      }

      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) {
        return;
      }

      const lahanList = (await lahanService.getLahanByUser(userId)) as LahanWithInfo[];
      if (!Array.isArray(lahanList)) {
        return;
      }

      const mapped = lahanList
        .map(item => ({
          id: item.id,
          name: item.name,
          coordinates: toLatLngCoordinates(item.geojson),
          areaHa: item.area_ha,
          createdAt: item.created_at ?? null,
        }))
        .filter(item => item.coordinates.length >= 3);

      mapped.sort((a, b) => parseDateToTime(b.createdAt) - parseDateToTime(a.createdAt));

      setSavedLahan(mapped);
    } catch (error) {
      console.error('❌ Gagal memuat data lahan:', error);
    }
  }, [fallbackUserId, toLatLngCoordinates]);

  const loadLahanHealth = useCallback(async (targetIds: string[]) => {
    if (!Array.isArray(targetIds) || targetIds.length === 0) {
      setLahanHealth([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('lahan_health')
        .select('id,lahan_id,ndvi_score,status,captured_at,created_at')
        .in('lahan_id', targetIds)
        .order('captured_at', { ascending: false, nullsFirst: true })
        .order('created_at', { ascending: false, nullsFirst: true });

      if (error) {
        throw error;
      }

      setLahanHealth(Array.isArray(data) ? (data as LahanHealthRecord[]) : []);
    } catch (error) {
      console.error('❌ Gagal memuat kesehatan lahan:', error);
      setLahanHealth([]);
    }
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      setNotesLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? '';
        if (message.includes('Auth session missing')) {
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
        .from('lahan_notes')
        .select('id,lahan_id,title,content,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      setNotes(Array.isArray(data) ? (data as LahanNoteRecord[]) : []);
    } catch (error) {
      console.error('❌ Gagal memuat catatan:', error);
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [fallbackUserId]);

  const getCurrentLocation = useCallback(async () => {
    try {
      console.log('📍 Requesting location permission...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Location permission denied');
        Alert.alert('Permission Denied', 'Lokasi diperlukan untuk menampilkan peta');
        setLocationLabel('Izin lokasi belum diberikan');
        return;
      }

      console.log('✅ Getting current position...');
      let location = await Location.getCurrentPositionAsync({});
      console.log(`📍 User location: ${location.coords.latitude}, ${location.coords.longitude}`);
      
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
            `Lat ${location.coords.latitude.toFixed(2)}, Lon ${location.coords.longitude.toFixed(2)}`
        );
      } catch (reverseError) {
        console.warn('Reverse geocode gagal', reverseError);
        setLocationLabel(
          `Lat ${location.coords.latitude.toFixed(2)}, Lon ${location.coords.longitude.toFixed(2)}`
        );
      }
    } catch (error) {
      console.error('❌ Location error:', error);
      Alert.alert('Error', 'Gagal mendapatkan lokasi');
      setLocationLabel('Lokasi tidak diketahui');
    }
  }, []);

  useEffect(() => {
    getCurrentLocation();
    loadSavedLahan();
  }, [getCurrentLocation, loadSavedLahan]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

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
        const endpoint = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`;
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'MataniApp/1.0 (https://matani.app)',
            'Accept-Language': 'id,en',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Gagal mencari lokasi');
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
              label: item?.display_name ?? subtitleParts[0] ?? 'Lokasi tanpa nama',
              subtitle: subtitleParts.length > 0 ? subtitleParts.join(', ') : undefined,
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
        console.error('❌ Gagal mencari lokasi:', error);
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
          console.warn('❌ Gagal reverse geocode lahan:', lahan.id, error);
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
      console.warn('❌ Invalid coordinate from map press:', rawCoordinate);
      return;
    }

    const coordinate: LatLng = {
      latitude: Number(lat.toFixed(7)),
      longitude: Number(lon.toFixed(7)),
    };

    setCurrentVertices((prev) => [...prev, coordinate]);
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
    setSearchQuery('');
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

    setUserLocation(prev => ({
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

  const fetchNdviStatistic = useCallback(async (bbox: [number, number, number, number]): Promise<NdviStatistic | null> => {
    const bboxKey = bbox.map((value) => value.toFixed(6)).join(',');

    if (ndviStatisticCache.has(bboxKey)) {
      return ndviStatisticCache.get(bboxKey) ?? null;
    }

    if (ndviStatisticInflight.has(bboxKey)) {
      return ndviStatisticInflight.get(bboxKey) ?? null;
    }

    const request = (async () => {
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('bbox', bboxKey);

        const response = await fetch(`${BASE_URL}/ndvi?${searchParams.toString()}`);
        if (!response.ok) {
          throw new Error(`NDVI request failed with status ${response.status}`);
        }

        const payload = await response.json();
        if (!Array.isArray(payload) || payload.length === 0) {
          ndviStatisticCache.set(bboxKey, null);
          return null;
        }

        const latestEntry = payload[payload.length - 1] as Partial<NdviStatistic>;
        if (typeof latestEntry?.ndvi_mean !== 'number' || Number.isNaN(latestEntry.ndvi_mean)) {
          ndviStatisticCache.set(bboxKey, null);
          return null;
        }

        const result: NdviStatistic = {
          interval:
            typeof latestEntry.interval === 'string'
              ? latestEntry.interval
              : new Date().toISOString().split('T')[0],
          ndvi_mean: latestEntry.ndvi_mean,
          ndvi_min:
            typeof latestEntry.ndvi_min === 'number' ? latestEntry.ndvi_min : latestEntry.ndvi_mean,
          ndvi_max:
            typeof latestEntry.ndvi_max === 'number' ? latestEntry.ndvi_max : latestEntry.ndvi_mean,
          ndvi_stdev:
            typeof latestEntry.ndvi_stdev === 'number' ? latestEntry.ndvi_stdev : 0,
        };

        ndviStatisticCache.set(bboxKey, result);
        return result;
      } catch (error) {
        const count = (ndviStatisticErrorCount.get(bboxKey) ?? 0) + 1;
        ndviStatisticErrorCount.set(bboxKey, count);
        if (__DEV__ && count <= 3) {
          console.warn('⚠️ NDVI fetch fallback akan digunakan:', error);
        }
        ndviStatisticCache.set(bboxKey, null);
        return null;
      } finally {
        ndviStatisticInflight.delete(bboxKey);
      }
    })();

    ndviStatisticInflight.set(bboxKey, request);
    return request;
  }, []);

  const handleZoom = useCallback(
    (direction: 'in' | 'out') => {
      const baseRegion = currentRegionRef.current ?? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: userLocation.latitudeDelta,
        longitudeDelta: userLocation.longitudeDelta,
      };

      const factor = direction === 'in' ? 0.6 : 1.6;
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
    setSearchMarker(null);
    getCurrentLocation();
  }, [animateToRegion, getCurrentLocation, userLocation]);

  const startDrawing = () => {
    setDrawingMode(true);
    setShowSaveModal(false);
    setLahanName('');
    clearActivePath();
    Alert.alert(
      'Mode Gambar Aktif', 
      'Tap pada peta untuk menandai titik-titik polygon.'
    );
  };

  const finishDrawing = () => {
    if (activePath.length < 3) {
      Alert.alert('Error', 'Minimal 3 titik diperlukan untuk membuat polygon lahan.');
      return;
    }

    const completedPath = activePath.map((coord) => ({ ...coord }));
    setPendingPolygon(completedPath);
    setDrawingMode(false);
    setShowSaveModal(true);
  };

  const cancelDrawing = () => {
    setDrawingMode(false);
    setShowSaveModal(false);
    setLahanName('');
    clearActivePath();
  };

  const undoLastPoint = () => {
    setCurrentVertices((prevPath) => {
      if (prevPath.length <= 1) {
        return [];
      }
      return prevPath.slice(0, -1);
    });
  };

  const saveLahan = async () => {
    const trimmedName = lahanName.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Nama lahan tidak boleh kosong');
      return;
    }

    if (pendingPolygon.length < 3) {
      Alert.alert('Error', 'Polygon lahan belum lengkap untuk disimpan.');
      return;
    }

    if (isSaving) {
      return;
    }
    
    const polygonToPersist = [...pendingPolygon];
    const area = calculateArea(polygonToPersist);
    
    try {
      setIsSaving(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? '';
        if (message.includes('Auth session missing')) {
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

      console.log('💾 Saving lahan to Supabase:', {
        name: trimmedName,
        coordinates: polygonToPersist,
        area,
        userId,
      });

      const savedEntry = await lahanService.saveLahan(
        trimmedName,
        polygonToPersist,
        userId,
        area
      );

      console.log('✅ Lahan saved response:', savedEntry);

      const savedArea = Number(savedEntry?.area_ha ?? area);
      const areaText = Number.isFinite(savedArea) ? savedArea.toFixed(2) : area.toFixed(2);

      const newSavedLahan: SavedLahanItem = {
        id: savedEntry?.id ?? `local-${Date.now()}`,
        name: trimmedName,
        coordinates: polygonToPersist,
        areaHa: savedArea,
        createdAt: savedEntry?.created_at ?? new Date().toISOString(),
      };

      setSavedLahan(prev => {
        const filtered = prev.filter(item => item.id !== newSavedLahan.id);
        return [...filtered, newSavedLahan];
      });

      loadSavedLahan();

    setShowSaveModal(false);
    setLahanName('');
    clearActivePath();
      Alert.alert('Sukses', `Lahan "${trimmedName}" berhasil disimpan!\nLuas: ${areaText} ha`);
    } catch (error: any) {
      console.error('❌ Gagal menyimpan lahan:', error);
      const message = error?.message === 'USER_ID_REQUIRED'
        ? 'ID pengguna tidak ditemukan. Pastikan Anda sudah login.'
        : error?.message || 'Terjadi kesalahan saat menyimpan lahan.';
      Alert.alert('Gagal', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSave = () => {
    setShowSaveModal(false);
    setLahanName('');
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

      const recordTime = Math.max(parseDateToTime(record.captured_at), parseDateToTime(record.created_at));
      const existingTime = Math.max(parseDateToTime(existing.captured_at), parseDateToTime(existing.created_at));

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
      const override = ndviOverrides[item.id];
      const latestHealth = supabaseHealth ?? (override !== undefined ? (override ?? undefined) : undefined);
      const classification = classifyNdviStatus(latestHealth?.ndvi_score ?? null, latestHealth?.status ?? null);
      const centroid = computePolygonCentroid(item.coordinates ?? []);
      return {
        ...item,
        latestHealth,
        classification,
        centroid,
        coordinateCount: Array.isArray(item.coordinates) ? item.coordinates.length : 0,
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
  const lahanPageDisplay = totalLahanPages === 0 ? 0 : Math.min(lahanPage + 1, totalLahanPages);
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
  const isNextLahanDisabled = totalLahanPages === 0 || lahanPage >= Math.max(totalLahanPages - 1, 0);

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

  const notesWithMetadata = useMemo(() => {
    return notes.map((note) => ({
      ...note,
      lahanName: note.lahan_id ? lahanNameLookup.get(note.lahan_id)?.name ?? null : null,
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
          const fallbackRecord = recordFromApi ?? createSyntheticNdviRecord(lahan);
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
  }, [savedLahan, latestHealthByLahan, ndviOverrides, ndviFetchingMap, fetchNdviStatistic]);

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
    setNoteTitle('');
    setNoteContent('');
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
      Alert.alert('Catatan belum lengkap', 'Judul dan isi catatan wajib diisi.');
      return;
    }

    if (isSavingNote) {
      return;
    }

    try {
      setIsSavingNote(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? '';
        if (message.includes('Auth session missing')) {
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

      const { data, error } = await supabase
        .from('lahan_notes')
        .insert([
          {
            user_id: userId,
            lahan_id: selectedNoteLahanId,
            title: trimmedTitle,
            content: trimmedContent,
          },
        ])
        .select('id,lahan_id,title,content,created_at')
        .single();

      if (error) {
        throw error;
      }

      const newNote = data as LahanNoteRecord;
      setNotes((prev) => {
        const filtered = prev.filter((item) => item.id !== newNote.id);
        return [newNote, ...filtered];
      });
      resetNoteForm();
      closeNoteModal();
    } catch (error: any) {
      console.error('❌ Gagal menyimpan catatan:', error);
      const message = error?.message ?? 'Terjadi kesalahan saat menyimpan catatan.';
      Alert.alert('Gagal menyimpan catatan', message);
    } finally {
      setIsSavingNote(false);
    }
  };

  const pendingArea = calculateArea(pendingPolygon);
  const formattedPendingArea = Number.isFinite(pendingArea) ? pendingArea.toFixed(2) : '0.00';
  const isNoteFormValid = noteTitle.trim().length > 0 && noteContent.trim().length > 0;

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
      <ThemedView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Lokasi Ladang</Text>
            <Text style={styles.headerSubtitle}>{locationLabel}</Text>
          </View>
        </View>

        <View style={styles.mapContainer}>
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
                <ActivityIndicator size="small" color="#4CAF50" style={styles.searchSpinner} />
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
                    <Text style={styles.searchLoadingText}>Mencari lokasi…</Text>
                  </View>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <TouchableOpacity
                      key={result.id}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectSearchResult(result)}
                    >
                      <Text style={styles.searchResultTitle} numberOfLines={1}>
                        {result.label}
                      </Text>
                      {result.subtitle && (
                        <Text style={styles.searchResultSubtitle} numberOfLines={1}>
                          {result.subtitle}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : searchQuery.trim().length >= 3 ? (
                  <Text style={styles.searchResultEmpty}>Lokasi tidak ditemukan</Text>
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

            {searchMarker && <Marker coordinate={searchMarker} pinColor="#2E7D32" />}

            {savedLahan.map((item) => {
              if (!item.coordinates || item.coordinates.length < 3) {
                return null;
              }

              const labelIndex = Math.floor(item.coordinates.length / 2);
              const labelCoordinate = item.coordinates[labelIndex] ?? item.coordinates[0];
              const paletteColor = getLahanColor(item.id);
              const cardInfo = lahanCardsById.get(item.id);
              const strokeColor = cardInfo?.classification.color ?? paletteColor.stroke;
              const fillColor = cardInfo?.classification.background ?? paletteColor.fill;
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
                    <Marker coordinate={labelCoordinate} anchor={{ x: 0.5, y: 0.5 }} tappable={false}>
                      <View style={[styles.savedLahanLabel, { backgroundColor: labelBackground }]}
                      >
                        <Text style={styles.savedLahanLabelText}>{item.name}</Text>
                        {typeof item.areaHa === 'number' && Number.isFinite(item.areaHa) && (
                          <Text style={styles.savedLahanLabelSubtext}>{item.areaHa.toFixed(2)} ha</Text>
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
                      index === currentVertices.length - 1 && styles.currentVertex,
                    ]}
                  />
                </Marker>
              ))}
          </MapView>

          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.zoomButton} onPress={() => handleZoom('in')} accessibilityLabel="Perbesar peta">
              <Text style={styles.zoomText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomButton} onPress={() => handleZoom('out')} accessibilityLabel="Perkecil peta">
              <Text style={styles.zoomText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.locationButton} onPress={handleRecenter} accessibilityLabel="Kembali ke lokasiku">
              <View style={styles.locationIcon} />
            </TouchableOpacity>
          </View>
        </View>

        {drawingMode && (
          <View style={styles.drawingControls}>
            <TouchableOpacity style={styles.controlButton} onPress={undoLastPoint}>
              <Text style={styles.controlButtonText}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={cancelDrawing}>
              <Text style={styles.controlButtonText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.finishButton} onPress={finishDrawing}>
              <Text style={styles.finishButtonText}>Selesai ({currentVertices.length} titik)</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.filterContainer}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterButton, selectedFilter === filter && styles.activeFilterButton]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[styles.filterText, selectedFilter === filter && styles.activeFilterText]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {drawingMode && (
          <View style={styles.instructionBanner}>
            <Text style={styles.instructionText}>Tap pada peta untuk menandai titik lahan.</Text>
            {currentVertices.length >= 3 && (
              <Text style={styles.instructionSubtext}>Tekan Selesai untuk menutup polygon</Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.newFieldButton, drawingMode && styles.disabledButton]}
          onPress={startDrawing}
          disabled={drawingMode}
        >
          <View style={styles.cameraIcon} />
          <Text style={styles.newFieldText}>{drawingMode ? 'Mode Gambar Aktif' : 'Gambar Lahan Baru'}</Text>
        </TouchableOpacity>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Lahan Saya</Text>
            {savedLahan.length > 0 && <Text style={styles.sectionSubtitle}>{savedLahan.length} lahan</Text>}
          </View>
          {savedLahan.length === 0 ? (
            <Text style={styles.sectionEmptyText}>
              Belum ada lahan tersimpan. Gunakan tombol “Gambar Lahan Baru” di atas.
            </Text>
          ) : (
            <>
              {paginatedLahanCards.map((card) => (
                <TouchableOpacity
                  key={`lahan-card-${card.id}`}
                  style={[
                    styles.lahanCard,
                    {
                      backgroundColor:
                        card.classification.background ?? applyAlphaToHex(card.classification.color, 0.12),
                    },
                  ]}
                  activeOpacity={0.9}
                  onPress={() => router.push({ pathname: '/detail-lahan-page', params: { id: card.id } })}
                >
                  <View style={styles.lahanCardRow}>
                    <LinearGradient
                      colors={getThumbnailGradient(card.classification)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.lahanCardThumbnail}
                    />
                    <View style={styles.lahanCardContent}>
                      <View
                        style={[
                          styles.lahanCardBadge,
                          {
                            borderColor: card.classification.color,
                            backgroundColor:
                              card.classification.background ?? applyAlphaToHex(card.classification.color, 0.12),
                          },
                        ]}
                      >
                        <Text style={[styles.lahanCardBadgeText, { color: card.classification.color }]}>
                          {card.classification.title}
                        </Text>
                      </View>
                      <Text style={styles.lahanCardTitle}>{card.name}</Text>
                      <Text style={styles.lahanCardSubtitle}>
                        {formatHa(card.areaHa)}
                        {card.createdAt ? ` · ${formatYearLabel(card.createdAt)}` : ''}
                      </Text>
                      {card.latestHealth?.ndvi_score !== undefined && card.latestHealth?.ndvi_score !== null ? (
                        <Text style={styles.lahanCardMeta}>
                          NDVI {formatNdviValue(card.latestHealth.ndvi_score)}
                        </Text>
                      ) : (
                        <Text style={styles.lahanCardMeta}>Belum ada data NDVI terbaru</Text>
                      )}
                      <Text style={styles.lahanCardMetaSecondary}>
                        Titik {card.coordinateCount}
                        {card.locationLabel
                          ? ` · ${card.locationLabel}`
                          : card.centroid
                            ? ` · ${formatCoordinateValue(card.centroid.latitude)}, ${formatCoordinateValue(card.centroid.longitude)}`
                            : ''}
                      </Text>
                      {card.latestHealth?.captured_at && (
                        <Text style={styles.lahanCardMetaSecondary}>
                          Data diambil {formatDisplayDate(card.latestHealth.captured_at)}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
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
            </>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Status Kesehatan Tanaman</Text>
          <View style={styles.healthLegendGrid}>
            {NDVI_SEVERITY_CONFIG.map((item) => (
              <View
                key={`legend-${item.key}`}
                style={[
                  styles.healthLegendItem,
                  { backgroundColor: item.background ?? applyAlphaToHex(item.color, 0.12) },
                ]}
              >
                <View style={[styles.healthLegendColor, { backgroundColor: item.color }]} />
                <View style={styles.healthLegendCopy}>
                  <Text style={[styles.healthLegendTitle, { color: item.color }]}>{item.title}</Text>
                  <Text style={[styles.healthLegendRange, { color: item.color }]}>
                    NDVI {item.range}
                  </Text>
                  <Text style={styles.healthLegendDescription}>{item.description}</Text>
                </View>
                <Text style={styles.healthLegendCount}>{lahanHealthSummary[item.key]} lahan</Text>
              </View>
            ))}
            <View
              style={[styles.healthLegendItem, { backgroundColor: NDVI_UNKNOWN_CONFIG.background }]}
            >
              <View style={[styles.healthLegendColor, { backgroundColor: NDVI_UNKNOWN_CONFIG.color }]} />
              <View style={styles.healthLegendCopy}>
                <Text style={[styles.healthLegendTitle, { color: NDVI_UNKNOWN_CONFIG.color }]}>
                  {NDVI_UNKNOWN_CONFIG.title}
                </Text>
                <Text style={[styles.healthLegendRange, { color: NDVI_UNKNOWN_CONFIG.color }]}>NDVI {NDVI_UNKNOWN_CONFIG.range}</Text>
                <Text style={styles.healthLegendDescription}>{NDVI_UNKNOWN_CONFIG.description}</Text>
              </View>
              <Text style={styles.healthLegendCount}>{lahanHealthSummary.unknown} lahan</Text>
            </View>
          </View>

        </View>

        <View style={[styles.sectionContainer, styles.tipsSection]}>
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Tips Penggunaan</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipBullet}>• Tap lahan di peta untuk melihat detail</Text>
            <Text style={styles.tipBullet}>• Gunakan zoom untuk gambar lebih presisi</Text>
            <Text style={styles.tipBullet}>• Simpan catatan untuk melacak perubahan lapangan</Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Catatan</Text>
            {notesLoading && <ActivityIndicator size="small" color="#4CAF50" />}
          </View>
          {notesLoading ? (
            <Text style={styles.sectionLoadingText}>Memuat catatan…</Text>
          ) : notesWithMetadata.length === 0 ? (
            <Text style={styles.sectionEmptyText}>
              Belum ada catatan. Simpan setiap temuan agar progress selalu tercatat.
            </Text>
          ) : (
            notesWithMetadata.slice(0, 6).map((note) => (
              <View key={`note-${note.id}`} style={styles.noteCard}>
                <View style={styles.noteCardHeader}>
                  <Text style={styles.noteTimestamp}>{formatDisplayDate(note.created_at)}</Text>
                  {note.lahanName && <Text style={styles.noteLahan}>{note.lahanName}</Text>}
                </View>
                <Text style={styles.noteTitle}>{note.title}</Text>
                <Text style={styles.noteContent} numberOfLines={3}>
                  {note.content}
                </Text>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.newNoteButton} onPress={handleOpenNoteModal}>
            <Text style={styles.newNoteButtonIcon}>+</Text>
            <Text style={styles.newNoteButtonText}>Tambah Catatan Baru</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showSaveModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Simpan Lahan</Text>
            <Text style={styles.modalSubtitle}>Luas: {formattedPendingArea} ha</Text>
            <Text style={styles.modalSubtitle}>{pendingPolygon.length} titik koordinat</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nama lahan (contoh: Lahan Jagung A)"
              value={lahanName}
              onChangeText={setLahanName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={handleCancelSave}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, isSaving && styles.modalSaveButtonDisabled]}
                onPress={saveLahan}
                disabled={isSaving}
              >
                <Text style={styles.modalSaveText}>{isSaving ? 'Menyimpan...' : 'Simpan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNoteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.noteModalContent}>
            <Text style={styles.modalTitle}>Catatan Baru</Text>
            <Text style={styles.modalSubtitle}>Catat hal penting dari lapangan agar tidak terlewat.</Text>

            <TouchableOpacity
              style={styles.notePickerButton}
              onPress={() => setIsLahanPickerVisible((prev) => !prev)}
            >
              <Text style={styles.notePickerLabel}>
                {selectedNoteLahanName ?? 'Pilih lahan (opsional)'}
              </Text>
            </TouchableOpacity>

            {isLahanPickerVisible && (
              <View style={styles.notePickerDropdown}>
                <ScrollView style={styles.notePickerList} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity
                    key="picker-none"
                    style={styles.notePickerOption}
                    onPress={() => handleSelectNoteLahan(null)}
                  >
                    <Text style={styles.notePickerOptionText}>Tanpa lahan</Text>
                  </TouchableOpacity>
                  {savedLahan.map((item) => (
                    <TouchableOpacity
                      key={`picker-${item.id}`}
                      style={styles.notePickerOption}
                      onPress={() => handleSelectNoteLahan(item.id)}
                    >
                      <Text style={styles.notePickerOptionText}>{item.name}</Text>
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
                style={[styles.modalSaveButton, (!isNoteFormValid || isSavingNote) && styles.modalSaveButtonDisabled]}
                onPress={handleSaveNote}
                disabled={!isNoteFormValid || isSavingNote}
              >
                <Text style={styles.modalSaveText}>
                  {isSavingNote ? 'Menyimpan...' : 'Simpan'}
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
    backgroundColor: '#f5f5f5',
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContent: {
    paddingBottom: 32,
  },
  header: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#f5f5f5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  sectionContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  sectionTitleSpaced: {
    marginBottom: 16,
    paddingBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#607D8B',
  },
  sectionEmptyText: {
    fontSize: 14,
    color: '#78909C',
    lineHeight: 20,
  },
  sectionLoadingText: {
    fontSize: 14,
    color: '#78909C',
  },
  mapContainer: {
    height: MAP_HEIGHT,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#D7CCC8',
  },
  searchContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
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
    color: '#999999',
    fontWeight: '600',
  },
  searchResultsContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: 220,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchLoadingText: {
    fontSize: 13,
    color: '#555555',
    marginLeft: 12,
  },
  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  searchResultSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  searchResultEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
    color: '#777777',
    fontSize: 12,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapBackground: {
    flex: 1,
    backgroundColor: '#8B7355',
    position: 'relative',
  },
  fieldArea: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 3,
  },
  jagungArea: {
    top: 80,
    left: 40,
    width: 120,
    height: 100,
    backgroundColor: 'rgba(139, 195, 74, 0.3)',
    borderColor: '#8BC34A',
  },
  kedelaiArea: {
    top: 200,
    right: 60,
    width: 140,
    height: 120,
    backgroundColor: 'rgba(255, 152, 0, 0.3)',
    borderColor: '#FF9800',
  },
  padiArea: {
    bottom: 100,
    right: 40,
    width: 100,
    height: 80,
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
    borderColor: '#F44336',
  },
  fieldLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  drawingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawingText: {
    color: '#2196F3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawingSubtext: {
    color: '#2196F3',
    fontSize: 14,
    marginTop: 5,
  },
  savedLahanLabel: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 110,
  },
  savedLahanLabelText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  savedLahanLabelSubtext: {
    color: '#E8F5E9',
    fontSize: 12,
    marginTop: 2,
  },
  mapControls: {
    position: 'absolute',
    top: 120,
    right: 20,
  },
  zoomButton: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  zoomText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  locationButton: {
    width: 40,
    height: 40,
    backgroundColor: '#C8E6C9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  drawingControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  controlButton: {
    backgroundColor: '#FF5858',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  controlButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  finishButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  finishButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilterButton: {
    backgroundColor: '#C8E6C9',
    borderColor: '#4CAF50',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  newFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C8E6C9',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 25,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cameraIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    marginRight: 10,
  },
  newFieldText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  lahanCard: {
    backgroundColor: '#F9FBE7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  lahanCardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  lahanCardThumbnail: {
    width: 112,
    alignSelf: 'stretch',
    minHeight: 72,
    borderRadius: 12,
    marginRight: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lahanCardBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  lahanCardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  lahanCardContent: {
    flex: 1,
  },
  lahanCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  lahanCardSubtitle: {
    fontSize: 13,
    color: '#33691E',
  },
  lahanCardMeta: {
    fontSize: 13,
    color: '#4E342E',
  },
  lahanCardMetaSecondary: {
    fontSize: 12,
    color: '#6D4C41',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    marginTop: 4,
  },
  paginationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E342E',
  },
  paginationButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
  },
  paginationButtonDisabled: {
    backgroundColor: '#E0F2F1',
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paginationButtonTextDisabled: {
    color: '#2E7D32',
    opacity: 0.7,
  },
  healthLegendGrid: {
    flexDirection: 'column',
  },
  healthLegendItem: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '700',
  },
  healthLegendRange: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  healthLegendDescription: {
    fontSize: 12,
    color: '#546E7A',
  },
  healthLegendCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#37474F',
  },
  tipsSection: {
    backgroundColor: '#E8F5E9',
  },
  tipCard: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  tipBullet: {
    fontSize: 13,
    color: '#37474F',
    marginBottom: 4,
  },
  noteCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteTimestamp: {
    fontSize: 12,
    color: '#757575',
  },
  noteLahan: {
    fontSize: 12,
    color: '#5D4037',
    fontWeight: '600',
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4E342E',
    marginBottom: 4,
  },
  noteContent: {
    fontSize: 13,
    color: '#6D4C41',
    lineHeight: 18,
  },
  newNoteButton: {
    marginTop: 12,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  newNoteButtonIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    marginRight: 6,
  },
  newNoteButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: width * 0.8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalCancelButton: {
    backgroundColor: '#ccc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  modalCancelText: {
    color: '#333',
  },
  modalSaveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    color: 'white',
    fontWeight: 'bold',
  },
  noteModalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    width: width * 0.88,
  },
  notePickerButton: {
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F1F8E9',
  },
  notePickerLabel: {
    fontSize: 14,
    color: '#2E7D32',
  },
  notePickerDropdown: {
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 12,
    maxHeight: 180,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
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
    color: '#37474F',
  },
  noteInput: {
    minHeight: 120,
  },
  drawingCursor: {
    width: 20,
    height: 20,
    backgroundColor: '#FF5722',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawingVertex: {
    width: 12,
    height: 12,
    backgroundColor: '#FF5722',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  startVertex: {
    backgroundColor: '#4CAF50',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  currentVertex: {
    backgroundColor: '#FFD54F',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FF5722',
    elevation: 5,
  },
  instructionBanner: {
    backgroundColor: '#FF5722',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  instructionSubtext: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
    opacity: 0.9,
  },
});
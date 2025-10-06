import { ThemedView } from '@/components/themed-view';
import { LahanWithInfo, lahanService, supabase } from '@/hooks/supabase';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { LatLng, MapPressEvent, Marker, Polygon, Polyline, Region } from 'react-native-maps';

type SavedLahanItem = {
  id: string;
  name: string;
  coordinates: LatLng[];
  areaHa?: number | null;
};

type SearchSuggestion = {
  id: string;
  label: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
};

type DrawVertex = {
  id: string;
  coordinate: LatLng;
};

const { width } = Dimensions.get('window');

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
  const [currentVertices, setCurrentVertices] = useState<DrawVertex[]>([]);
  const [pendingPolygon, setPendingPolygon] = useState<LatLng[]>([]);

  const activePath = useMemo(
    () =>
      currentVertices
        .map((vertex) => vertex.coordinate)
        .filter(
          (coord): coord is LatLng =>
            Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude)
        ),
    [currentVertices]
  );

  const previewPath = useMemo(() => {
    if (activePath.length >= 3) {
      return [...activePath, activePath[0]];
    }
    return activePath;
  }, [activePath]);
  const [savedLahan, setSavedLahan] = useState<SavedLahanItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchMarker, setSearchMarker] = useState<LatLng | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
        }))
        .filter(item => item.coordinates.length >= 3);

      setSavedLahan(mapped);
    } catch (error) {
      console.error('❌ Gagal memuat data lahan:', error);
    }
  }, [fallbackUserId, toLatLngCoordinates]);

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
      latitude: lat,
      longitude: lon,
    };

    const vertex: DrawVertex = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      coordinate,
    };

    setCurrentVertices((prev) => [...prev, vertex]);
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
      'Tap pada peta untuk menandai titik-titik polygon. Seperti pada contoh gambar.'
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

  const pendingArea = calculateArea(pendingPolygon);
  const formattedPendingArea = Number.isFinite(pendingArea) ? pendingArea.toFixed(2) : '0.00';

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Lokasi Ladang</Text>
          <Text style={styles.headerSubtitle}>{locationLabel}</Text>
        </View>
      </View>

      {/* Map Container - Real MapView */}
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
                searchResults.map(result => (
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
          mapType="satellite"
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {/* Render current drawing preview */}
          {drawingMode && previewPath.length > 0 && (
            <>
              {activePath.length >= 3 && (
                <Polygon
                  coordinates={previewPath}
                  fillColor="rgba(255, 138, 101, 0.25)"
                  strokeColor="rgba(255, 87, 34, 0.8)"
                  strokeWidth={2}
                />
              )}
              {activePath.length > 1 && (
                <Polyline
                  coordinates={previewPath}
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
            <Marker
              coordinate={searchMarker}
              pinColor="#2E7D32"
            />
          )}

          {savedLahan.map(item => {
            if (!item.coordinates || item.coordinates.length < 3) {
              return null;
            }

            const labelIndex = Math.floor(item.coordinates.length / 2);
            const labelCoordinate = item.coordinates[labelIndex] ?? item.coordinates[0];
            const color = getLahanColor(item.id);

            return (
              <React.Fragment key={`saved-${item.id}`}>
                <Polygon
                  coordinates={item.coordinates}
                  fillColor={color.fill}
                  strokeColor={color.stroke}
                  strokeWidth={3}
                  tappable={false}
                />
                {labelCoordinate && (
                  <Marker
                    coordinate={labelCoordinate}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tappable={false}
                  >
                    <View style={[styles.savedLahanLabel, { backgroundColor: color.stroke }]}
                    >
                      <Text style={styles.savedLahanLabelText}>{item.name}</Text>
                      {typeof item.areaHa === 'number' && Number.isFinite(item.areaHa) && (
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

          {/* Show vertex points during drawing */}
          {drawingMode && currentVertices.map((vertex, index) => (
            <Marker
              key={vertex.id}
              coordinate={vertex.coordinate}
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

        {/* Map controls */}
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

      {/* Drawing controls */}
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

      {/* Filter buttons */}
      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              selectedFilter === filter && styles.activeFilterButton
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === filter && styles.activeFilterText
            ]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Drawing Instructions */}
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

      {/* New Field Button */}
      <TouchableOpacity 
        style={[styles.newFieldButton, drawingMode && styles.disabledButton]} 
        onPress={startDrawing}
        disabled={drawingMode}
      >
        <View style={styles.cameraIcon} />
        <Text style={styles.newFieldText}>
          {drawingMode ? 'Mode Gambar Aktif' : 'Gambar Lahan Baru'}
        </Text>
      </TouchableOpacity>

      {/* Save Modal */}
      <Modal
        visible={showSaveModal}
        transparent={true}
        animationType="slide"
      >
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
                style={[styles.modalSaveButton, isSaving && styles.modalSaveButtonDisabled]}
                onPress={saveLahan}
                disabled={isSaving}
              >
                <Text style={styles.modalSaveText}>
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  mapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { lahanService, supabase, type LahanWithInfo } from '@/hooks/supabase';
import { BASE_URL } from '../../hooks/config';

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

const formatHeaderDate = (value: Date) =>
  new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
    .format(value)
    .replace(/\//g, '.');

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

const WeatherCard = ({ location, temperature, highTemp, lowTemp, humidity, rainfall, pressure, windSpeed }: WeatherCardProps) => (
  <View style={styles.weatherCard}>
    <View style={styles.weatherHeader}>
      <View style={styles.locationRow}>
        <Ionicons name="location" size={16} color="#333" />
        <Text style={styles.locationText}>{location || "N/A"}</Text>
      </View>
      <View style={styles.weatherIcon}>
        <Ionicons name="partly-sunny" size={32} color="#FFD700" />
      </View>
    </View>
    
    <View style={styles.temperatureRow}>
      <Text style={styles.temperature}>
        {temperature !== null ? `${Math.round(temperature)}°` : "--"}
      </Text>
      <View style={styles.tempRange}>
        <Text style={styles.tempRangeText}>T: {highTemp !== null ? `${Math.round(highTemp)}°` : "--"}</Text>
        <Text style={styles.tempRangeText}>R: {lowTemp !== null ? `${Math.round(lowTemp)}°` : "--"}</Text>
      </View>
    </View>
    
    <View style={styles.weatherStats}>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Kelembaban</Text>
        <Text style={styles.statValue}>{humidity !== null ? `${Math.round(humidity)}%` : "--"}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Curah Hujan</Text>
        <Text style={styles.statValue}>{rainfall !== null ? `${rainfall.toFixed(1)} mm` : "--"}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Tekanan</Text>
        <Text style={styles.statValue}>{pressure !== null ? `${Math.round(pressure)} hPa` : "--"}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Kec. Angin</Text>
        <Text style={styles.statValue}>{windSpeed !== null ? `${windSpeed.toFixed(1)} km/jam` : "--"}</Text>
      </View>
    </View>
  </View>
);


const LahanCard = ({ name, areaHa, onPress }: SavedLahanCardProps) => {
  return (
    <View style={styles.fieldCardContainer}>
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        style={styles.fieldCard}
        activeOpacity={0.9}
      >
        <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.fieldGradient}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Tersimpan</Text>
          </View>
          <View style={styles.fieldInfoContent}>
            <Text style={styles.plantNameInArea}>{name}</Text>
            <Text style={styles.fieldMeanText}>
              {areaHa !== null ? `Luas: ${areaHa.toFixed(2)} ha` : 'Luas belum tersedia'}
            </Text>
            <Text style={styles.fieldSubtitleText}>Kelola detail lahan ➝</Text>
          </View>
          <View style={styles.fieldArrowButton}>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{name}</Text>
        <Text style={styles.cardSubtitle}>
          {areaHa !== null ? `${areaHa.toFixed(2)} ha` : 'Luas belum tersedia'}
        </Text>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('Petani');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [dateLabel, setDateLabel] = useState<string>('');
  const [weatherData, setWeatherData] = useState<WeatherData>({
    location: 'Memuat lokasi...',

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
  const userNameDisplay = useMemo(() => (userName ? userName.toUpperCase() : 'PETANI'), [userName]);

  useEffect(() => {
    let isMounted = true;
    setDateLabel(formatHeaderDate(new Date()));

    const loadUserProfile = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!isMounted) {
          return;
        }

        const user = data?.user;
        if (user) {
          const fullName = (user.user_metadata?.full_name as string | undefined)?.trim();
          const email = user.email ?? undefined;
          const fallbackName = email ? email.split('@')[0] : undefined;
          const displayName = fullName || fallbackName || 'Petani';

          setUserName(displayName);
          setProfileImageUri(
            `https://ui-avatars.com/api/?background=8BC34A&color=ffffff&name=${encodeURIComponent(displayName)}`
          );
        } else {
          setUserName('Petani');
          setProfileImageUri(null);
        }
      } catch (error) {
        console.warn('Gagal memuat profil pengguna dari Supabase', error);
        if (isMounted) {
          setUserName('Petani');
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
      const weatherResponse = await fetch(`${BASE_URL}/weather?lat=${latitude}&lon=${longitude}`);
      
      if (!weatherResponse.ok) {
        throw new Error("Failed to fetch weather");
      }

    const data = await weatherResponse.json();
    console.log("Weather data fetched:", data);

    const parseNumber = (value: unknown): number | null => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    return {
      location: typeof data.location === 'string' ? data.location : '',
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

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        const message = authError.message ?? '';
        if (message.includes('Auth session missing')) {
          setSavedLahan([]);
          setLahanError('Masuk untuk menyimpan lahan Anda.');
          return;
        }
        throw authError;
      }

      const userId = authData?.user?.id ?? fallbackUserId;
      if (!userId) {
        setSavedLahan([]);
        setLahanError('Masuk untuk menyimpan lahan Anda.');
        return;
      }

      const lahanList = (await lahanService.getLahanByUser(userId)) as LahanWithInfo[];
      const normalized: SavedLahan[] = Array.isArray(lahanList)
    ? lahanList.map((item: LahanWithInfo) => {
      const rawArea = item.area_ha;
            let areaValue: number | null = null;
            if (rawArea !== null && rawArea !== undefined) {
              const parsed = typeof rawArea === 'number' ? rawArea : Number.parseFloat(String(rawArea));
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
        setLahanError('Belum ada lahan tersimpan.');
      } else {
        setLahanError(null);
      }
    } catch (error) {
      console.error('Gagal memuat lahan tersimpan:', error);
      setSavedLahan([]);
      setLahanError('Gagal memuat data lahan.');
    } finally {
      setLahanLoading(false);
    }
  }, [fallbackUserId]);

  useFocusEffect(
    useCallback(() => {
      loadSavedLahan();
    }, [loadSavedLahan])
  );

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
          console.warn("Primary location fetch failed, trying last known position", positionError);
          position = await Location.getLastKnownPositionAsync();
        }

        if (!position) {
          throw new Error("LOCATION_UNAVAILABLE");
        }

        const { latitude, longitude } = position.coords;
        console.log(`User location: ${latitude}, ${longitude}`);

        let locationName = "Lokasi tidak diketahui";
        try {
          const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
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
            setWeatherError('Data cuaca belum tersedia untuk lokasi ini.');
          }
        }

  console.log('Weather data updated successfully');
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
          setWeatherError('Pastikan GPS sudah aktif lalu coba lagi.');
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
      <LinearGradient colors={['#8BC34A', '#689F38']} style={styles.header}>
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
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            {weatherData.location || 'Lokasi belum diketahui'}
          </Text>
        </View>
        
        {/* Dashboard Title */}
        <View style={styles.dashboardTitleContainer}>
          <View>
            <Text style={styles.dashboardTitle}>Dashboard</Text>
            <Text style={styles.dashboardSubtitle}>Pertanian</Text>
          </View>
          
          {/* Date Selector */}
          <View style={styles.dateSelector}>
            <Text style={styles.dateText}>{dateLabel || '--.--.--'}</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </View>
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
            {weatherError ? <Text style={styles.errorText}>{weatherError}</Text> : null}
          </>
        )}
        <Text style={styles.sectionTitle}>Ladang Saya ({savedLahan.length})</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fieldsContainer}>
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
                onPress={() =>
                  router.push({ pathname: '/detail-lahan-page', params: { id: item.id } })
                }
              />
            ))
          ) : (
            <View style={styles.emptyNdviContainer}>
              <Text style={styles.emptyNdviText}>
                {lahanError ?? 'Belum ada lahan tersimpan. Simpan lahan dari tab Jelajahi.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.9,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#999',
    fontSize: 16,
  },
  dashboardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dashboardTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  dashboardSubtitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: -5,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  dateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  weatherCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  weatherIcon: {
    padding: 5,
  },
  temperatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  temperature: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  tempRange: {
    alignItems: 'flex-end',
  },
  tempRangeText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  weatherStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  errorText: {
    color: '#F44336',
    marginTop: -10,
    marginBottom: 20,
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  fieldsContainer: {
    marginBottom: 20,
  },
  fieldCardContainer: {
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fieldCard: {
    width: 160,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fieldGradient: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  plantNameInArea: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  fieldInfoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  fieldMeanText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  fieldSubtitleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  fieldArrowButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  loadingCard: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
  },
  emptyNdviContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyNdviText: {
    color: '#666',
    fontSize: 14,
  },
});

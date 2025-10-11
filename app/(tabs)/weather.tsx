import { ThemedView } from "@/components/themed-view";
import { BASE_URL } from "@/hooks/config";
import {
  getWeatherIconSource,
  mapAccuWeatherCodeToIconKey,
  type WeatherIconKey,
} from "@/utils/weather-icons";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface CurrentWeather {
  temperature: number | null;
  highTemp: number | null;
  lowTemp: number | null;
  humidity: number | null;
  rainfall: number | null;
  windSpeed: number | null;
  locationName: string;
  condition: string | null;
  iconKey: WeatherIconKey | null;
}

interface DailyForecast {
  isoDate: string;
  label: string;
  iconKey: WeatherIconKey;
  highTemp: number | null;
  lowTemp: number | null;
  humidity: number | null;
  precipitation: number | null;
  description: string | null;
}

type LocationOption =
  | { id: "current"; label: string }
  | { id: string; label: string; latitude: number; longitude: number };

const LOCATION_OPTIONS: LocationOption[] = [
  { id: "current", label: "Gunakan Lokasi Saya" },
  {
    id: "jakarta",
    label: "Jakarta, DKI Jakarta",
    latitude: -6.2088,
    longitude: 106.8456,
  },
  {
    id: "bandung",
    label: "Bandung, Jawa Barat",
    latitude: -6.9175,
    longitude: 107.6191,
  },
  {
    id: "yogyakarta",
    label: "Yogyakarta, DI Yogyakarta",
    latitude: -7.7956,
    longitude: 110.3695,
  },
  {
    id: "surabaya",
    label: "Surabaya, Jawa Timur",
    latitude: -7.2575,
    longitude: 112.7521,
  },
  {
    id: "medan",
    label: "Medan, Sumatera Utara",
    latitude: 3.5952,
    longitude: 98.6722,
  },
  {
    id: "makassar",
    label: "Makassar, Sulawesi Selatan",
    latitude: -5.1477,
    longitude: 119.4327,
  },
  {
    id: "denpasar",
    label: "Denpasar, Bali",
    latitude: -8.65,
    longitude: 115.2167,
  },
];

function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatDateLabel(isoDate: string, index: number): string {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + index);
    return days[fallback.getDay()];
  }
  return days[date.getDay()];
}

function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function formatGeocodedLocation(
  place?: Location.LocationGeocodedAddress | null
): string | null {
  if (!place) {
    return null;
  }

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
    const normalized = part.trim();
    if (!normalized || uniqueParts.includes(normalized)) {
      return;
    }
    uniqueParts.push(normalized);
  });

  if (uniqueParts.length === 0) {
    return null;
  }

  return uniqueParts.join(", ");
}

export default function WeatherScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState("Memuat lokasi...");
  const [selectedLocationId, setSelectedLocationId] =
    useState<string>("current");
  const [isLocationMenuOpen, setLocationMenuOpen] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather>({
    temperature: null,
    highTemp: null,
    lowTemp: null,
    humidity: null,
    rainfall: null,
    windSpeed: null,
    locationName: "Memuat lokasi...",
    condition: null,
    iconKey: null,
  });
  const [forecast, setForecast] = useState<DailyForecast[]>([]);

  const selectedLocationOption = useMemo(
    () => LOCATION_OPTIONS.find((option) => option.id === selectedLocationId),
    [selectedLocationId]
  );

  const displayLocationLabel =
    selectedLocationId === "current"
      ? locationLabel
      : selectedLocationOption?.label ?? locationLabel;

  const handleSelectLocation = useCallback((optionId: string) => {
    setSelectedLocationId(optionId);
    setLocationMenuOpen(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function ensureWeatherData(
      latitude: number,
      longitude: number,
      labelHint?: string
    ) {
      const response = await fetch(
        `${BASE_URL}/weather?lat=${latitude}&lon=${longitude}`
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gagal memuat cuaca: ${response.status} ${text}`);
      }

      const currentJson = await response.json();
      if (!isMounted) return;

      const dailyData: DailyForecast[] = Array.isArray(
        currentJson?.dailyForecasts
      )
        ? currentJson.dailyForecasts
            .slice(0, 7)
            .map((entry: any, index: number) => {
              const isoDate =
                typeof entry?.isoDate === "string"
                  ? entry.isoDate
                  : new Date().toISOString();
              const high = parseNumericValue(entry?.highTemp);
              const low = parseNumericValue(entry?.lowTemp);
              const precipitation = parseNumericValue(entry?.precipitationMm);
              const humidity = parseNumericValue(entry?.humidity);
              const iconCodeValue = parseNumericValue(entry?.iconCode);
              const iconCode =
                iconCodeValue !== null ? Math.round(iconCodeValue) : null;

              return {
                isoDate,
                label: formatDateLabel(isoDate, index),
                iconKey: mapAccuWeatherCodeToIconKey(iconCode),
                highTemp: high,
                lowTemp: low,
                humidity,
                precipitation,
                description:
                  typeof entry?.iconPhrase === "string"
                    ? entry.iconPhrase
                    : null,
              };
            })
        : [];

      const currentIconCode = parseNumericValue(currentJson.iconCode);

      const normalizedCurrent: CurrentWeather = {
        temperature: parseNumericValue(currentJson.temperature),
        highTemp:
          parseNumericValue(currentJson.highTemp) ??
          (dailyData.length > 0 ? dailyData[0].highTemp : null),
        lowTemp:
          parseNumericValue(currentJson.lowTemp) ??
          (dailyData.length > 0 ? dailyData[0].lowTemp : null),
        humidity: parseNumericValue(currentJson.humidity),
        rainfall: parseNumericValue(currentJson.rainfall),
        windSpeed: parseNumericValue(currentJson.windSpeed),
        locationName:
          currentJson.location ?? labelHint ?? "Lokasi tidak diketahui",
        condition: currentJson.condition ?? dailyData[0]?.description ?? null,
        iconKey: mapAccuWeatherCodeToIconKey(
          currentIconCode !== null ? Math.round(currentIconCode) : null
        ),
      };

      setCurrentWeather(normalizedCurrent);
      setForecast(dailyData);
      setLocationLabel(normalizedCurrent.locationName);
      setError(null);
    }

    async function loadWeather() {
      try {
        setLoading(true);

        let latitude: number | null = null;
        let longitude: number | null = null;
        let labelHint: string | undefined;

        if (selectedLocationId === "current") {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            throw new Error(
              "Izin lokasi dibutuhkan untuk menampilkan prakiraan cuaca."
            );
          }

          let position: Location.LocationObject | null = null;
          try {
            position = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
              mayShowUserSettingsDialog: true,
            });
          } catch (primaryError) {
            console.warn(
              "Gagal mengambil lokasi terbaru, mencoba lokasi terakhir.",
              primaryError
            );
            position = await Location.getLastKnownPositionAsync();
          }

          if (!position) {
            throw new Error("Tidak dapat mendeteksi lokasi perangkat.");
          }

          latitude = position.coords.latitude;
          longitude = position.coords.longitude;

          labelHint = `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;
          try {
            const geocoded = await Location.reverseGeocodeAsync({
              latitude,
              longitude,
            });
            const formatted = formatGeocodedLocation(geocoded?.[0] ?? null);
            if (formatted) {
              labelHint = formatted;
            }
          } catch (reverseError) {
            console.warn("Reverse geocode gagal", reverseError);
          }

          if (isMounted && labelHint) {
            setLocationLabel(labelHint);
          }
        } else {
          const option = selectedLocationOption as
            | Extract<LocationOption, { latitude: number; longitude: number }>
            | undefined;
          if (!option?.latitude || !option?.longitude) {
            throw new Error("Koordinat lokasi tidak ditemukan.");
          }

          latitude = option.latitude;
          longitude = option.longitude;
          labelHint = option.label;

          if (isMounted) {
            setLocationLabel(option.label);
          }
        }

        if (latitude === null || longitude === null) {
          throw new Error("Koordinat lokasi tidak valid.");
        }

        await ensureWeatherData(latitude, longitude, labelHint);
      } catch (err) {
        console.error("WeatherScreen error:", err);
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan saat memuat cuaca.";
          setError(message);
          Alert.alert("Gagal memuat cuaca", message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadWeather();

    return () => {
      isMounted = false;
    };
  }, [selectedLocationId, selectedLocationOption]);

  const weatherStats = useMemo(
    () => [
      {
        id: "humidity",
        label: "Kelembapan",
        value:
          currentWeather.humidity !== null
            ? `${currentWeather.humidity.toFixed(0)}%`
            : "--",
        icon: "water-outline" as const,
        accent: "#E3F2FD",
      },
      {
        id: "rainfall",
        label: "Curah Hujan",
        value:
          currentWeather.rainfall !== null
            ? `${currentWeather.rainfall.toFixed(1)} mm`
            : "--",
        icon: "rainy-outline" as const,
        accent: "#E8F5E9",
      },
      {
        id: "wind",
        label: "Kecepatan Angin",
        value:
          currentWeather.windSpeed !== null
            ? `${currentWeather.windSpeed.toFixed(1)} km/jam`
            : "--",
        icon: "leaf-outline" as const,
        accent: "#FFF3E0",
      },
    ],
    [currentWeather.humidity, currentWeather.rainfall, currentWeather.windSpeed]
  );

  const riskSummary = useMemo(() => {
    if (!forecast.length) {
      return {
        score: null,
        level: "Tidak tersedia",
        description: "Data cuaca belum tersedia",
      };
    }

    const avgPrecipitation =
      forecast.reduce((total, day) => total + (day.precipitation ?? 0), 0) /
      forecast.length;
    const representativeHumidity =
      currentWeather.humidity ??
      forecast.find((day) => day.humidity !== null)?.humidity ??
      0;

    const rawScore = avgPrecipitation * 4 + (representativeHumidity ?? 0) * 0.4;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    let level = "Rendah";
    if (score >= 70) {
      level = "Tinggi";
    } else if (score >= 40) {
      level = "Sedang";
    }

    const description = `Rata-rata curah hujan ${avgPrecipitation.toFixed(
      1
    )} mm per hari`;

    return {
      score,
      level,
      description,
    };
  }, [forecast, currentWeather.humidity]);

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FB" />

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Cuaca Lahan</Text>
        </View>

        <View style={styles.headerControls}>
          <TouchableOpacity
            style={styles.locationSelector}
            onPress={() => setLocationMenuOpen((prev) => !prev)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="location-outline"
              size={18}
              color="#2E7D32"
              style={styles.locationSelectorIcon}
            />
            <Text style={styles.locationSelectorText} numberOfLines={1}>
              {displayLocationLabel}
            </Text>
            <Ionicons
              name={isLocationMenuOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color="#2E7D32"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notificationButton}
            accessibilityLabel="Notifikasi cuaca"
          >
            <Ionicons name="notifications-outline" size={22} color="#2E7D32" />
          </TouchableOpacity>
        </View>
      </View>

      {isLocationMenuOpen && (
        <View style={styles.locationDropdown}>
          {LOCATION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.locationOption,
                selectedLocationId === option.id && styles.locationOptionActive,
              ]}
              onPress={() => handleSelectLocation(option.id)}
            >
              <Text
                style={[
                  styles.locationOptionText,
                  selectedLocationId === option.id &&
                    styles.locationOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.currentWeatherCard}>
          {loading ? (
            <ActivityIndicator size="large" color="#4CAF50" />
          ) : (
            <>
              <View style={styles.weatherIcon}>
                <Image
                  source={getWeatherIconSource(
                    currentWeather.iconKey ?? forecast[0]?.iconKey ?? null
                  )}
                  style={styles.currentWeatherIcon}
                />
              </View>
              <View style={styles.temperatureContainer}>
                <Text style={styles.temperature}>
                  {currentWeather.highTemp !== null
                    ? `${currentWeather.highTemp.toFixed(0)}°`
                    : currentWeather.temperature !== null
                    ? `${currentWeather.temperature.toFixed(0)}°`
                    : "--"}
                  {currentWeather.lowTemp !== null
                    ? `/${currentWeather.lowTemp.toFixed(0)}°`
                    : ""}
                </Text>
                <Text style={styles.weatherDescription}>
                  {currentWeather.condition ??
                    forecast[0]?.description ??
                    "Prakiraan cuaca harian"}
                </Text>
                <Text style={styles.weatherSubDescription}>
                  {error
                    ? error
                    : "Pantau cuaca untuk mengatur jadwal penyiraman dan penyemprotan."}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.statsGrid}>
          {weatherStats.map((stat) => (
            <View key={stat.id} style={styles.statCard}>
              <View
                style={[
                  styles.statIconWrapper,
                  { backgroundColor: stat.accent },
                ]}
              >
                <Ionicons name={stat.icon} size={22} color="#1B5E20" />
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.riskAlert}>
          <View style={styles.riskCardContent}>
            <View style={styles.riskScoreBadge}>
              <Text style={styles.riskScoreValue}>
                {riskSummary.score !== null ? `${riskSummary.score}` : "--"}
              </Text>
              <Text style={styles.riskScoreLabel}>% risiko</Text>
            </View>

            <View style={styles.riskInfo}>
              <Text style={styles.riskTitle}>Skor Risiko Cuaca</Text>
              <Text style={styles.riskLevelText}>{riskSummary.level}</Text>
              <View style={styles.riskProgressTrack}>
                <View
                  style={[
                    styles.riskProgressFill,
                    {
                      width: `${Math.min(
                        Math.max(riskSummary.score ?? 0, 0),
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.riskDescription}>
                {riskSummary.description}
              </Text>
              <Text style={styles.riskFootnote}>
                Risiko cuaca untuk 7 hari ke depan
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.weeklyForecast}>
          <Text style={styles.weeklyTitle}>Prakiraan 7 Hari ke Depan</Text>

          {forecast.length === 0 && !loading ? (
            <Text style={styles.emptyForecastText}>
              Belum ada data prakiraan untuk lokasi ini.
            </Text>
          ) : (
            forecast.map((day) => (
              <View key={day.isoDate} style={styles.dailyWeatherCard}>
                <View style={styles.dailyHeaderRow}>
                  <View style={styles.dailyIconBadge}>
                    <Image
                      source={getWeatherIconSource(day.iconKey)}
                      style={styles.forecastIcon}
                    />
                  </View>
                  <View style={styles.dailyTitleBlock}>
                    <Text style={styles.dayText}>{day.label}</Text>
                    <Text style={styles.dateText}>
                      {formatShortDate(day.isoDate)}
                    </Text>
                  </View>
                  <Text style={styles.tempText}>
                    {day.highTemp !== null
                      ? `${day.highTemp.toFixed(0)}°`
                      : "--"}
                    {day.lowTemp !== null ? `/${day.lowTemp.toFixed(0)}°` : ""}
                  </Text>
                </View>
                {day.description ? (
                  <Text style={styles.dayDescription}>{day.description}</Text>
                ) : null}

                <View style={styles.dailyMetricsRow}>
                  <View style={styles.metricChip}>
                    <Ionicons name="water-outline" size={16} color="#1B5E20" />
                    <Text style={styles.metricText}>
                      {day.humidity !== null ? `${day.humidity}%` : "--"}
                    </Text>
                  </View>
                  <View style={[styles.metricChip, styles.metricChipLast]}>
                    <Ionicons name="rainy-outline" size={16} color="#1B5E20" />
                    <Text style={styles.metricText}>
                      {day.precipitation !== null
                        ? `${day.precipitation.toFixed(1)} mm`
                        : "--"}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
    color: "#1B4332",
  },
  locationSelector: {
    flex: 1,
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  locationSelectorIcon: {
    marginRight: 8,
  },
  locationSelectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginLeft: 12,
  },
  locationDropdown: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  locationOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationOptionActive: {
    backgroundColor: "#E8F5E9",
  },
  locationOptionText: {
    fontSize: 15,
    color: "#374151",
  },
  locationOptionTextActive: {
    color: "#1B5E20",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  currentWeatherCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  weatherIcon: {
    marginBottom: 10,
  },
  currentWeatherIcon: {
    width: 74,
    height: 74,
    resizeMode: "contain",
  },
  temperatureContainer: {
    alignItems: "center",
  },
  temperature: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  weatherDescription: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
    textAlign: "center",
  },
  weatherSubDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "stretch",
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginHorizontal: 6,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B5E20",
  },
  riskAlert: {
    backgroundColor: "#E8F5E9",
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  riskCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  riskScoreBadge: {
    width: 90,
    height: 90,
    borderRadius: 18,
    backgroundColor: "#C8E6C9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
  },
  riskScoreValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1B5E20",
  },
  riskScoreLabel: {
    fontSize: 12,
    color: "#256029",
    marginTop: 4,
  },
  riskInfo: {
    flex: 1,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B5E20",
    marginBottom: 6,
  },
  riskLevelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1B5E20",
    marginBottom: 12,
  },
  riskProgressTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: "#D7EADF",
    overflow: "hidden",
    marginBottom: 12,
  },
  riskProgressFill: {
    height: "100%",
    backgroundColor: "#43A047",
    borderRadius: 6,
  },
  riskDescription: {
    fontSize: 14,
    color: "#345B3B",
    marginBottom: 4,
  },
  riskFootnote: {
    fontSize: 12,
    color: "#6B8C74",
  },
  weeklyForecast: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  weeklyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 18,
  },
  emptyForecastText: {
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
    paddingVertical: 12,
  },
  dailyWeatherCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    marginBottom: 14,
  },
  dailyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dailyIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  forecastIcon: {
    width: 36,
    height: 36,
    resizeMode: "contain",
  },
  dailyTitleBlock: {
    flex: 1,
  },
  dayText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  dateText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  tempText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  dayDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
  },
  dailyMetricsRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  metricChipLast: {
    marginRight: 0,
  },
  metricText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1B5E20",
    marginLeft: 6,
  },
});

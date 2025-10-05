import { ThemedView } from '@/components/themed-view';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BASE_URL } from '@/hooks/config';

interface CurrentWeather {
  temperature: number | null;
  highTemp: number | null;
  lowTemp: number | null;
  humidity: number | null;
  rainfall: number | null;
  windSpeed: number | null;
  locationName: string;
  condition: string | null;
}

interface DailyForecast {
  isoDate: string;
  label: string;
  icon: string;
  highTemp: number | null;
  lowTemp: number | null;
  humidity: number | null;
  precipitation: number | null;
  description: string | null;
}

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

const formatDateLabel = (isoDate: string, index: number) => {
  if (index === 0) return 'Hari Ini';
  if (index === 1) return 'Besok';

  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
  }).format(date);
};

const formatShortDate = (isoDate: string) => {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
  })
    .format(date)
    .replace('.', ' ');
};

const mapAccuWeatherIconToEmoji = (iconCode?: number | null) => {
  if (iconCode === undefined || iconCode === null) return '🌤️';

  const groups: { emoji: string; codes: number[] }[] = [
    { emoji: '☀️', codes: [1] },
    { emoji: '🌤️', codes: [2, 3, 4, 5] },
    { emoji: '⛅', codes: [6, 7] },
    { emoji: '☁️', codes: [7, 8] },
    { emoji: '🌫️', codes: [11] },
    { emoji: '🌧️', codes: [12, 13, 14, 18, 39, 40] },
    { emoji: '🌦️', codes: [15, 16, 17] },
    { emoji: '⛈️', codes: [15, 16, 41, 42] },
    { emoji: '❄️', codes: [19, 20, 21, 22, 23, 24, 25, 26] },
    { emoji: '🌨️', codes: [29] },
    { emoji: '🌩️', codes: [30, 31] },
    { emoji: '🌙', codes: [33, 34] },
    { emoji: '☁️🌙', codes: [35, 36, 37, 38] },
  ];

  const match = groups.find((group) => group.codes.includes(iconCode));
  return match?.emoji ?? '🌤️';
};

const parseNumericValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value;
    return null;
  }

  const parsed = parseFloat(String(value).replace(/[^0-9.,-]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

export default function WeatherScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState('Memuat lokasi...');
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather>({
    temperature: null,
    highTemp: null,
    lowTemp: null,
    humidity: null,
    rainfall: null,
    windSpeed: null,
    locationName: 'Memuat lokasi...',
    condition: null,
  });
  const [forecast, setForecast] = useState<DailyForecast[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Izin lokasi dibutuhkan untuk menampilkan prakiraan cuaca.');
        }

        let position: Location.LocationObject | null = null;
        try {
          position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            mayShowUserSettingsDialog: true,
          });
        } catch (primaryError) {
          console.warn('Gagal mengambil lokasi terkini, menggunakan lokasi terakhir', primaryError);
          position = await Location.getLastKnownPositionAsync();
        }

        if (!position) {
          throw new Error('Tidak dapat mendeteksi lokasi perangkat.');
        }

        const { latitude, longitude } = position.coords;

        let formattedLocation = `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;
        let reverseGeocodedLabel: string | null = null;
        try {
          const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
          reverseGeocodedLabel = formatGeocodedLocation(geocoded?.[0] ?? null);
          formattedLocation = reverseGeocodedLabel ?? formattedLocation;
        } catch (reverseError) {
          console.warn('Reverse geocode gagal', reverseError);
        }

        const currentResponse = await fetch(`${BASE_URL}/weather?lat=${latitude}&lon=${longitude}`);

        if (!currentResponse.ok) {
          const text = await currentResponse.text();
          throw new Error(`Gagal memuat cuaca: ${currentResponse.status} ${text}`);
        }

        const currentJson = await currentResponse.json();

        if (!isMounted) return;

        const dailyData: DailyForecast[] = Array.isArray(currentJson?.dailyForecasts)
      ? currentJson.dailyForecasts.slice(0, 7).map((entry: any, index: number) => {
              const isoDate = typeof entry?.isoDate === 'string' ? entry.isoDate : new Date().toISOString();
              const high = parseNumericValue(entry?.highTemp);
              const low = parseNumericValue(entry?.lowTemp);
              const precipitation = parseNumericValue(entry?.precipitationMm);
              const humidity = parseNumericValue(entry?.humidity);
        const iconCodeValue = parseNumericValue(entry?.iconCode);
        const iconCode = iconCodeValue !== null ? Math.round(iconCodeValue) : null;

              return {
                isoDate,
                label: formatDateLabel(isoDate, index),
                icon: mapAccuWeatherIconToEmoji(iconCode),
                highTemp: high,
                lowTemp: low,
                humidity,
                precipitation,
                description: typeof entry?.iconPhrase === 'string' ? entry.iconPhrase : null,
              };
            })
          : [];

        const finalLocationName = reverseGeocodedLabel ?? currentJson.location ?? formattedLocation;

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
          locationName: finalLocationName,
          condition: currentJson.condition ?? (dailyData[0]?.description ?? null),
        };

        setLocationLabel(finalLocationName);
        setCurrentWeather(normalizedCurrent);
        setForecast(dailyData);
        setError(null);
      } catch (err) {
        console.error('WeatherScreen error:', err);
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat cuaca.';
          setError(message);
          Alert.alert('Gagal memuat cuaca', message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWeather();

    return () => {
      isMounted = false;
    };
  }, []);

  const riskSummary = useMemo(() => {
    if (!forecast.length) {
      return {
        score: null,
        level: 'Tidak tersedia',
        description: 'Data cuaca belum tersedia',
      };
    }

    const avgPrecipitation =
      forecast.reduce((total, day) => total + (day.precipitation ?? 0), 0) / forecast.length;
    const representativeHumidity =
      currentWeather.humidity ?? forecast.find((day) => day.humidity !== null)?.humidity ?? 0;

    const rawScore = avgPrecipitation * 4 + (representativeHumidity ?? 0) * 0.4;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    let level = 'Rendah';
    if (score >= 70) {
      level = 'Tinggi';
    } else if (score >= 40) {
      level = 'Sedang';
    }

    const description = `Rata-rata curah hujan ${avgPrecipitation.toFixed(1)} mm per hari`;

    return {
      score,
      level,
      description,
    };
  }, [forecast, currentWeather.humidity]);

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.menuIcon}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Lokasi Ladang</Text>
            <Text style={styles.headerSubtitle}>{currentWeather.locationName || locationLabel}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationIcon}>
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Weather */}
        <View style={styles.currentWeatherCard}>
          {loading ? (
            <ActivityIndicator size="large" color="#4CAF50" />
          ) : (
            <>
              <View style={styles.weatherIcon}>
                <Text style={styles.cloudEmoji}>{forecast[0]?.icon ?? '🌤️'}</Text>
              </View>
              <View style={styles.temperatureContainer}>
                <Text style={styles.temperature}>
                  {currentWeather.highTemp !== null
                    ? `${currentWeather.highTemp.toFixed(0)}°`
                    : currentWeather.temperature !== null
                      ? `${currentWeather.temperature.toFixed(0)}°`
                      : '--'}
                  {currentWeather.lowTemp !== null
                    ? `/${currentWeather.lowTemp.toFixed(0)}°`
                    : ''}
                </Text>
                <Text style={styles.weatherDescription}>
                  {currentWeather.condition ?? forecast[0]?.description ?? 'Prakiraan cuaca harian'}
                </Text>
                <Text style={styles.weatherSubDescription}>
                  {error
                    ? error
                    : 'Pantau cuaca untuk mengatur jadwal penyiraman dan penyemprotan.'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Weather Stats */}
        <View style={styles.weatherStatsContainer}>
          <View style={styles.statItem}>
            <View style={styles.statIcon} />
            <Text style={styles.statLabel}>Kelembaban</Text>
            <Text style={styles.statValue}>
              {currentWeather.humidity !== null ? `${currentWeather.humidity}%` : '--'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIcon} />
            <Text style={styles.statLabel}>Curah Hujan</Text>
            <Text style={styles.statValue}>
              {currentWeather.rainfall !== null ? `${currentWeather.rainfall.toFixed(1)} mm` : '--'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIcon} />
            <Text style={styles.statLabel}>Kec. Angin</Text>
            <Text style={styles.statValue}>
              {currentWeather.windSpeed !== null
                ? `${currentWeather.windSpeed.toFixed(1)} km/jam`
                : '--'}
            </Text>
          </View>
        </View>

        {/* Weather Risk Alert */}
        <View style={styles.riskAlert}>
          <View style={styles.riskHeader}>
            <Text style={styles.riskTitle}>Skor Risiko Cuaca</Text>
            <Text style={styles.riskScore}>
              {riskSummary.score !== null ? `${riskSummary.score}%` : '--'}
            </Text>
          </View>
          <Text style={styles.riskDescription}>Risiko cuaca untuk 7 hari ke depan</Text>
          <Text style={styles.riskLevel}>{riskSummary.level}</Text>
          <Text style={styles.riskDescription}>{riskSummary.description}</Text>
        </View>

        {/* Weekly Forecast */}
        <View style={styles.weeklyForecast}>
          <Text style={styles.weeklyTitle}>Prakiraan 7 Hari ke Depan</Text>
          
          {forecast.length === 0 && !loading ? (
            <Text style={styles.emptyForecastText}>Belum ada data prakiraan untuk lokasi ini.</Text>
          ) : (
            forecast.map((day, index) => (
              <View key={day.isoDate} style={styles.dailyWeatherCard}>
              <View style={styles.dailyWeatherHeader}>
                <Text style={styles.dayText}>{day.label}</Text>
                <Text style={styles.dateText}>{formatShortDate(day.isoDate)}</Text>
                <View style={styles.weatherIconContainer}>
                  <Text style={styles.weatherEmoji}>{day.icon}</Text>
                </View>
              </View>
              {day.description ? (
                <Text style={styles.dayDescription}>{day.description}</Text>
              ) : null}
              
              <View style={styles.dailyWeatherStats}>
                <View style={styles.tempContainer}>
                  <Text style={styles.tempText}>
                    {day.highTemp !== null ? `${day.highTemp.toFixed(0)}°` : '--'}
                    {day.lowTemp !== null ? `/${day.lowTemp.toFixed(0)}°` : ''}
                  </Text>
                </View>
                <View style={styles.humidityContainer}>
                  <Text style={styles.precipitationText}>
                    {day.precipitation !== null ? `${day.precipitation.toFixed(1)} mm` : '--'}
                  </Text>
                </View>
                <View style={styles.humidityPercentage}>
                  <Text style={styles.humidityText}>
                    {day.humidity !== null ? `${day.humidity}%` : '--'}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 15,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: '#333',
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  notificationIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#ddd',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    width: 8,
    height: 8,
    backgroundColor: '#ff6b6b',
    borderRadius: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currentWeatherCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  weatherIcon: {
    marginBottom: 10,
  },
  cloudEmoji: {
    fontSize: 60,
  },
  temperatureContainer: {
    alignItems: 'center',
  },
  temperature: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  weatherDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  weatherSubDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  weatherStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#ddd',
    borderRadius: 15,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  riskAlert: {
    backgroundColor: '#C8E6C9',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  riskScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  riskDescription: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 5,
  },
  riskLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  weeklyForecast: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  emptyForecastText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  weeklyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  dailyWeatherCard: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  dailyWeatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginRight: 15,
  },
  weatherIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherEmoji: {
    fontSize: 24,
  },
  dailyWeatherStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tempContainer: {
    flex: 1,
  },
  tempText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  humidityContainer: {
    flex: 1,
    alignItems: 'center',
  },
  precipitationText: {
    fontSize: 14,
    color: '#666',
  },
  humidityPercentage: {
    flex: 1,
    alignItems: 'flex-end',
  },
  humidityText: {
    fontSize: 14,
    color: '#666',
  },
});
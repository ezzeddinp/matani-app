import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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


interface FieldCardProps {
  name: string;
  image: any;
  area: string;
  status: string;
  isSelected?: boolean;
  onPress: () => void;
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

// NDVI murni
interface NDVIData {
  interval: string;
  ndvi_min: number;
  ndvi_max: number;
  ndvi_mean: number;
  ndvi_stdev: number;
}

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
        {temperature !== null ? `${temperature}°` : "--"}
      </Text>
      <View style={styles.tempRange}>
        <Text style={styles.tempRangeText}>T: {highTemp !== null ? `${highTemp}°` : "--"}</Text>
        <Text style={styles.tempRangeText}>R: {lowTemp !== null ? `${lowTemp}°` : "--"}</Text>
      </View>
    </View>
    
    <View style={styles.weatherStats}>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Kelembaban</Text>
        <Text style={styles.statValue}>{humidity !== null ? `${humidity}%` : "--"}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Curah Hujan</Text>
        <Text style={styles.statValue}>{rainfall !== null ? `${rainfall} mm` : "--"}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Tekanan</Text>
        <Text style={styles.statValue}>{pressure !== null ? `${pressure} hPa` : "--"}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Kec. Angin</Text>
        <Text style={styles.statValue}>{windSpeed !== null ? `${windSpeed} km/h` : "--"}</Text>
      </View>
    </View>
  </View>
);


const FieldCard = ({ name, image, area, status, isSelected, onPress }: FieldCardProps) => (
  <View style={styles.fieldCardContainer}>
    <TouchableOpacity onPress={onPress} style={styles.fieldCard}>
      <Image source={image} style={styles.fieldImage} />
      <View style={styles.fieldOverlay}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: status === 'Sehat' ? '#4CAF50' : '#FF9800' }]}>
          <Text style={styles.statusBadgeText}>{status}</Text>
        </View>
        
        {/* Shaded Area with Plant Name */}
        <View style={[styles.shadedArea, { backgroundColor: status === 'Sehat' ? 'rgba(139, 195, 74, 0.8)' : 'rgba(255, 152, 0, 0.8)' }]}>
          <Text style={styles.plantNameInArea}>{name}</Text>
        </View>
        
        {/* Arrow Button */}
        <View style={styles.fieldArrowButton}>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
    
    {/* Card Info Below */}
    <View style={styles.cardInfo}>
      <Text style={styles.cardTitle}>{name}</Text>
      <Text style={styles.cardSubtitle}>{area}</Text>
    </View>
  </View>
);

const getPlantStatus = (ndvi: number) => {
  if (ndvi > 0.6) return "Sehat";
  if (ndvi > 0.3) return "Stress Ringan";
  return "Stress Berat";
}
export default function HomeScreen() {
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
  const [ndviData, setNativeData] = useState<NDVIData[]>([]);

  // Function untuk mengambil NDVI data berdasarkan koordinat
  const fetchNDVIData = async (latitude: number, longitude: number) => {
    try {
      console.log(`Fetching NDVI data for coordinates: ${latitude}, ${longitude}`);
      
      // Mengatur bounding box sekitar lokasi user (±0.01 derajat = ~1km)
      const bbox = [
        longitude - 0.01, // west
        latitude - 0.01,  // south  
        longitude + 0.01, // east
        latitude + 0.01   // north
      ];

      const response = await fetch(`${BASE_URL}/ndvi?bbox=${bbox.join(",")}`);
      
      if (!response.ok) return null;
      const ndviData = await response.json();
      console.log('NDVI data fetched successfully:', ndviData);

      return ndviData;
    } catch (error) {
      console.warn('Failed to fetch NDVI data:', error);
      return null;
    }
  };

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

    return {
      location: data.location,
      temperature: data.temperature,
      highTemp: data.highTemp,
      lowTemp: data.lowTemp,
      humidity: data.humidity,
      rainfall: data.rainfall,
      pressure: data.pressure,
      windSpeed: data.windSpeed,
    };
  } catch (err) {
    console.error("❌ Weather fetch error:", err);
    return null;
  }
};

  useEffect(() => {
  const fetchLocationAndWeather = async () => {
    try {
      console.log("Requesting location permission...");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied");
        setWeatherData(prev => ({
          ...prev,
          location: "Sleman, Yogyakarta",
          temperature: 23,
          highTemp: 26,
          lowTemp: 20,
          humidity: 76,
          rainfall: 5,
          pressure: 1019,
          windSpeed: 18,
        }));
        setLoading(false);
        return;
      }

      console.log("Location permission granted, getting current position...");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      console.log(`User location: ${latitude}, ${longitude}`);

      // Ambil cuaca dari backend
      const weather = await fetchWeatherData(latitude, longitude);

      // Ambil NDVI data
      const ndvi = await fetchNDVIData(latitude, longitude);
      setNativeData(ndvi || []);

      if (weather) {
        setWeatherData(weather);
      }

      console.log("Weather & NDVI data updated successfully");
    } catch (error) {
      console.error("Error fetching location or weather:", error);
      setWeatherData(prev => ({
        ...prev,
        location: "N/A",
        temperature: 0,
        highTemp: 0,
        lowTemp: 0,
        humidity: 0,
        rainfall: 0,
        pressure: 0,
        windSpeed: 0,
      }));
    } finally {
      setLoading(false);
    }
  };

  fetchLocationAndWeather();
}, []);
 // Empty dependency array is correct here

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8BC34A" />
      
      {/* Header */}
      <LinearGradient colors={['#8BC34A', '#689F38']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>SELAMAT DATANG,</Text>
            <Text style={styles.userName}>PAK AGUS!</Text>
          </View>
          <View style={styles.profilePicture}>
            <Image 
              source={{ uri: 'https://i.pravatar.cc/60' }} 
              style={styles.profileImage} 
            />
          </View>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}></Text>
        </View>
        
        {/* Dashboard Title */}
        <View style={styles.dashboardTitleContainer}>
          <View>
            <Text style={styles.dashboardTitle}>Dashboard</Text>
            <Text style={styles.dashboardSubtitle}>Pertanian</Text>
          </View>
          
          {/* Date Selector */}
          <View style={styles.dateSelector}>
            <Text style={styles.dateText}>19.09.25</Text>
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

        )}
        <Text style={styles.sectionTitle}>Ladang Saya (6)</Text>
        
           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fieldsContainer}>
          {ndviData.length > 0 ? (
            ndviData.map((entry, idx) => (
              <FieldCard
                key={idx}
                name={`Ladang ${idx + 1}`}
                image={{ uri: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300" }}
                area={`12 ha / ${entry.interval}`}
                status={getPlantStatus(entry.ndvi_mean)}
                isSelected={idx === 0}
                onPress={() => {}}
              />
            ))
          ) : (
            <Text style={{ margin: 10 }}>⚠️ NDVI data belum tersedia</Text>
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
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  fieldImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fieldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    marginBottom: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  shadedArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  plantNameInArea: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
  selectedIndicator: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 15,
    padding: 5,
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
});

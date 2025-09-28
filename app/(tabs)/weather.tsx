import { ThemedView } from '@/components/themed-view';
import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WeatherDay {
  day: string;
  date: string;
  icon: string;
  highTemp: number;
  lowTemp: number;
  humidity: number;
  precipitation: string;
}

export default function WeatherScreen() {
  const weeklyWeather: WeatherDay[] = [
    {
      day: 'Hari Ini',
      date: '19 Agu',
      icon: '🌧️',
      highTemp: 28,
      lowTemp: 21,
      humidity: 63,
      precipitation: '5.2mm'
    },
    {
      day: 'Besok',
      date: '20 Agu',
      icon: '⛅',
      highTemp: 29,
      lowTemp: 20,
      humidity: 63,
      precipitation: '15.4mm'
    }
  ];

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
            <Text style={styles.headerSubtitle}>Padang, Jawa Tengah</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationIcon}>
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Weather */}
        <View style={styles.currentWeatherCard}>
          <View style={styles.weatherIcon}>
            <Text style={styles.cloudEmoji}>☁️</Text>
          </View>
          <View style={styles.temperatureContainer}>
            <Text style={styles.temperature}>26°/20°</Text>
            <Text style={styles.weatherDescription}>Hari ini Hujan!</Text>
            <Text style={styles.weatherSubDescription}>Hindari penyemprotan pestisida</Text>
          </View>
        </View>

        {/* Weather Stats */}
        <View style={styles.weatherStatsContainer}>
          <View style={styles.statItem}>
            <View style={styles.statIcon} />
            <Text style={styles.statLabel}>Kelembaban</Text>
            <Text style={styles.statValue}>65%</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIcon} />
            <Text style={styles.statLabel}>Curah Hujan</Text>
            <Text style={styles.statValue}>5.2mm</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIcon} />
            <Text style={styles.statLabel}>Kec. Angin</Text>
            <Text style={styles.statValue}>8 km/h</Text>
          </View>
        </View>

        {/* Weather Risk Alert */}
        <View style={styles.riskAlert}>
          <View style={styles.riskHeader}>
            <Text style={styles.riskTitle}>Skor Risiko Cuaca</Text>
            <Text style={styles.riskScore}>20%</Text>
          </View>
          <Text style={styles.riskDescription}>Risiko cuaca untuk 7 hari ke depan</Text>
          <Text style={styles.riskLevel}>Rendah</Text>
        </View>

        {/* Weekly Forecast */}
        <View style={styles.weeklyForecast}>
          <Text style={styles.weeklyTitle}>Prakiraan 7 Hari ke Depan</Text>
          
          {weeklyWeather.map((day, index) => (
            <View key={index} style={styles.dailyWeatherCard}>
              <View style={styles.dailyWeatherHeader}>
                <Text style={styles.dayText}>{day.day}</Text>
                <Text style={styles.dateText}>{day.date}</Text>
                <View style={styles.weatherIconContainer}>
                  <Text style={styles.weatherEmoji}>{day.icon}</Text>
                </View>
              </View>
              
              <View style={styles.dailyWeatherStats}>
                <View style={styles.tempContainer}>
                  <Text style={styles.tempText}>{day.highTemp}°/{day.lowTemp}°</Text>
                </View>
                <View style={styles.humidityContainer}>
                  <Text style={styles.precipitationText}>{day.precipitation}</Text>
                </View>
                <View style={styles.humidityPercentage}>
                  <Text style={styles.humidityText}>{day.humidity}%</Text>
                </View>
              </View>
            </View>
          ))}
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
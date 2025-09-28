import { ThemedView } from '@/components/themed-view';
import React, { useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MapScreen() {
  const [selectedFilter, setSelectedFilter] = useState('NDVI');

  const filters = ['NDVI', 'Kontras NDVI', 'Pengendapan', 'Tanah'];

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

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {/* Simulated satellite map background */}
        <View style={styles.mapBackground}>
          {/* Field areas */}
          <View style={[styles.fieldArea, styles.jagungArea]}>
            <Text style={styles.fieldLabel}>Jagung</Text>
          </View>
          
          <View style={[styles.fieldArea, styles.kedelaiArea]}>
            <Text style={styles.fieldLabel}>Kedelai</Text>
          </View>
          
          <View style={[styles.fieldArea, styles.padiArea]}>
            <Text style={styles.fieldLabel}>Padi</Text>
          </View>
        </View>

        {/* Map controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.zoomButton}>
            <Text style={styles.zoomText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomButton}>
            <Text style={styles.zoomText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.locationButton}>
            <View style={styles.locationIcon} />
          </TouchableOpacity>
        </View>
      </View>

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

      {/* New Field Button */}
      <TouchableOpacity style={styles.newFieldButton}>
        <View style={styles.cameraIcon} />
        <Text style={styles.newFieldText}>Gambar Lahan Baru</Text>
      </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
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
    fontSize: 18,
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
  mapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
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
  mapControls: {
    position: 'absolute',
    top: 20,
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
});
import { ThemedView } from '@/components/themed-view';
import React, { useState, useEffect, useRef } from 'react';
import { 
  StatusBar, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert,
  Modal,
  TextInput,
  Dimensions
} from 'react-native';
import MapView, { Polygon, Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

export default function ExploreScreen() {
  const [selectedFilter, setSelectedFilter] = useState('NDVI');
  const [drawingMode, setDrawingMode] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [lahanName, setLahanName] = useState('');
  const [polygonCoords, setPolygonCoords] = useState<{latitude: number, longitude: number}[]>([]);
  const [currentPath, setCurrentPath] = useState<{latitude: number, longitude: number}[]>([]);
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState({
    latitude: -6.2088,
    longitude: 106.8456,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const filters = ['NDVI', 'Kontras NDVI', 'Pengendapan', 'Tanah'];

  // Get user location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      console.log('📍 Requesting location permission...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Location permission denied');
        Alert.alert('Permission Denied', 'Lokasi diperlukan untuk menampilkan peta');
        return;
      }

      console.log('✅ Getting current position...');
      let location = await Location.getCurrentPositionAsync({});
      console.log(`📍 User location: ${location.coords.latitude}, ${location.coords.longitude}`);
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error('❌ Location error:', error);
      Alert.alert('Error', 'Gagal mendapatkan lokasi');
    }
  };

  // Enhanced map interaction for polygon drawing like in the image
  const handleMapPress = (event: any) => {
    if (!drawingMode) return;

    const coordinate = event.nativeEvent.coordinate;
    
    if (currentPath.length === 0) {
      // Start new drawing
      console.log('🖊️ Starting polygon at:', coordinate);
      setCurrentPath([coordinate]);
    } else {
      // Add point to current drawing
      console.log('➕ Adding point:', coordinate);
      setCurrentPath(prev => [...prev, coordinate]);
    }
  };

  const calculateArea = (coordinates: {latitude: number, longitude: number}[]) => {
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

  const startDrawing = () => {
    setDrawingMode(true);
    setPolygonCoords([]);
    setCurrentPath([]);
    Alert.alert(
      'Mode Gambar Aktif', 
      'Tap pada peta untuk menandai titik-titik polygon. Seperti pada contoh gambar.'
    );
  };

  const finishDrawing = () => {
    if (currentPath.length < 3) {
      Alert.alert('Error', 'Minimal 3 titik diperlukan untuk membuat polygon lahan.');
      return;
    }
    
    // Close the polygon by using the current path
    setPolygonCoords([...currentPath]);
    setDrawingMode(false);
    setShowSaveModal(true);
  };

  const cancelDrawing = () => {
    setDrawingMode(false);
    setPolygonCoords([]);
    setCurrentPath([]);
  };

  const undoLastPoint = () => {
    if (currentPath.length > 1) {
      const reducedPath = currentPath.slice(0, -1);
      setCurrentPath(reducedPath);
    }
  };

  const saveLahan = () => {
    if (!lahanName.trim()) {
      Alert.alert('Error', 'Nama lahan tidak boleh kosong');
      return;
    }
    
    // TODO: Save to database
    console.log('💾 Saving lahan:', {
      name: lahanName,
      coordinates: polygonCoords,
      area: calculateArea(polygonCoords)
    });
    
    setShowSaveModal(false);
    setLahanName('');
    setPolygonCoords([]);
    setCurrentPath([]);
    Alert.alert('Sukses', `Lahan "${lahanName}" berhasil disimpan!\nLuas: ${calculateArea(polygonCoords).toFixed(2)} ha`);
  };

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

      {/* Map Container - Real MapView */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={userLocation}
          onPress={handleMapPress}
          mapType="satellite"
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {/* Render current drawing as connected lines (like in the image) */}
          {drawingMode && currentPath.length > 1 && (
            <>
              <Polyline
                coordinates={currentPath}
                strokeColor="#FF5722"
                strokeWidth={4}
                lineDashPattern={[8, 4]}
              />
              {/* Show preview of closing line */}
              {currentPath.length > 2 && (
                <Polyline
                  coordinates={[currentPath[currentPath.length - 1], currentPath[0]]}
                  strokeColor="#FF5722"
                  strokeWidth={2}
                  lineDashPattern={[3, 3]}
                />
              )}
            </>
          )}

          {/* Render completed polygon with fill like in the image */}
          {polygonCoords.length > 2 && !drawingMode && (
            <Polygon
              coordinates={polygonCoords}
              fillColor="rgba(255, 87, 34, 0.4)"
              strokeColor="#FF5722"
              strokeWidth={4}
            />
          )}

          {/* Show vertex points during drawing */}
          {drawingMode && currentPath.map((coord, index) => (
            <Marker
              key={index}
              coordinate={coord}
              anchor={{x: 0.5, y: 0.5}}
            >
              <View style={[
                styles.drawingVertex,
                index === 0 && styles.startVertex,
                index === currentPath.length - 1 && styles.currentVertex
              ]} />
            </Marker>
          ))}

          {/* Mock existing lahan - Green field */}
          <Polygon
            coordinates={[
              { latitude: userLocation.latitude + 0.002, longitude: userLocation.longitude + 0.002 },
              { latitude: userLocation.latitude + 0.004, longitude: userLocation.longitude + 0.002 },
              { latitude: userLocation.latitude + 0.004, longitude: userLocation.longitude + 0.005 },
              { latitude: userLocation.latitude + 0.002, longitude: userLocation.longitude + 0.005 },
            ]}
            fillColor="rgba(139, 195, 74, 0.3)"
            strokeColor="#8BC34A"
            strokeWidth={3}
          />
        </MapView>

        {/* Map controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.zoomButton}>
            <Text style={styles.zoomText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomButton}>
            <Text style={styles.zoomText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
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
            <Text style={styles.finishButtonText}>Selesai ({currentPath.length} titik)</Text>
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
            📍 Tap pada peta untuk menandai titik polygon • {currentPath.length} titik
          </Text>
          {currentPath.length >= 3 && (
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
              Luas: {calculateArea(currentPath).toFixed(2)} ha
            </Text>
            <Text style={styles.modalSubtitle}>
              {currentPath.length} titik koordinat
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
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={saveLahan}>
                <Text style={styles.modalSaveText}>Simpan</Text>
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
    backgroundColor: '#ff6b6b',
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
  },
  currentVertex: {
    backgroundColor: '#FFC107',
    width: 14,
    height: 14,
    borderRadius: 7,
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
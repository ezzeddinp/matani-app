import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');
const HERO_IMAGE_URI =
  'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80';
const LOGO_SOURCE = require('../assets/images/matani-logo.png');

export default function OnboardingScreen() {
  const router = useRouter();

  const handleContinue = () => {
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={LOGO_SOURCE} resizeMode="contain" style={styles.logo} />
        <Text style={styles.brand}>Selamat Datang di MATANI</Text>
        <Text style={styles.subtitle}>
          Temukan wawasan pertanian, pantau lahan Anda, dan raih panen terbaik bersama kami.
        </Text>
      </View>

      <View style={styles.heroContainer}>
        <ExpoImage
          source={{ uri: HERO_IMAGE_URI }}
          style={styles.heroImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.75)"]}
          style={styles.heroOverlay}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <View style={styles.overlayContent}>
            <Text style={styles.overlayTitle}>Solusi Pertanian Cerdas</Text>
            <Text style={styles.overlayText}>
              Pantau cuaca, perubahan NDVI/NDMI dari waktu ke waktu, dan catatan lahan padi dalam satu aplikasi.
            </Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={handleContinue}>
          <Text style={styles.primaryButtonLabel}>Mulai Sekarang</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: 12,
  },
  brand: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2F3B1C',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#60635C',
  },
  heroContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: height * 0.45,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  overlayContent: {
    gap: 8,
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overlayText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#E4E6E1',
  },
  actions: {
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: '#2F7D32',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F7D32',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

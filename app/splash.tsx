import { supabase } from '@/hooks/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const HERO_IMAGE_URI =
  'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&w=1200&q=80';
const LOGO_SOURCE = require('../assets/images/icon.png');

export default function SplashScreen() {
  const router = useRouter();
  const [interactionReady, setInteractionReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const logoScale = useRef(new Animated.Value(3.6)).current;
  const logoTranslateX = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateX = useRef(new Animated.Value(24)).current;
  const finalOpacity = useRef(new Animated.Value(0)).current;

  const initialStageOpacity = useMemo(
    () =>
      finalOpacity.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [1, 0.4, 0],
      }),
    [finalOpacity]
  );

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(logoScale, {
        toValue: 1.25,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateX, {
        toValue: -68,
        duration: 520,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateX, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(400),
      Animated.timing(finalOpacity, {
        toValue: 1,
        duration: 620,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setInteractionReady(true));
  }, [finalOpacity, logoScale, logoTranslateX, textOpacity, textTranslateX]);

  const handleStart = useCallback(async () => {
    if (!interactionReady || isNavigating) {
      return;
    }

    setIsNavigating(true);
    try {
      const { data } = await supabase.auth.getSession();
      const hasActiveSession = Boolean(data?.session);

      if (hasActiveSession) {
        router.replace('/(tabs)');
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.warn('Gagal mengecek sesi Supabase:', error);
      router.push('/auth/login');
    } finally {
      setIsNavigating(false);
    }
  }, [interactionReady, isNavigating, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.stageContainer, { opacity: initialStageOpacity }]}>
          <View style={styles.shapeLayer}>
            <View style={styles.topArc} />
            <View style={styles.leftLeaf} />
            <View style={styles.rightLeaf} />
          </View>

          <Animated.View
            style={[
              styles.logoRow,
              {
                transform: [{ translateX: logoTranslateX }],
              },
            ]}
          >
            <Animated.Image
              source={LOGO_SOURCE}
              resizeMode="contain"
              style={[
                styles.logoImage,
                {
                  transform: [{ scale: logoScale }],
                },
              ]}
            />
            <Animated.Text
              style={[
                styles.logoText,
                {
                  opacity: textOpacity,
                  transform: [{ translateX: textTranslateX }],
                },
              ]}
            >
              MATANI
            </Animated.Text>
          </Animated.View>
        </Animated.View>

        <Animated.View
          pointerEvents={interactionReady && !isNavigating ? 'auto' : 'none'}
          style={[
            styles.finalStage,
            {
              opacity: finalOpacity,
            },
          ]}
        >
          <View style={styles.finalHeader}>
            <Image source={LOGO_SOURCE} style={styles.finalLogo} resizeMode="contain" />
            <Text style={styles.finalBrand}>MATANI</Text>
          </View>

          <View style={styles.heroCopy}>
            <View style={styles.heroHeadlineRow}>
              <Text style={styles.heroHeadingGreen}>Panen</Text>
              <View style={styles.heroDivider} />
              <Text style={styles.heroHeadingOrange}>Masa Depan</Text>
            </View>
            <Text style={styles.heroSubtitle}>
              Solusi pertanian berkelanjutan {'\n'}untuk masa depan yang lebih baik.
            </Text>
          </View>

          <ImageBackground
            source={{ uri: HERO_IMAGE_URI }}
            style={styles.heroImage}
            imageStyle={styles.heroImageRadius}
          >
            <LinearGradient
              colors={[
                'rgba(0, 0, 0, 0.0)',
                'rgba(0, 0, 0, 0.55)',
              ]}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 0, y: 1 }}
              style={styles.heroGradient}
            />
          </ImageBackground>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={handleStart}
            disabled={!interactionReady || isNavigating}
          >
            {isNavigating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonLabel}>Yuk Mulai</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  stageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  shapeLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  topArc: {
    position: 'absolute',
    top: -140,
    left: -160,
    right: -160,
    height: 260,
    backgroundColor: '#B66A1F',
    borderBottomLeftRadius: 260,
    borderBottomRightRadius: 260,
  },
  leftLeaf: {
    position: 'absolute',
    bottom: -220,
    left: -220,
    width: 400,
    height: 520,
    backgroundColor: '#526F23',
    borderTopRightRadius: 420,
    borderBottomRightRadius: 140,
  },
  rightLeaf: {
    position: 'absolute',
    bottom: -260,
    right: -200,
    width: 380,
    height: 520,
    backgroundColor: '#46601C',
    borderTopLeftRadius: 420,
    borderBottomLeftRadius: 160,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 128,
    height: 128,
  },
  logoText: {
    marginLeft: 16,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#C7782A',
    textTransform: 'uppercase',
  },
  finalStage: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 28,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'flex-start',
  },
  finalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  finalLogo: {
    width: 34,
    height: 34,
    marginRight: 12,
  },
  finalBrand: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#C7782A',
  },
  heroCopy: {
    marginTop: 52,
  },
  heroHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroHeadingGreen: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3E7428',
  },
  heroDivider: {
    flex: 1,
    height: 2,
    marginHorizontal: 16,
    backgroundColor: '#C7782A',
    borderRadius: 2,
  },
  heroHeadingOrange: {
    fontSize: 28,
    fontWeight: '700',
    color: '#C7782A',
  },
  heroSubtitle: {
    marginTop: 18,
    fontSize: 15,
    lineHeight: 22,
    color: '#5A5953',
  },
  heroImage: {
    marginTop: 32,
    height: 280,
    borderRadius: 26,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroImageRadius: {
    borderRadius: 26,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  primaryButton: {
    marginTop: 28,
    alignSelf: 'stretch',
    borderRadius: 30,
    paddingVertical: 14,
    backgroundColor: '#D88132',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D88132',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
});
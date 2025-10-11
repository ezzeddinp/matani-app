import { supabase } from '@/hooks/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HERO_IMAGE_URI =
  'https://images.unsplash.com/photo-1516975588690-6c3b97aa0f7f?auto=format&fit=crop&w=1200&q=80';
const LOGO_SOURCE = require('../assets/images/matani-logo.png');
const HERO_IMAGE_HEIGHT = Math.round(Dimensions.get('window').height * 0.6);
const DEBUG_LOGO_ONLY = false;
const DEBUG_LOOP_INTRO = false;

export default function SplashScreen() {
  const router = useRouter();
  const [interactionReady, setInteractionReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const logoScale = useRef(new Animated.Value(3.6)).current;
  const logoTranslateX = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateX = useRef(new Animated.Value(24)).current;
  const finalOpacity = useRef(new Animated.Value(0)).current;
  const autoNavigateRef = useRef(false);

  const initialStageOpacity = useMemo(
    () =>
      finalOpacity.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [1, 0.4, 0],
      }),
    [finalOpacity]
  );

  useEffect(() => {
    let isMounted = true;
    let currentAnimation: Animated.CompositeAnimation | null = null;

    const createTimeline = () => {
      const baseTimeline: Animated.CompositeAnimation[] = [
        Animated.delay(200),
        Animated.timing(logoScale, {
          toValue: 1,
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
          toValue: -72,
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
            toValue: -70,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ];

      if (!DEBUG_LOGO_ONLY) {
        baseTimeline.push(
          Animated.delay(400),
          Animated.timing(finalOpacity, {
            toValue: 1,
            duration: 620,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          })
        );
      }

      return baseTimeline;
    };

    const playIntro = () => {
      logoScale.setValue(3.6);
      logoTranslateX.setValue(0);
      textOpacity.setValue(0);
      textTranslateX.setValue(24);
      finalOpacity.setValue(0);

      currentAnimation = Animated.sequence(createTimeline());
      currentAnimation.start(({ finished }) => {
        if (!isMounted) {
          return;
        }

        if (finished) {
          setInteractionReady(true);

          if (DEBUG_LOOP_INTRO) {
            requestAnimationFrame(playIntro);
          }
        }
      });
    };

    playIntro();

    return () => {
      isMounted = false;
      if (currentAnimation) {
        currentAnimation.stop();
      }
    };
  }, [finalOpacity, logoScale, logoTranslateX, textOpacity, textTranslateX]);

  const handleStart = useCallback(async () => {
    if (DEBUG_LOGO_ONLY) {
      console.log('Debug: splash navigation disabled.');
      return;
    }

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
        router.replace('/auth/login');
      }
    } catch (error) {
      console.warn('Gagal mengecek sesi Supabase:', error);
  router.replace('/auth/login');
    } finally {
      setIsNavigating(false);
    }
  }, [interactionReady, isNavigating, router]);

  useEffect(() => {
    if (!interactionReady || autoNavigateRef.current || DEBUG_LOGO_ONLY) {
      return;
    }

    autoNavigateRef.current = true;
    const timeoutId = setTimeout(() => {
      handleStart();
    }, 1600);

    return () => clearTimeout(timeoutId);
  }, [interactionReady, handleStart]);

  const finalStageOpacityValue = DEBUG_LOGO_ONLY ? 0 : finalOpacity;
  const finalStagePointerEvents = DEBUG_LOGO_ONLY
    ? 'none'
    : interactionReady && !isNavigating
    ? 'auto'
    : 'none';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.stageContainer, { opacity: initialStageOpacity }]}>
          {/* <View style={styles.shapeLayer}>
            <View style={styles.topArc} />
            <View style={styles.leftLeaf} />
            <View style={styles.rightLeaf} />
          </View> */}

          <Animated.View style={styles.logoRow}>
            <Animated.Image
              source={LOGO_SOURCE}
              resizeMode="contain"
              style={[
                styles.logoImage,
                {
                  transform: [{ scale: logoScale }, { translateX: logoTranslateX }],
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
          pointerEvents={finalStagePointerEvents}
          style={[
            styles.finalStage,
            {
              opacity: finalStageOpacityValue,
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
              colors={['rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.72)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.heroGradient}
            >
              <TouchableOpacity
                style={[styles.primaryButton, (!interactionReady || isNavigating) && styles.primaryButtonDisabled]}
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
            </LinearGradient>
          </ImageBackground>
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
  // topArc: {
  //   position: 'absolute',
  //   top: -140,
  //   left: -160,
  //   right: -160,
  //   height: 260,
  //   backgroundColor: '#B66A1F',
  //   borderBottomLeftRadius: 260,
  //   borderBottomRightRadius: 260,
  // },
  // leftLeaf: {
  //   position: 'absolute',
  //   bottom: -220,
  //   left: -220,
  //   width: 400,
  //   height: 520,
  //   backgroundColor: '#526F23',
  //   borderTopRightRadius: 420,
  //   borderBottomRightRadius: 140,
  // },
  // rightLeaf: {
  //   position: 'absolute',
  //   bottom: -260,
  //   right: -200,
  //   width: 380,
  //   height: 520,
  //   backgroundColor: '#46601C',
  //   borderTopLeftRadius: 420,
  //   borderBottomLeftRadius: 160,
  // },
  logoRow: {
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    maxWidth: 280,
  },
  logoImage: {
    width: 64,
    height: 64,
    position: 'absolute',
    left: '50%',
    marginLeft: -32,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#C7782A',
    textTransform: 'uppercase',
    position: 'absolute',
    left: '50%',
    marginLeft: 48,
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
    marginTop: 32,
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
    height: HERO_IMAGE_HEIGHT,
    borderRadius: 26,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroImageRadius: {
    borderRadius: 26,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 24,
    paddingBottom: 28,
    justifyContent: 'flex-end',
  },
  primaryButton: {
    width: '100%',
    alignSelf: 'center',
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
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
});
import { supabase } from '@/hooks/supabase';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LOGO_SOURCE = require('../assets/images/matani-logo.png');
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
  const autoNavigateRef = useRef(false);

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

      return baseTimeline;
    };

    const playIntro = () => {
      logoScale.setValue(3.6);
      logoTranslateX.setValue(0);
      textOpacity.setValue(0);
      textTranslateX.setValue(24);

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
  }, [logoScale, logoTranslateX, textOpacity, textTranslateX]);

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

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={styles.stageContainer}>
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
});
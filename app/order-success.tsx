import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const TEXT_COLOR = '#1A1A1A';

export default function OrderSuccessScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    let soundObj: Audio.Sound | null = null;
    let fallbackTimer: NodeJS.Timeout;

    const playSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/zomato.mp3')
        );
        soundObj = sound;

        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            clearTimeout(fallbackTimer);
            // Add a tiny buffer after sound ends before switching screens
            setTimeout(navigateToTracking, 400);
          }
        });

        await sound.setVolumeAsync(1.0);
        await sound.playAsync();
      } catch (error) {
        console.warn("Could not play sound", error);
        // If sound fails, fallback to standard timer
        fallbackTimer = setTimeout(navigateToTracking, 3000);
      }
    };

    playSound();

    // Fallback timer just in case audio gets stuck
    fallbackTimer = setTimeout(navigateToTracking, 7000);

    return () => {
      clearTimeout(fallbackTimer);
      if (soundObj) {
        soundObj.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const navigateToTracking = () => {
    if (orderId) {
      router.replace(`/orders/${orderId}`);
    } else {
      router.replace('/(tabs)/orders');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={styles.centerContent}>
        {/* Zomato style Big simple check animation */}
        <Animated.View entering={ZoomIn.duration(400).duration(400)}>
          <LottieView
            source={require('../public/Done.json')}
            autoPlay
            loop={false}
            style={styles.lottie}
            speed={1.0}
          />
        </Animated.View>

      {/* Clean text below animation */}
      <View style={styles.textContainer}>
        <Animated.Text entering={FadeInDown.delay(600).duration(400)} style={styles.title}>
          Order Placed
        </Animated.Text>
        
        {/* Simple muted subtitle */}
        <Animated.Text entering={FadeInDown.delay(700).duration(400)} style={styles.subtitle}>
          Sit back & relax, the restaurant is preparing your food.
        </Animated.Text>
      </View>
      
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: -80, // slightly bumped up to look aesthetically balanced
  },
  lottie: {
    width: width * 0.9,
    height: width * 0.9,
    marginBottom: -50,
  },
  title: { 
    fontFamily: 'Inter-Black', 
    fontSize: 28, 
    color: TEXT_COLOR, 
    textAlign: 'center', 
    marginBottom: 8 
  },
  subtitle: { 
    fontFamily: 'Inter-Medium', 
    fontSize: 16, 
    color: '#6B7280', 
    textAlign: 'center', 
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
  },
  trackBtn: {
    width: '100%', 
    paddingVertical: 18, 
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    shadowColor: PRIMARY, 
    shadowOpacity: 0.25, 
    shadowRadius: 10, 
    shadowOffset: { width: 0, height: 4 }, 
    elevation: 4,
  },
  trackBtnText: { 
    fontFamily: 'Inter-Bold', 
    fontSize: 16, 
    color: '#FFFFFF' 
  },
});

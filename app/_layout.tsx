import { useEffect, useState } from 'react';
import { StyleSheet, Dimensions, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { FadeOut, FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../constants/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { useCartStore } from '../store/useCartStore';
import { restaurantApi } from '../services/api';

SplashScreen.preventAutoHideAsync();
const { width } = Dimensions.get('window');

function RootLayoutInner() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setRestaurant = useRestaurantStore((s) => s.setRestaurant);
  const setLoading = useRestaurantStore((s) => s.setLoading);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const authLoading = useAuthStore((s) => s.isLoading);

  const [fontsLoaded] = useFonts({
    'Inter': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
    'Inter-Black': Inter_900Black,
  });

  useEffect(() => {
    loadFromStorage();
    // Fetch restaurant info
    restaurantApi.get()
      .then((res) => setRestaurant(res.data))
      .catch(() => setLoading(false));
  }, []);

  // Fetch cart when user is authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      fetchCart();
    }
  }, [isAuthenticated()]);

  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    async function playSplashSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://www.myinstants.com/media/sounds/discord-notification.mp3' }
        );
        await sound.setVolumeAsync(1.0);
        await sound.playAsync();
        setTimeout(() => sound.unloadAsync(), 3000); // Cleanup after played
      } catch (error) {
        console.log("Audio play error:", error);
      }
    }

    if (fontsLoaded && !authLoading) {
      playSplashSound();
      SplashScreen.hideAsync();
      setTimeout(() => setShowAnimatedSplash(false), 2800); // slightly longer for the text animations
    }
  }, [fontsLoaded, authLoading]);

  if (!fontsLoaded || authLoading) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      {showAnimatedSplash && (
        <Animated.View
          exiting={FadeOut.duration(600)}
          pointerEvents={fontsLoaded && !authLoading ? 'none' : 'auto'}
          style={[StyleSheet.absoluteFillObject, { zIndex: 9999 }]}
        >
          <LinearGradient
            colors={['#FF4122', '#F96C00']} // Premium ultra-vibrant gradient (Swiggy/Zomato pro feel)
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}
          >
            <Animated.View entering={FadeIn.duration(1200)}>
              <Image 
                 source={require('../assets/logo/restaurantLOGO.png')} 
                 style={{ width: 190, height: 190 }} 
                 contentFit="contain" 
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(300).duration(800)} style={{ marginTop: 24, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter-Black', fontSize: 34, color: '#FFFFFF', letterSpacing: -1 }}>Haldia Cloud</Text>
              <Text style={{ fontFamily: 'Inter-Black', fontSize: 34, color: '#FFFFFF', letterSpacing: -1, marginTop: -8 }}>Kitchen</Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(600).duration(800)}>
               <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#FFDDC2', marginTop: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Premium Delivery</Text>
            </Animated.View>

            {/* Glowing ring animation behind or below */}
            <Animated.View entering={FadeIn.delay(800).duration(1000)} style={{ position: 'absolute', bottom: 60 }}>
               <LottieView
                  source={require('../public/loading-animation.json')}
                  autoPlay
                  loop={true}
                  style={{ width: 80, height: 80, opacity: 0.4 }}
                  speed={0.8}
               />
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="cart" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="addresses" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="orders/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

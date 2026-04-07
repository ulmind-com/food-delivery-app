import { useEffect, useState } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { FadeOut, FadeInDown } from 'react-native-reanimated';
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
    if (fontsLoaded && !authLoading) {
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
          exiting={FadeOut.duration(500)}
          style={[StyleSheet.absoluteFillObject, { backgroundColor: '#FFF5EC', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }]}
        >
          <LottieView
            source={require('../public/Loading animation for Food app.json')}
            autoPlay
            loop={false}
            style={{ width: width * 0.9, height: width * 0.9 }}
            speed={0.9}
          />
          <Animated.Text
            entering={FadeInDown.delay(300).springify().damping(12)}
            style={{ fontFamily: 'Inter-Black', fontSize: 32, color: '#FC8019', marginTop: -55, letterSpacing: -0.5 }}
          >
            QuickBite
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(500).springify().damping(14)}
            style={{ fontFamily: 'Inter-Medium', fontSize: 16, color: '#F97316', opacity: 0.85, marginTop: -2 }}
          >
            Delivering happiness to your door
          </Animated.Text>
        </Animated.View>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)/welcome" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="(auth)/login"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="(auth)/register"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="cart" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="addresses" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="orders/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="chat" options={{ animation: 'slide_from_right' }} />
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

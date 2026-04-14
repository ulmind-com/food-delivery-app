import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#FC8019';

export default function WelcomeScreen() {
  const router = useRouter();

  // Animations
  const imageOpacity = useSharedValue(0);
  const imageScale = useSharedValue(0.8);
  const btnOpacity = useSharedValue(0);
  const btnTranslateY = useSharedValue(40);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    imageOpacity.value = withDelay(100, withTiming(1, { duration: 800 }));
    imageScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));
    btnOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    btnTranslateY.value = withDelay(400, withSpring(0, { damping: 14, stiffness: 100 }));
    textOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
  }, []);

  const imageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ scale: imageScale.value }],
  }));
  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnTranslateY.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Dark Gradient Overlay equivalent */}
      <View style={styles.gradientOverlay} />

      {/* Hero Video */}
      <Animated.View style={[styles.imageContainer, imageStyle]}>
        <Video
          source={require('../../assets/Video/videoStart-compressed.mp4')}
          style={styles.heroImage}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay
          isMuted
          useNativeControls={false}
        />
        {/* Adds a fade to bottom so the video blends with the dark bottom */}
        <View style={styles.imageBottomFade} />
      </Animated.View>

      {/* Content Area at bottom */}
      <View style={styles.bottomArea}>
        {/* Get Started Button */}
        <Animated.View style={[btnStyle, { width: '100%', alignItems: 'center' }]}>
          <TouchableOpacity
            style={styles.getStartedBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Separator / Divider - Optional based on the design, omitted for cleaner look */}
        
        {/* Login Link */}
        <Animated.View style={[styles.footer, textStyle]}>
          <Text style={styles.footerTxt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} hitSlop={10}>
            <Text style={styles.footerLink}>Login</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F', // Dark background
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000',
    opacity: 0.6,
    zIndex: 1,
  },
  imageContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: height * 0.75, // Takes up 75% of height
    zIndex: 2,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageBottomFade: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 200,
    backgroundColor: 'transparent',
    // We would use LinearGradient here, but simulating it with shadow/color for pure RN
    shadowColor: '#0F0F0F',
    shadowOffset: { width: 0, height: 100 },
    shadowOpacity: 1,
    shadowRadius: 100,
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: height * 0.35,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 24,
    backgroundColor: '#0F0F0F', // Ensures bottom is solid dark
  },
  getStartedBtn: {
    backgroundColor: PRIMARY,
    width: width * 0.6, // Matching the pill width from design
    height: 56,
    borderRadius: 28, // Pill shape
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 40,
  },
  getStartedText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1A1A1A', // Dark text on orange button
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerTxt: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#9CA3AF',
  },
  footerLink: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#FFFFFF', // White matches dark theme perfectly
  },
});

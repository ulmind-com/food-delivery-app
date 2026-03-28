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
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  withSequence,
} from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#FC8019';

export default function WelcomeScreen() {
  const router = useRouter();

  // Animations
  const bgCircle1 = useSharedValue(0);
  const bgCircle2 = useSharedValue(0);
  const bgCircle3 = useSharedValue(0);
  const imageScale = useSharedValue(0.3);
  const imageOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(40);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(25);
  const btnOpacity = useSharedValue(0);
  const btnScale = useSharedValue(0.8);
  const dotsOpacity = useSharedValue(0);

  useEffect(() => {
    // Background circles
    bgCircle1.value = withDelay(0, withSpring(1, { damping: 15, stiffness: 80 }));
    bgCircle2.value = withDelay(150, withSpring(1, { damping: 15, stiffness: 80 }));
    bgCircle3.value = withDelay(300, withSpring(1, { damping: 15, stiffness: 80 }));
    // Hero image
    imageOpacity.value = withDelay(350, withTiming(1, { duration: 700 }));
    imageScale.value = withDelay(350, withSpring(1, { damping: 12, stiffness: 150 }));
    // Title
    titleOpacity.value = withDelay(700, withTiming(1, { duration: 600 }));
    titleY.value = withDelay(700, withSpring(0, { damping: 18, stiffness: 200 }));
    // Subtitle
    subtitleOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    subtitleY.value = withDelay(900, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
    // Button
    btnOpacity.value = withDelay(1100, withTiming(1, { duration: 400 }));
    btnScale.value = withDelay(1100, withSpring(1, { damping: 14, stiffness: 200 }));
    // Pagination dots
    dotsOpacity.value = withDelay(1200, withTiming(1, { duration: 400 }));
  }, []);

  const circle1Style = useAnimatedStyle(() => ({ transform: [{ scale: bgCircle1.value }] }));
  const circle2Style = useAnimatedStyle(() => ({ transform: [{ scale: bgCircle2.value }] }));
  const circle3Style = useAnimatedStyle(() => ({ transform: [{ scale: bgCircle3.value }] }));
  const imageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ scale: imageScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));
  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ scale: btnScale.value }],
  }));
  const dotsStyle = useAnimatedStyle(() => ({ opacity: dotsOpacity.value }));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Decorative background circles */}
      <Animated.View style={[styles.bgCircle1, circle1Style]} />
      <Animated.View style={[styles.bgCircle2, circle2Style]} />
      <Animated.View style={[styles.bgCircle3, circle3Style]} />

      {/* Decorative small elements */}
      <View style={[styles.smallDot, { top: '12%', left: '8%', backgroundColor: '#FFD699' }]} />
      <View style={[styles.smallDot, { top: '20%', right: '12%', backgroundColor: '#FEB76E' }]} />
      <View style={[styles.smallDot, { top: '45%', left: '5%', backgroundColor: '#FFE5C4', width: 14, height: 14, borderRadius: 7 }]} />
      <View style={[styles.smallDot, { bottom: '35%', right: '6%', backgroundColor: '#FFD699' }]} />

      {/* Hero Illustration */}
      <Animated.View style={[styles.imageContainer, imageStyle]}>
        <Image
          source={require('../../assets/images/delivery-hero.png')}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Content */}
      <View style={styles.contentArea}>
        <Animated.View style={titleStyle}>
          <Text style={styles.titleLine1}>Fastest</Text>
          <Text style={styles.titleLine2}>Food <Text style={styles.titleHighlight}>Delivery</Text></Text>
          <Text style={styles.titleLine3}>At Your Door</Text>
        </Animated.View>

        <Animated.View style={[styles.subtitleWrap, subtitleStyle]}>
          <Text style={styles.subtitle}>
            Discover restaurants near you and get your favourite meal delivered fresh — in minutes, not hours.
          </Text>
        </Animated.View>

        {/* Pagination dots */}
        <Animated.View style={[styles.dotsRow, dotsStyle]}>
          <View style={[styles.paginationDot, styles.dotActive]} />
          <View style={styles.paginationDot} />
          <View style={styles.paginationDot} />
        </Animated.View>
      </View>

      {/* CTA Button */}
      <Animated.View style={[styles.ctaContainer, btnStyle]}>
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.ctaText}>Get Started</Text>
          <View style={styles.ctaArrow}>
            <ChevronRight size={20} color={PRIMARY} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFCF7',
  },
  // Background decorative circles
  bgCircle1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FC8019',
    opacity: 0.08,
  },
  bgCircle2: {
    position: 'absolute',
    top: height * 0.3,
    left: -70,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFB347',
    opacity: 0.1,
  },
  bgCircle3: {
    position: 'absolute',
    bottom: -50,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FC8019',
    opacity: 0.06,
  },
  smallDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Hero image
  imageContainer: {
    alignItems: 'center',
    paddingTop: height * 0.08,
    paddingBottom: 10,
  },
  heroImage: {
    width: width * 0.75,
    height: width * 0.65,
  },
  // Content
  contentArea: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  titleLine1: {
    fontFamily: 'Inter-Bold',
    fontSize: 34,
    color: '#3D4152',
    letterSpacing: -0.5,
  },
  titleLine2: {
    fontFamily: 'Inter-ExtraBold',
    fontSize: 34,
    color: '#3D4152',
    letterSpacing: -0.5,
  },
  titleHighlight: {
    color: PRIMARY,
    fontStyle: 'italic',
  },
  titleLine3: {
    fontFamily: 'Inter-Bold',
    fontSize: 34,
    color: '#3D4152',
    letterSpacing: -0.5,
  },
  subtitleWrap: {
    marginTop: 16,
    paddingRight: 20,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 23,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E2E8',
  },
  dotActive: {
    width: 28,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  // CTA
  ctaContainer: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 50 : 36,
  },
  ctaButton: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FC8019',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'center',
  },
  ctaArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

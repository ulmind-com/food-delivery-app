import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ShoppingBag, ArrowRight } from 'lucide-react-native';
import Animated, { 
  useSharedValue, useAnimatedStyle, withSpring, withTiming, 
  Easing, withRepeat, withSequence, interpolate
} from 'react-native-reanimated';
import { useCartStore } from '../store/useCartStore';

const PRIMARY = '#16A34A'; // Zomato green
const PRIMARY_DARK = '#15803D';

export function FloatingCartBar() {
  const router = useRouter();
  
  const items = useCartStore((s) => s.items);
  const finalPrice = useCartStore((s) => s.finalPrice);
  
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (items.length > 0) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 280, mass: 0.8 });
      opacity.value = withTiming(1, { duration: 250 });
      // Subtle pulse on the arrow
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ), -1, false
      );
    } else {
      translateY.value = withTiming(100, { duration: 250, easing: Easing.in(Easing.ease) });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [items.length]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(pulse.value, [0, 1], [0, 4]) }],
  }));

  if (items.length === 0) return null;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => router.push('/cart')}
        style={styles.bar}
      >
        {/* Left side — item count + price */}
        <View style={styles.leftSection}>
          <View style={styles.bagIconWrap}>
            <ShoppingBag size={18} color="#FFFFFF" strokeWidth={2.5} />
            {/* Badge count on bag */}
            <View style={styles.bagBadge}>
              <Text style={styles.bagBadgeText}>{totalItems}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.itemCountText}>
              {totalItems} {totalItems === 1 ? 'item' : 'items'} added
            </Text>
            <Text style={styles.priceText}>₹{finalPrice.toFixed(0)}</Text>
          </View>
        </View>

        {/* Right side - VIEW CART */}
        <View style={styles.rightSection}>
          <Text style={styles.viewCartText}>VIEW CART</Text>
          <Animated.View style={arrowStyle}>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 78 : 72, // Above the flush tab bar
    left: 12,
    right: 12,
    zIndex: 90,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingRight: 18,
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    // Premium depth shadow
    shadowColor: '#0F5323',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bagIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bagBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bagBadgeText: {
    fontFamily: 'Inter-Black',
    fontSize: 8,
    color: PRIMARY,
    lineHeight: 10,
  },
  itemCountText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  priceText: {
    fontFamily: 'Inter-Black',
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewCartText: {
    fontFamily: 'Inter-Black',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});

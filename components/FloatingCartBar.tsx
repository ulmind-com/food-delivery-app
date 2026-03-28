import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ShoppingBag, ChevronRight } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { useCartStore } from '../store/useCartStore';
import { useTheme } from '../constants/ThemeContext';

export function FloatingCartBar() {
  const router = useRouter();
  const { colors } = useTheme();
  
  const items = useCartStore((s) => s.items);
  const finalPrice = useCartStore((s) => s.finalPrice);
  
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (items.length > 0) {
      // Entry animation
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    } else {
      // Exit animation
      translateY.value = withTiming(100, { duration: 300 });
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [items.length]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  if (items.length === 0) return null;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/cart')}
        style={[styles.bar, { backgroundColor: '#16a34a' }]}
      >
        <View style={styles.leftInfo}>
          <ShoppingBag size={20} color="#fff" />
          <View>
            <Text style={styles.itemCountText}>
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </Text>
            <Text style={styles.priceText}>
              ₹{finalPrice.toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={styles.rightAction}>
          <Text style={styles.viewCartText}>View Cart</Text>
          <ChevronRight size={18} color="#fff" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24, // Sits above the tab bar if on a tab screen
    left: 16,
    right: 16,
    zIndex: 50,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemCountText: {
    color: '#fff',
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  priceText: {
    color: '#fff',
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    opacity: 0.9,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCartText: {
    color: '#fff',
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
});

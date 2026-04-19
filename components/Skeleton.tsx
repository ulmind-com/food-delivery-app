import React, { useEffect } from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
}

export const Skeleton = ({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E2E8F0', // Neutral skeleton color
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export const SkeletonCard = () => (
   <View style={styles.card}>
      <View style={styles.row}>
         <Skeleton width={50} height={50} borderRadius={25} />
         <View style={styles.col}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
         </View>
      </View>
      <Skeleton width="100%" height={1} style={{ marginVertical: 16 }} />
      <View style={styles.row}>
         <Skeleton width="30%" height={24} borderRadius={12} />
         <Skeleton width="20%" height={24} borderRadius={12} />
      </View>
   </View>
);

export const SkeletonGrid = () => (
   <View style={styles.row}>
      <View style={styles.gridCard}><Skeleton width="100%" height="100%" borderRadius={16} /></View>
      <View style={styles.gridCard}><Skeleton width="100%" height="100%" borderRadius={16} /></View>
   </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  col: { flex: 1, marginLeft: 12 },
  gridCard: { flex: 1, height: 140, marginHorizontal: 6, borderRadius: 16 }
});

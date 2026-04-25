import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS, 
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { ChevronRight, Check } from 'lucide-react-native';

const BUTTON_HEIGHT = 56;
const PADDING = 4;
const SWIPEABLE_DIMENSIONS = BUTTON_HEIGHT - 2 * PADDING;

interface SwipeButtonProps {
  onComplete: () => void;
  title: string;
  colors?: [string, string]; // e.g. ['#3B82F6', '#1E3A8A'] for blue
}

export const SwipeButton = ({ onComplete, title, colors = ['#0EA5E9', '#0369A1'] }: SwipeButtonProps) => {
  const X = useSharedValue(0);
  const [toggled, setToggled] = useState(false);
  const [width, setWidth] = useState(0);

  const H_WAVE_RANGE = SWIPEABLE_DIMENSIONS + 2 * PADDING;
  const H_SWIPE_RANGE = width - 2 * PADDING - SWIPEABLE_DIMENSIONS;

  const handleComplete = () => {
    setToggled(true);
    onComplete();
  };

  const startX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // For web scrolling compatibility
    .onStart(() => {
      startX.value = X.value;
    })
    .onUpdate((event) => {
      if (toggled) return;
      const newValue = startX.value + event.translationX;
      
      if (newValue >= 0 && newValue <= H_SWIPE_RANGE) {
        X.value = newValue;
      }
    })
    .onEnd(() => {
      if (toggled) return;
      if (X.value < H_SWIPE_RANGE - 20) {
        X.value = withSpring(0, { damping: 20, stiffness: 200 });
      } else {
        X.value = withSpring(H_SWIPE_RANGE, { damping: 20, stiffness: 200 }, (isFinished) => {
          if (isFinished) runOnJS(handleComplete)();
        });
      }
    });

  const animatedStyles = {
    swipeable: useAnimatedStyle(() => {
      return { transform: [{ translateX: X.value }] };
    }),
    swipeText: useAnimatedStyle(() => {
      if (width === 0) return { opacity: 1 };
      return {
        opacity: interpolate(
          X.value,
          [0, H_SWIPE_RANGE / 2],
          [1, 0],
          Extrapolation.CLAMP
        ),
        transform: [
          {
            translateX: interpolate(
              X.value,
              [0, H_SWIPE_RANGE],
              [0, H_SWIPE_RANGE / 2],
              Extrapolation.CLAMP
            ),
          },
        ],
      };
    }),
    bgWave: useAnimatedStyle(() => {
      return {
        width: H_WAVE_RANGE + X.value,
        opacity: interpolate(
          X.value,
          [0, H_SWIPE_RANGE],
          [0, 1],
          Extrapolation.CLAMP
        )
      };
    }),
  };

  return (
    <View 
      style={[styles.container, { borderColor: colors[0] }]} 
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.bgWave, { backgroundColor: colors[0] }, animatedStyles.bgWave]} />
      
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.swipeable, animatedStyles.swipeable]}>
           {toggled ? (
              <Check size={24} color={colors[0]} />
           ) : (
              <ChevronRight size={24} color={colors[0]} />
           )}
        </Animated.View>
      </GestureDetector>

      <Animated.Text style={[styles.title, { color: colors[0] }, animatedStyles.swipeText]}>
        {toggled ? 'CONFIRMED' : title}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_HEIGHT / 2,
    borderWidth: 2,
    justifyContent: 'center',
    display: 'flex',
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  title: {
    position: 'absolute',
    alignSelf: 'center',
    fontFamily: 'Inter-Black',
    fontSize: 14,
    letterSpacing: 1,
    zIndex: 1,
  },
  swipeable: {
    height: SWIPEABLE_DIMENSIONS,
    width: SWIPEABLE_DIMENSIONS,
    borderRadius: SWIPEABLE_DIMENSIONS / 2,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'absolute',
    left: PADDING,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  bgWave: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: BUTTON_HEIGHT / 2,
    zIndex: 2,
  }
});

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Dimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, ShoppingBag, Clapperboard, User } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  Easing,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { useCartStore } from '../../store/useCartStore';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const INACTIVE = '#B0B8C5';
const TAB_BG = '#FFFFFF';
const PILL_BG = '#FFF5ED'; // Warm orange tint for active pill

const ICONS: Record<string, any> = {
  index: Home,
  orders: ShoppingBag,
  vlogs: Clapperboard,
  profile: User,
};

/* ─── Tab Button with smooth pill + lift effect ─── */
const TabBarButton = ({ route, label, isFocused, onPress, badgeCount }: any) => {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, { 
      stiffness: 180, damping: 16, mass: 0.8 
    });
  }, [isFocused]);

  // Animated pill background behind active tab
  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.6, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [6, 0]) },
    ],
    opacity: progress.value,
  }));

  // Icon lifts up and scales when active
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.1]) },
      { translateY: interpolate(progress.value, [0, 1], [0, -2]) },
    ],
  }));

  // Label fades in and slides up
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.5, 0.8, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [2, 0]) },
    ],
  }));

  const IconComponent = ICONS[route.name] || Home;

  return (
    <Pressable 
      onPress={onPress} 
      style={styles.tabBtn}
      android_ripple={{ color: 'rgba(252,128,25,0.08)', borderless: true }}
    >
      {/* Background pill — appears when tab is active */}
      <Animated.View style={[styles.activePill, pillStyle]} />

      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <IconComponent 
          size={22}
          color={isFocused ? PRIMARY : INACTIVE} 
          strokeWidth={isFocused ? 2.5 : 1.8} 
        />
        
        {/* Badge */}
        {badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </View>
        )}
      </Animated.View>
      
      <Animated.Text 
        style={[
          styles.tabLabel, 
          isFocused && styles.tabLabelActive, 
          labelStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
};

/* ─── Custom Tab Bar ─── */
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const cartItemsCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

  // Stick to absolute bottom with safe area padding
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 8;

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottomPadding }]}>
      {/* Top edge highlight line */}
      <View style={styles.tabBarTopLine} />
      
      <View style={styles.tabBarInner}>
        {state.routes.map((route: any, index: number) => {
          if (route.name === 'two' || route.name === 'profile') return null;

          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabBarButton 
              key={route.key} 
              route={route} 
              label={label} 
              isFocused={isFocused} 
              onPress={onPress} 
              badgeCount={0} 
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
        }}
      />
      <Tabs.Screen
        name="vlogs"
        options={{
          title: 'Vlogs',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: TAB_BG,
    // Top shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 16,
  },
  tabBarTopLine: {
    height: 0.5,
    backgroundColor: '#E8EBF0',
  },
  tabBarInner: {
    flexDirection: 'row',
    height: 60,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    width: 56,
    height: 44,
    borderRadius: 16,
    backgroundColor: PILL_BG,
    top: 8,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 26,
    zIndex: 2,
  },
  tabLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: INACTIVE,
    marginTop: 3,
    zIndex: 2,
  },
  tabLabelActive: {
    fontFamily: 'Inter-Bold',
    color: PRIMARY,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -11,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: TAB_BG,
    zIndex: 10,
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Inter-Black',
    lineHeight: 10,
  },
});

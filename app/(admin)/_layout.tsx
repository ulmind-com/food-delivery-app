import React, { useEffect, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Dimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Grid, LogOut } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  interpolate,
  interpolateColor,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { socket } from '../../services/socket';
import { BellRing, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const PRIMARY = '#111827';   // Dark dock background
const ACCENT = '#FC8019';    // Brand orange (active pill)
const INACTIVE = '#8B93A7';  // Muted icon on dark dock
const ACTIVE_TXT = '#FFFFFF';

export const AdminTabScrollContext = createContext<any>(null);

const ICONS: Record<string, any> = {
  index: LayoutDashboard,
  orders: ClipboardList,
  menu: UtensilsCrossed,
  more: Grid, // More options (Coupons, Users, Videos, Chat)
};

/* ─── Tab Button: expanding orange pill on a dark dock ─── */
const TabBarButton = ({ route, label, isFocused, onPress, badgeCount }: any) => {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, { stiffness: 200, damping: 18, mass: 0.7 });
  }, [isFocused]);

  const containerStyle = useAnimatedStyle(() => ({
    flexGrow: 1 + progress.value * 1.15,
  }));

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['rgba(252,128,25,0)', ACCENT]),
    shadowOpacity: progress.value * 0.45,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.06]) }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    maxWidth: interpolate(progress.value, [0, 1], [0, 90]),
    marginLeft: interpolate(progress.value, [0, 1], [0, 8]),
  }));

  const IconComponent = ICONS[route.name] || LayoutDashboard;
  const iconColor = isFocused ? ACTIVE_TXT : INACTIVE;

  return (
    <Animated.View style={containerStyle}>
      <Pressable onPress={onPress} android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: false }} style={styles.tabBtn}>
        <Animated.View style={[styles.pill, pillStyle]}>
          <Animated.View style={[styles.iconWrap, iconStyle]}>
            <IconComponent size={22} color={iconColor} strokeWidth={isFocused ? 2.6 : 2} />
            {badgeCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : parseInt(badgeCount)}</Text>
              </View>
            )}
          </Animated.View>
          <Animated.Text numberOfLines={1} style={[styles.tabLabel, labelStyle]}>
            {label}
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

/* ─── Floating dark dock tab bar ─── */
function CustomAdminTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottomPadding }]} pointerEvents="box-none">
      <View style={styles.dock}>
        {state.routes.map((route: any, index: number) => {
          const VISIBLE_TABS = ['index', 'orders', 'menu', 'more'];
          if (!VISIBLE_TABS.includes(route.name)) return null;

          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TabBarButton key={route.key} route={route} label={label} isFocused={isFocused} onPress={onPress} badgeCount={0} />
          );
        })}
      </View>
    </View>
  );
}

export default function AdminLayout() {
  const isTabBarHidden = useSharedValue(0);
  const [newOrderAlert, setNewOrderAlert] = React.useState<any>(null);
  const toastY = useSharedValue(-100);
  const alarmSoundRef = React.useRef<Audio.Sound | null>(null);

  const startPersistentAlarm = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true, shouldDuckAndroid: true });
      if (alarmSoundRef.current) {
        await alarmSoundRef.current.stopAsync();
        await alarmSoundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/admin_loud.mp3'));
      alarmSoundRef.current = sound;
      await sound.setIsLoopingAsync(true);
      await sound.playAsync();
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const stopPersistentAlarm = async () => {
    try {
      toastY.value = withTiming(-100, { duration: 300 }, () => runOnJS(setNewOrderAlert)(null));
      if (alarmSoundRef.current) {
        const sound = alarmSoundRef.current;
        alarmSoundRef.current = null;
        await sound.stopAsync();
        await sound.unloadAsync();
      }
    } catch (e) {
      console.log('Stop Audio error:', e);
    }
  };

  useEffect(() => {
    socket.emit('joinAdminChat'); // Admin joins socket room
    
    const handleNewOrder = (data: any) => {
      setNewOrderAlert(data.order || data);
      startPersistentAlarm();
      // Drop toast down and leave it indefinitely until dismissed
      toastY.value = withSpring(Platform.OS === 'ios' ? 60 : 40, { stiffness: 150, damping: 15 });
    };

    const handleOrderUpdate = (data: any) => {
      // If ANY admin accepts, rejects or cancels an order, stop the alarm.
      if (['ACCEPTED', 'REJECTED', 'CANCELLED', 'PREPARING'].includes((data.status || '').toUpperCase())) {
        stopPersistentAlarm();
      }
    };

    socket.on('newOrder', handleNewOrder);
    socket.on('adminOrderUpdated', handleOrderUpdate);
    
    return () => { 
      socket.off('newOrder', handleNewOrder);
      socket.off('adminOrderUpdated', handleOrderUpdate);
      stopPersistentAlarm();
    };
  }, []);

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
  }));

  return (
    <AdminTabScrollContext.Provider value={isTabBarHidden}>
      {/* Global In-App Notification */}
      <Animated.View style={[styles.globalToast, toastStyle]}>
        <View style={styles.toastIconBox}>
          <BellRing size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.toastTitle}>NEW ORDER RINGING...</Text>
          <Text style={styles.toastSub} numberOfLines={1}>
            {newOrderAlert?.customer?.name || 'Customer'} • ₹{newOrderAlert?.finalAmount || newOrderAlert?.totalAmount || 0}
          </Text>
        </View>
        <Pressable 
          onPress={stopPersistentAlarm} 
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          <X size={14} color="#FFF" style={{ marginRight: 4 }} />
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Mute</Text>
        </Pressable>
      </Animated.View>

      <Tabs
        tabBar={(props) => <CustomAdminTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
        }}
      />
      <Tabs.Screen
        name="coupons"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="users"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="media"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="chat"
        options={{ href: null }}
      />
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="reviews" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="videos" options={{ href: null }} />
      <Tabs.Screen name="vlogs" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="map" options={{ href: null }} />
      <Tabs.Screen name="pos" options={{ href: null }} />
    </Tabs>
    </AdminTabScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 26,
    paddingHorizontal: 6,
    paddingVertical: 7,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tabBtn: {
    height: 48,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontFamily: 'Inter-Black',
    fontSize: 13,
    color: ACTIVE_TXT,
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PRIMARY,
    zIndex: 10,
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Inter-Black',
    lineHeight: 10,
  },
  globalToast: {
    position: 'absolute',
    top: 0, left: 16, right: 16,
    zIndex: 9999,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#FC8019',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(252, 128, 25, 0.2)',
  },
  toastIconBox: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: '#FC8019',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastContent: { flex: 1 },
  toastTitle: { fontFamily: 'Inter-Black', fontSize: 14, color: '#111827' },
  toastSub: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#6B7280', marginTop: 2 },
  toastClose: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
});

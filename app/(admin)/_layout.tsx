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
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { socket } from '../../services/socket';
import { BellRing, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const PRIMARY = '#111827'; // Dark theme for Admin
const INACTIVE = '#9CA3AF';
const TAB_BG = '#FFFFFF';
const PILL_BG = '#F3F4F6'; // Gray for admin

export const AdminTabScrollContext = createContext<any>(null);

const ICONS: Record<string, any> = {
  index: LayoutDashboard,
  orders: ClipboardList,
  menu: UtensilsCrossed,
  more: Grid, // More options (Coupons, Users, Videos, Chat)
};

/* ─── Tab Button with smooth pill + lift effect ─── */
const TabBarButton = ({ route, label, isFocused, onPress, badgeCount }: any) => {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, { 
      stiffness: 180, damping: 16, mass: 0.8 
    });
  }, [isFocused]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.6, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [6, 0]) },
    ],
    opacity: progress.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.1]) },
      { translateY: interpolate(progress.value, [0, 1], [0, -2]) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.5, 0.8, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [2, 0]) },
    ],
  }));

  const IconComponent = ICONS[route.name] || LayoutDashboard;

  return (
    <Pressable 
      onPress={onPress} 
      style={styles.tabBtn}
      android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: true }}
    >
      <Animated.View style={[styles.activePill, pillStyle]} />

      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <IconComponent 
          size={22}
          color={isFocused ? PRIMARY : INACTIVE} 
          strokeWidth={isFocused ? 2.5 : 1.8} 
        />
        {badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 9 ? '9+' : parseInt(badgeCount)}
            </Text>
          </View>
        )}
      </Animated.View>
      
      <Animated.Text style={[styles.tabLabel, isFocused && styles.tabLabelActive, labelStyle]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
};

/* ─── Custom Tab Bar ─── */
function CustomAdminTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 8;

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottomPadding }]}>
      <View style={styles.tabBarTopLine} />
      <View style={styles.tabBarInner}>
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
    </Tabs>
    </AdminTabScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: TAB_BG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tabBarTopLine: {
    height: 1,
    backgroundColor: '#F3F4F6',
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

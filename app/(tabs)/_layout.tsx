import { Tabs } from 'expo-router';
import { Home, ShoppingBag, Clapperboard, User } from 'lucide-react-native';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useCartStore } from '../../store/useCartStore';

const PRIMARY = '#FC8019';
const TAB_INACTIVE = '#9CA3AF';

export default function TabLayout() {
  const cartItemsCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F3F3',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          borderTopWidth: 1,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-SemiBold',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Home size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {cartItemsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {cartItemsCount > 9 ? '9+' : cartItemsCount}
                  </Text>
                </View>
              )}
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <ShoppingBag size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="vlogs"
        options={{
          title: 'Vlogs',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Clapperboard size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      {/* Hide two.tsx from tab bar */}
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
  iconWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: PRIMARY,
    marginTop: 4,
  },
});

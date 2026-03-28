import { Tabs } from 'expo-router';
import { Home, ShoppingBag, Clapperboard, User } from 'lucide-react-native';
import { Platform, View, Text } from 'react-native';
import { useTheme } from '../../constants/ThemeContext';
import { useCartStore } from '../../store/useCartStore';

export default function TabLayout() {
  const { colors } = useTheme();
  const cartItemsCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          borderTopWidth: 1,
          elevation: 10,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 11,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <Home size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {cartItemsCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: colors.tabBarBackground,
                }}>
                  <Text style={{ color: colors.primaryForeground, fontSize: 10, fontFamily: 'Inter-Bold' }}>
                    {cartItemsCount > 9 ? '9+' : cartItemsCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size, focused }) => <ShoppingBag size={22} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="vlogs"
        options={{
          title: 'Vlogs',
          tabBarIcon: ({ color, size, focused }) => <Clapperboard size={22} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
    </Tabs>
  );
}

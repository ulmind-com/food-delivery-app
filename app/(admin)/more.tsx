import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MessageSquare, Tag, Users, Package, LogOut, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';

const PRIMARY = '#111827';
const ACCENT = '#FC8019';

export default function AdminMoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logout = useAuthStore(s => s.logout);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        logout();
        router.replace('/(auth)/login');
      }
    } else {
      const { Alert } = require('react-native');
      Alert.alert('Logout', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
      ]);
    }
  };

  const LIST_ITEMS = [
    { title: 'Chat Support', subtitle: 'Manage customer queries', icon: MessageSquare, color: '#3B82F6', route: '/(admin)/chat' },
    { title: 'Coupons', subtitle: 'Create and manage offers', icon: Tag, color: '#F59E0B', route: '/(admin)/coupons' },
    { title: 'Users', subtitle: 'View customer accounts', icon: Users, color: '#8B5CF6', route: '/(admin)/users' },
    { title: 'Media Manager', subtitle: 'Manage banners & assets', icon: Package, color: '#10B981', route: '/(admin)/media' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 50 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>More Tools</Text>
            <Text style={styles.headerSubtitle}>Manage advanced settings</Text>
          </View>
          <View style={styles.shieldIcon}>
            <ShieldCheck size={28} color={PRIMARY} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Settings Group */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.cardGroup}>
          {LIST_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === LIST_ITEMS.length - 1;
            return (
              <React.Fragment key={index}>
                <TouchableOpacity 
                  style={styles.listItem}
                  activeOpacity={0.7}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
                    <Icon size={22} color={item.color} strokeWidth={2.5} />
                  </View>
                  <View style={styles.listTextWrap}>
                    <Text style={styles.listTitle}>{item.title}</Text>
                    <Text style={styles.listSubtitle}>{item.subtitle}</Text>
                  </View>
                  <ChevronRight size={20} color="#D1D5DB" />
                </TouchableOpacity>
                {!isLast && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </Animated.View>

        {/* System Group */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[styles.cardGroup, { marginTop: 20 }]}>
          <TouchableOpacity style={styles.listItem} activeOpacity={0.7} onPress={handleLogout}>
            <View style={[styles.iconWrap, { backgroundColor: '#FEF2F2' }]}>
              <LogOut size={22} color="#EF4444" strokeWidth={2.5} />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={[styles.listTitle, { color: '#EF4444' }]}>Log Out</Text>
              <Text style={styles.listSubtitle}>Securely sign out of admin</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.footerInfo}>
           <Text style={styles.versionText}>Foodie Admin App v1.0.0</Text>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Slightly darker off-white for contrast
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#F3F4F6',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-Black',
    fontSize: 32,
    color: PRIMARY,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  shieldIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for Bottom Tab
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 3,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: PRIMARY,
    marginBottom: 2,
  },
  listSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#9CA3AF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 74, // Align with text
    marginRight: 12,
  },
  footerInfo: {
    marginTop: 40,
    alignItems: 'center',
  },
  versionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#9CA3AF',
    letterSpacing: 1,
  }
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MessageSquare, Tag, Users, Package, LogOut, Settings } from 'lucide-react-native';
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

  const GRID_ITEMS = [
    { title: 'Chat Support', icon: MessageSquare, color: '#3B82F6', route: '/(admin)/chat' },
    { title: 'Coupons', icon: Tag, color: '#F59E0B', route: '/(admin)/coupons' },
    { title: 'Users', icon: Users, color: '#8B5CF6', route: '/(admin)/users' },
    { title: 'Media Manager', icon: Package, color: '#10B981', route: '/(admin)/media' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
        <Text style={styles.headerTitle}>More Tools</Text>
        <Text style={styles.headerSubtitle}>Manage advanced settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {GRID_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <Animated.View key={index} entering={FadeInDown.delay(index * 100).springify().damping(14)} style={styles.gridItemWrap}>
                <TouchableOpacity 
                  style={styles.gridCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
                    <Icon size={26} color={item.color} strokeWidth={2} />
                  </View>
                  <Text style={styles.gridTitle}>{item.title}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        <Animated.View entering={FadeInDown.delay(500).springify().damping(14)}>
          <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontFamily: 'Inter-Black',
    fontSize: 28,
    color: PRIMARY,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for Bottom Tab
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 40,
  },
  gridItemWrap: {
    width: '47%',
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    height: 140,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  gridTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: PRIMARY,
    textAlign: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#EF4444',
  },
});

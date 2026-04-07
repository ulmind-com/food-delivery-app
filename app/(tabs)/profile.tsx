import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Alert, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, Package, MapPin, HelpCircle, Info, LogOut,
  ChevronRight, Settings, Heart, Star, Shield, Bell,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '../../store/useAuthStore';

const PRIMARY = '#FC8019';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  const isLoggedIn = !!token && !!user;

  const handleLogout = () => {
    Alert.alert(
      'Logout', 'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/welcome'); } },
      ]
    );
  };

  // ─── Guest State ────────────────────────────────
  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.guestContainer}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.guestAvatar}>
            <User size={48} color="#C0C0C0" />
          </Animated.View>
          <Text style={styles.guestTitle}>Your Profile</Text>
          <Text style={styles.guestSub}>Login to view your orders, manage addresses, and more</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginBtnText}>Login or Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Quick Action ───────────────────────────────
  const QuickAction = ({ icon, label, sub, onPress, idx }: any) => (
    <Animated.View entering={FadeInDown.delay(100 + idx * 60).duration(400)}>
      <Pressable style={styles.quickAction} onPress={onPress}>
        <View style={styles.quickIconWrap}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.quickLabel}>{label}</Text>
          {sub && <Text style={styles.quickSub}>{sub}</Text>}
        </View>
        <ChevronRight size={18} color="#C0C0C0" />
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ─── Profile Header ─── */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.profileHeader}>
          <View style={styles.profileAvatarRing}>
            <View style={styles.profileAvatar}>
              <Text style={{ fontSize: 32 }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          </View>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {user?.mobile && <Text style={styles.profilePhone}>📱 {user.mobile}</Text>}

          <TouchableOpacity 
            style={styles.editProfileBtn} 
            activeOpacity={0.8}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ─── Stats Row ─── */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Favourites</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>₹0</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
        </Animated.View>

        {/* ─── Quick Actions ─── */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionLabel}>MY ACCOUNT</Text>
          <QuickAction idx={0} icon={<Package size={20} color={PRIMARY} />} label="My Orders" sub="View order history" onPress={() => router.push('/(tabs)/orders')} />
          <QuickAction idx={1} icon={<MapPin size={20} color="#3B82F6" />} label="Saved Addresses" sub="Manage delivery addresses" onPress={() => router.push('/addresses')} />
          <QuickAction idx={2} icon={<Heart size={20} color="#EF4444" />} label="Favourites" sub="Your favourite items" onPress={() => {}} />
          <QuickAction idx={3} icon={<Star size={20} color="#F59E0B" />} label="Reviews & Ratings" sub="Rate your orders" onPress={() => {}} />
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionLabel}>MORE</Text>
          <QuickAction idx={4} icon={<Bell size={20} color="#8B5CF6" />} label="Notifications" sub="Manage alerts" onPress={() => {}} />
          <QuickAction idx={5} icon={<Shield size={20} color="#16a34a" />} label="Privacy & Security" sub="Account security" onPress={() => {}} />
          <QuickAction idx={6} icon={<HelpCircle size={20} color="#6B7280" />} label="Help & Support" sub="Get help with orders" onPress={() => {}} />
          <QuickAction idx={7} icon={<Info size={20} color="#6B7280" />} label="About" sub="App version 1.0.0" onPress={() => {}} />
        </View>

        {/* ─── Logout ─── */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ paddingHorizontal: 16, marginBottom: 40 }}>
          <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={handleLogout}>
            <LogOut size={18} color="#DC2626" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFCF7' },
  scrollContent: { paddingBottom: 40 },
  // Guest
  guestContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  guestAvatar: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  guestTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: '#3D4152', marginBottom: 8 },
  guestSub: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#93959F', textAlign: 'center', maxWidth: '80%', lineHeight: 20, marginBottom: 28 },
  loginBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 16,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  loginBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#FFF' },
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 70 : 56,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  profileAvatarRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: PRIMARY,
    padding: 3, marginBottom: 14,
  },
  profileAvatar: {
    width: '100%', height: '100%', borderRadius: 40,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontFamily: 'Inter-Bold', fontSize: 22, color: '#3D4152' },
  profileEmail: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#93959F', marginTop: 2 },
  profilePhone: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#93959F', marginTop: 4 },
  editProfileBtn: {
    marginTop: 14, borderWidth: 1.5, borderColor: PRIMARY,
    borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8,
  },
  editProfileText: { fontFamily: 'Inter-Bold', fontSize: 13, color: PRIMARY },
  // Stats
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontFamily: 'Inter-Black', fontSize: 20, color: '#3D4152' },
  statLabel: { fontFamily: 'Inter-Medium', fontSize: 11, color: '#93959F', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#F0F0F5', marginVertical: 4 },
  // Sections
  sectionBox: { paddingHorizontal: 16, marginTop: 20 },
  sectionLabel: { fontFamily: 'Inter-ExtraBold', fontSize: 11, color: '#93959F', letterSpacing: 1, marginBottom: 10 },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  quickIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#F7F7F7', alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#3D4152' },
  quickSub: { fontFamily: 'Inter', fontSize: 12, color: '#93959F', marginTop: 1 },
  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 14, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#FECACA',
  },
  logoutText: { fontFamily: 'Inter-Bold', fontSize: 15, color: '#DC2626' },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Alert, Pressable, StatusBar, Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, Package, MapPin, HelpCircle, Info, LogOut,
  ChevronRight, Heart, Star, Shield, Bell, ArrowLeft,
  Pencil, Phone, Mail, CreditCard, FileText,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { resolveImageURL } from '../../lib/image-utils';
import { useAuthStore } from '../../store/useAuthStore';
import { userApi, restaurantApi } from '../../services/api';

const PRIMARY = '#FC8019';
const PRIMARY_LIGHT = '#FFF7ED';
const BG = '#F8F9FB';
const CARD = '#FFFFFF';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#F3F4F6';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  const isLoggedIn = !!token && !!user;

  const [freshImage, setFreshImage] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<any>(null);

  useEffect(() => {
    if (isLoggedIn) {
      userApi.getProfile()
        .then(res => {
           const profile = res.data?.user || res.data;
           if (profile?.profileImage) {
             setFreshImage(profile.profileImage);
           }
        })
        .catch(err => console.log('Error fetching fresh profile:', err));
    }
  }, [isLoggedIn]);

  useEffect(() => {
    restaurantApi.get().then(res => {
      setRestaurant(res.data?.restaurant || res.data);
    }).catch(e => console.log('Err fetching restaurant in profile', e));
  }, []);

  const displayImage = freshImage || user?.profileImage;

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
        <StatusBar barStyle="dark-content" />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.guestContainer}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.guestIconWrap}>
            <User size={48} color={PRIMARY} />
          </Animated.View>
          <Text style={styles.guestTitle}>Welcome!</Text>
          <Text style={styles.guestSub}>Login to view your profile, orders, and manage addresses</Text>
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

  // ─── Menu Item ──────────────────────────────────
  const MenuItem = ({ icon, label, sub, onPress, idx }: any) => (
    <Animated.View entering={FadeInDown.delay(80 + idx * 50).springify()}>
      <TouchableOpacity
        style={styles.menuItem}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={styles.menuIconWrap}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.menuLabel}>{label}</Text>
          {sub && <Text style={styles.menuSub}>{sub}</Text>}
        </View>
        <ChevronRight size={18} color="#D1D5DB" />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ─── Profile Card ─── */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarRing}>
              {displayImage ? (
                <Image source={{ uri: resolveImageURL(displayImage) }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <View style={styles.profileDetailRow}>
                <Mail size={13} color={TEXT_MUTED} />
                <Text style={styles.profileDetailText}>{user?.email}</Text>
              </View>
              {user?.mobile && (
                <View style={styles.profileDetailRow}>
                  <Phone size={13} color={TEXT_MUTED} />
                  <Text style={styles.profileDetailText}>{user.mobile}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.editProfileBtn}
                activeOpacity={0.7}
                onPress={() => router.push('/edit-profile')}
              >
                <Pencil size={12} color={PRIMARY} />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ─── My Account ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MY ACCOUNT</Text>
          <MenuItem idx={0} icon={<Package size={20} color={PRIMARY} />} label="My Orders" sub="Track & reorder" onPress={() => router.push('/(tabs)/orders')} />
          <MenuItem idx={1} icon={<MapPin size={20} color="#3B82F6" />} label="Saved Addresses" sub="Manage delivery locations" onPress={() => router.push('/addresses')} />
          <MenuItem idx={2} icon={<Heart size={20} color="#EF4444" />} label="Favourites" sub="Your saved items" onPress={() => {}} />
          <MenuItem idx={3} icon={<CreditCard size={20} color="#8B5CF6" />} label="Payments" sub="Saved cards & UPI" onPress={() => {}} />
        </View>

        {/* ─── Settings ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SETTINGS</Text>
          <MenuItem idx={4} icon={<Bell size={20} color="#F59E0B" />} label="Notifications" sub="Manage alerts & offers" onPress={() => {}} />
          <MenuItem idx={5} icon={<Shield size={20} color="#16a34a" />} label="Privacy & Security" sub="Password & permissions" onPress={() => {}} />
        </View>

        {/* ─── Support ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <MenuItem idx={6} icon={<HelpCircle size={20} color="#6366F1" />} label="Help & Support" sub="FAQs & contact us" onPress={() => {}} />
          <MenuItem idx={7} icon={<FileText size={20} color="#6B7280" />} label="Terms & Policies" sub="Legal information" onPress={() => {}} />
          <MenuItem idx={8} icon={<Info size={20} color="#6B7280" />} label="About" sub="App version 1.0.0" onPress={() => {}} />
        </View>

        {/* ─── Logout ─── */}
        <View style={styles.section}>
          <MenuItem idx={9} icon={<LogOut size={20} color="#EF4444" />} label="Logout" sub="Sign out of your account" onPress={handleLogout} />
        </View>

        {/* ─── Restaurant / Outlet Info ─── */}
        {restaurant && (
          <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.restaurantCardWrap}>
            <View style={styles.resCardTop}>
              <Text style={styles.resName}>{restaurant.name || 'Haldia Cloud Kitchen'}</Text>
              <Text style={styles.resAddress}>{restaurant.address || 'Haldia, West Bengal'}</Text>
            </View>
            <View style={styles.resCardBottom}>
              <TouchableOpacity 
                style={styles.resBtn} 
                activeOpacity={0.7}
                onPress={() => {
                  if (restaurant.mobile) {
                    Linking.openURL(`tel:${restaurant.mobile}`);
                  } else {
                    Alert.alert('Not available', 'Outlet contact number not provided yet.');
                  }
                }}
              >
                <Phone size={14} color="#991B1B" />
                <Text style={styles.resBtnText}>Call Outlet</Text>
              </TouchableOpacity>
              <View style={styles.resDivider} />
              <TouchableOpacity 
                style={styles.resBtn}
                activeOpacity={0.7}
                onPress={() => {
                  const lat = restaurant.location?.lat;
                  const lng = restaurant.location?.lng;
                  if (lat && lng) {
                    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
                  } else {
                    Alert.alert('Not available', 'Outlet location not provided yet.');
                  }
                }}
              >
                <Text style={styles.resBtnText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ─── Powered By ULMiND ─── */}
        <TouchableOpacity 
          style={styles.poweredByContainer}
          activeOpacity={0.7}
          onPress={() => Linking.openURL('https://www.ulmind.com')}
        >
           <Text style={styles.poweredByText}>Powered by</Text>
           <Image source={require('../../assets/logo/ulmind-logo.png')} style={styles.ulmindLogo} contentFit="contain" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 18,
    backgroundColor: CARD,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  backBtn: { padding: 8, marginLeft: -8, borderRadius: 12, backgroundColor: BG },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_DARK },

  scrollContent: { paddingBottom: 40 },

  // ── Guest ──
  guestContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  guestIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, borderWidth: 2, borderColor: '#FDDCB5',
  },
  guestTitle: { fontFamily: 'Inter-Black', fontSize: 24, color: TEXT_DARK, marginBottom: 8 },
  guestSub: {
    fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_MUTED,
    textAlign: 'center', lineHeight: 22, maxWidth: '85%', marginBottom: 32,
  },
  loginBtn: {
    backgroundColor: PRIMARY, borderRadius: 16, paddingHorizontal: 44, paddingVertical: 16,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  loginBtnText: { fontFamily: 'Inter-Black', fontSize: 16, color: '#FFF' },

  // ── Profile Card ──
  profileCard: {
    margin: 16, marginBottom: 8,
    backgroundColor: CARD, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  profileTop: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  avatarRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2.5, borderColor: PRIMARY,
    padding: 2,
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 34 },
  avatarFallback: {
    width: '100%', height: '100%', borderRadius: 34,
    backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontFamily: 'Inter-Black', fontSize: 28, color: PRIMARY },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_DARK, marginBottom: 6 },
  profileDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  profileDetailText: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED },

  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, alignSelf: 'flex-start',
  },
  editProfileText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: PRIMARY },

  // ── Sections ──
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: {
    fontFamily: 'Inter-Black', fontSize: 11, color: TEXT_MUTED,
    letterSpacing: 1.2, marginBottom: 10, paddingLeft: 4,
  },

  // ── Menu Items ──
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: CARD, borderRadius: 16, padding: 16,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  menuIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: TEXT_DARK },
  menuSub: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

  // ── Powered By ──
  poweredByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
    gap: 6,
  },
  poweredByText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#4B5563', // slightly darker text since opacity is removed
  },
  ulmindLogo: {
    width: 80,
    height: 24,
  },

  // ── Restaurant Card ──
  restaurantCardWrap: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  resCardTop: {
    padding: 16,
  },
  resName: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 2,
  },
  resAddress: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  resCardBottom: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2', // Light reddish background matching design
    paddingVertical: 12,
  },
  resBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resBtnText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#991B1B', // Dark red color
  },
  resDivider: {
    width: 1.5,
    backgroundColor: '#FCA5A5', // Light reddish divider
    height: '60%',
    alignSelf: 'center',
  },
});

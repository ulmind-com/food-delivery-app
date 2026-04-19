import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, User } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '../store/useAuthStore';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019'; // Vibrant Orange

export default function RoleSelectionScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  const handleSelectRole = (role: 'admin' | 'user') => {
    if (role === 'admin') {
      router.replace('/(admin)');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Graphic overlay */}
      <Animated.View entering={FadeIn.duration(800)} style={styles.bgOverlay} />

      <Animated.View entering={FadeInDown.delay(100).springify().damping(14)} style={styles.header}>
        <Text style={styles.title}>Welcome back,</Text>
        <Text style={styles.name}>{user?.name?.split(' ')[0] || 'Admin'}</Text>
        <Text style={styles.subtitle}>Choose your workspace for this session</Text>
      </Animated.View>

      <View style={styles.cardsContainer}>
        {/* Admin Card */}
        <Animated.View entering={FadeInDown.delay(200).springify().damping(14)}>
          <TouchableOpacity 
            style={[styles.card, styles.adminCard]} 
            activeOpacity={0.8}
            onPress={() => handleSelectRole('admin')}
          >
            <View style={styles.iconCircleAdmin}>
              <ShieldCheck size={32} color="#FFFFFF" strokeWidth={2} />
            </View>
            <Text style={styles.cardTitle}>Admin Dashboard</Text>
            <Text style={styles.cardDesc}>Manage orders, edit menus, review analytics and handle operations</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* User Card */}
        <Animated.View entering={FadeInDown.delay(300).springify().damping(14)}>
          <TouchableOpacity 
            style={[styles.card, styles.userCard]} 
            activeOpacity={0.8}
            onPress={() => handleSelectRole('user')}
          >
            <View style={styles.iconCircleUser}>
              <User size={32} color={PRIMARY} strokeWidth={2} />
            </View>
            <Text style={[styles.cardTitle, { color: '#111827' }]}>Customer View</Text>
            <Text style={[styles.cardDesc, { color: '#6B7280' }]}>Browse food, place test orders, and view the customer experience</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
    backgroundColor: '#111827',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  header: {
    marginBottom: 40,
    marginTop: -40,
  },
  title: {
    fontFamily: 'Inter-Medium',
    fontSize: 20,
    color: '#9CA3AF',
  },
  name: {
    fontFamily: 'Inter-Black',
    fontSize: 42,
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#D1D5DB',
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  adminCard: {
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#374151',
    shadowColor: '#000000',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#9CA3AF',
  },
  iconCircleAdmin: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconCircleUser: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF7ED', // Light orange
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardDesc: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 22,
  },
});

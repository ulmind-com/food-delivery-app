import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, Alert, Dimensions
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import {
  MapPin, Home, Briefcase, Plus, CheckCircle2, ArrowLeft,
  Trash2, Pencil, Phone, Navigation
} from 'lucide-react-native';
import Animated, {
  FadeInDown, FadeIn, SlideInRight,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { userApi } from '../services/api';
import { useLocationStore, SavedAddress } from '../store/useLocationStore';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const PRIMARY_LIGHT = '#FFF7ED';
const BG = '#F8F9FB';
const CARD_BG = '#FFFFFF';
const TEXT = '#1A1A1A';
const MUTED = '#6B7280';
const BORDER = '#F3F4F6';
const DANGER = '#EF4444';
const SUCCESS = '#22C55E';

// ═══════════════════════════════════════════════════
//  SKELETON SHIMMER LOADER
// ═══════════════════════════════════════════════════
const ShimmerBlock = ({ w, h, radius = 8, style }: { w: number | string; h: number; radius?: number; style?: any }) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.7, 0.3]),
  }));

  return (
    <Animated.View style={[{
      width: w as any, height: h, borderRadius: radius,
      backgroundColor: '#E8E8EC',
      overflow: 'hidden',
    }, animStyle, style]}>
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
};

const SkeletonCard = ({ index }: { index: number }) => (
  <Animated.View entering={FadeInDown.delay(index * 100).springify()} style={skeletonStyles.card}>
    <View style={skeletonStyles.topRow}>
      <ShimmerBlock w={44} h={44} radius={22} />
      <View style={{ flex: 1, marginLeft: 14, gap: 8 }}>
        <ShimmerBlock w={80} h={16} radius={6} />
        <ShimmerBlock w={'90%'} h={14} radius={6} />
        <ShimmerBlock w={'60%'} h={12} radius={6} />
      </View>
      <ShimmerBlock w={60} h={22} radius={12} />
    </View>
    <View style={skeletonStyles.divider} />
    <View style={skeletonStyles.actionsRow}>
      <ShimmerBlock w={80} h={34} radius={10} />
      <ShimmerBlock w={80} h={34} radius={10} />
    </View>
  </Animated.View>
);

const SkeletonLoader = () => (
  <View style={skeletonStyles.container}>
    <View style={skeletonStyles.headerShimmer}>
      <ShimmerBlock w={140} h={14} radius={6} />
    </View>
    {[0, 1, 2].map(i => <SkeletonCard key={i} index={i} />)}
  </View>
);

const skeletonStyles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerShimmer: { marginBottom: 16, paddingHorizontal: 4 },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20, padding: 20,
    marginBottom: 14, borderWidth: 1.5, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },
  actionsRow: { flexDirection: 'row', gap: 10 },
});

export default function AddressesScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { selectedAddress, setSelectedAddress } = useLocationStore();

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await userApi.getAddresses();
      const data = res.data.addresses || res.data;
      setAddresses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Error fetching addresses');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [])
  );

  const handleSelect = (addr: SavedAddress) => {
    setSelectedAddress(addr);
    // Also persist server side
    const id = addr._id || addr.id;
    if (id) {
      userApi.selectAddress({ addressId: id }).catch(() => {});
    }
    router.back();
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to remove this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              await userApi.deleteAddress(id);
              if (selectedAddress?._id === id) {
                setSelectedAddress(null);
              }
              fetchAddresses();
            } catch {} finally {
              setDeletingId(null);
            }
          }
        }
      ]
    );
  };

  const handleEdit = (addr: SavedAddress) => {
    const id = addr._id || addr.id;
    router.push({ pathname: '/add-address', params: { editId: id, prefill: JSON.stringify(addr) } });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'HOME': return <Home size={20} color={PRIMARY} />;
      case 'WORK': return <Briefcase size={20} color={PRIMARY} />;
      default: return <MapPin size={20} color={PRIMARY} />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'HOME': return 'Home';
      case 'WORK': return 'Work';
      default: return 'Other';
    }
  };

  const renderItem = ({ item, index }: { item: SavedAddress; index: number }) => {
    const itemId = item._id || item.id || '';
    const selId = selectedAddress?._id || selectedAddress?.id || '';
    const isSelected = !!(itemId && selId && itemId === selId);
    const id = item._id || item.id || '';
    const isDeleting = deletingId === id;

    const fullAddress = [
      item.addressLine1,
      item.addressLine2,
      item.city,
      item.state,
      item.postalCode ? `- ${item.postalCode}` : ''
    ].filter(Boolean).join(', ');

    return (
      <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
        <View
          style={[
            styles.addressCard,
            isSelected && styles.addressCardSelected,
          ]}
        >
          {/* Card Content - tappable to select */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => handleSelect(item)}>
            <View style={styles.cardContent}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, isSelected && { backgroundColor: PRIMARY }]}>
                  {React.cloneElement(getIcon(item.type), { color: isSelected ? '#FFF' : PRIMARY })}
                </View>
              </View>

              <View style={styles.cardCenter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.typeLabel}>{getLabel(item.type)}</Text>
                  {isSelected && <CheckCircle2 size={16} color={SUCCESS} />}
                </View>
                <Text style={styles.addressText} numberOfLines={2}>{fullAddress}</Text>
                {item.mobile ? (
                  <View style={styles.mobileRow}>
                    <Phone size={12} color={MUTED} />
                    <Text style={styles.mobileText}>{item.mobile}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => handleEdit(item)}
            >
              <Pencil size={14} color={PRIMARY} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(id)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={DANGER} />
              ) : (
                <>
                  <Trash2 size={14} color={DANGER} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <SkeletonLoader />
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={addresses}
            keyExtractor={(item) => item._id || item.id || Math.random().toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              addresses.length > 0 ? (
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderText}>
                    {addresses.length} saved address{addresses.length > 1 ? 'es' : ''}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <Animated.View entering={FadeIn.duration(500)} style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <Navigation size={40} color={PRIMARY} />
                </View>
                <Text style={styles.emptyTitle}>No saved addresses yet</Text>
                <Text style={styles.emptyDesc}>
                  Add your first delivery address to speed up checkout
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => router.push('/location-picker')}
                >
                  <Plus size={18} color="#FFF" />
                  <Text style={styles.emptyAddBtnText}>Add Address</Text>
                </TouchableOpacity>
              </Animated.View>
            }
          />

          {addresses.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.addBtn}
                activeOpacity={0.85}
                onPress={() => router.push('/location-picker')}
              >
                <View style={styles.addBtnIcon}>
                  <Plus size={20} color="#FFF" />
                </View>
                <Text style={styles.addBtnText}>Add New Address</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 18,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  backButton: { padding: 8, marginLeft: -8, borderRadius: 12, backgroundColor: BG },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT },

  listContent: { padding: 16, paddingBottom: 120 },
  listHeader: { marginBottom: 12, paddingHorizontal: 4 },
  listHeaderText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Address Card ──
  addressCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    position: 'relative',
  },
  addressCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: '#FFFCF8',
    shadowColor: PRIMARY, shadowOpacity: 0.1,
  },

  cardContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  cardLeft: {},
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },

  cardCenter: { flex: 1 },
  typeLabel: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT, marginBottom: 4, textTransform: 'capitalize' },
  addressText: { fontFamily: 'Inter-Medium', fontSize: 14, color: MUTED, lineHeight: 20 },
  mobileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  mobileText: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED },

  actionsRow: {
    flexDirection: 'row', gap: 10,
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    borderWidth: 1, borderColor: '#FDDCB5',
  },
  editBtnText: { fontFamily: 'Inter-Bold', fontSize: 13, color: PRIMARY },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA',
  },
  deleteBtnText: { fontFamily: 'Inter-Bold', fontSize: 13, color: DANGER },

  // ── Empty State ──
  emptyContainer: { paddingTop: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT, marginBottom: 8 },
  emptyDesc: { fontFamily: 'Inter-Medium', fontSize: 15, color: MUTED, textAlign: 'center', lineHeight: 22 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 24,
    backgroundColor: PRIMARY, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16,
    shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  emptyAddBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: '#FFF' },

  // ── Footer ──
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: CARD_BG,
    borderTopWidth: 1, borderTopColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 10,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: PRIMARY, height: 56, borderRadius: 16,
    shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  addBtnIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { fontFamily: 'Inter-Black', fontSize: 16, color: '#FFF' },
});

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Platform, Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Clock, ChevronRight, Package, Bike, CheckCircle2,
  XCircle, ShoppingBag, MessageSquare, ChefHat, ArrowLeft
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '../../store/useAuthStore';
import { orderApi } from '../../services/api';

const PRIMARY = '#FC8019';
const TEXT_COLOR = '#1A1A1A';
const MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';
const BG = '#F9FAFB';

// Exact parity with web's STATUS_CONFIG
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  PLACED: { color: '#2563EB', bg: '#DBEAFE', icon: ShoppingBag, label: 'Order Placed' },
  ACCEPTED: { color: '#0891B2', bg: '#CFFAFE', icon: CheckCircle2, label: 'Accepted' },
  PREPARING: { color: '#EA580C', bg: '#FFEDD5', icon: ChefHat, label: 'Preparing' },
  OUT_FOR_DELIVERY: { color: '#9333EA', bg: '#F3E8FF', icon: Bike, label: 'Out for Delivery' },
  DELIVERED: { color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle2, label: 'Delivered' },
  CANCELLED: { color: '#DC2626', bg: '#FEE2E2', icon: XCircle, label: 'Cancelled' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isLoggedIn = !!token && !!user;

  const fetchOrders = async () => {
    if (!isLoggedIn) { setLoading(false); setRefreshing(false); return; }
    try {
      const res = await orderApi.getMyOrders();
      setOrders(res.data.orders || res.data || []);
    } catch (e) {
      console.log('Error fetching orders:', e);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchOrders(); }, [isLoggedIn]));

  const onRefresh = useCallback(() => { setRefreshing(true); fetchOrders(); }, []);

  const getItemsSummary = (items: any[]) => {
    if (!items?.length) return "No items";
    const names = items.map((i: any) => `${i.name || i.product?.name || i.menuItem?.name || "Item"} × ${i.quantity}`);
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const status = (item.status || item.orderStatus || 'PLACED').toUpperCase();
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PLACED;
    const StatusIcon = cfg.icon;

    const date = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    const isDelivered = status === 'DELIVERED';
    
    // Fallbacks
    const billTotal = item.finalTotal || item.finalAmount || item.totalPrice || item.totalAmount || 0;
    const orderRefId = item.customId || `#${(item._id || '').slice(-6).toUpperCase()}`;

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(18)}>
        <Pressable
          style={styles.orderCard}
          onPress={() => router.push(`/orders/${item._id || item.id}`)}
        >
          {/* Header: customId + Date */}
          <View style={styles.cardHeader}>
            <Text style={styles.orderIdText}>{orderRefId}</Text>
            <Text style={styles.dateText}>{date}</Text>
          </View>

          {/* Body: Items Preview */}
          <Text style={styles.itemSummary} numberOfLines={1}>{getItemsSummary(item.items)}</Text>

          {/* Footer: Status + Total */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                <StatusIcon size={12} color={cfg.color} strokeWidth={2.5} />
                <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>

              {isDelivered && (
                <TouchableOpacity 
                  onPress={(e) => { e.stopPropagation(); /* TODO: Open Review Modal natively */ }}
                  style={styles.rateBtn}
                >
                  <MessageSquare size={12} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.rateBtnText}>Rate</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.footerRight}>
              <Text style={styles.orderTotal}>₹{Number(billTotal).toFixed(2)}</Text>
              <ChevronRight size={16} color={MUTED} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  // ─── Guest State ────────────────────────────────
  if (!isLoggedIn) {
    return (
      <View style={[styles.container, styles.centerWrap]}>
        <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: 'center' }}>
          <View style={styles.emptyIconBox}>
            <Package size={48} color={MUTED} opacity={0.5} />
          </View>
          <Text style={styles.emptyTitle}>Login to view orders</Text>
          <Text style={styles.emptySub}>Track your orders and reorder your favourites</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={TEXT_COLOR} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSub}>{orders.length} orders placed</Text>
        </View>
      </Animated.View>

      {loading ? (
        <View style={styles.skeletonWrap}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <View style={{ height: 16, width: 90, backgroundColor: BORDER, borderRadius: 4, marginBottom: 12 }} />
              <View style={{ height: 12, width: '60%', backgroundColor: BORDER, borderRadius: 4, marginBottom: 16 }} />
              <View style={{ height: 24, width: '100%', backgroundColor: BORDER, borderRadius: 12 }} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />}
          ListEmptyComponent={
            <View style={[styles.centerWrap, { paddingTop: 80 }]}>
              <View style={styles.emptyIconBox}>
                <Package size={48} color={MUTED} opacity={0.3} />
              </View>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySub}>Your order history will appear here</Text>
              <TouchableOpacity style={styles.browseBtn} onPress={() => router.replace('/(tabs)')}>
                <Text style={styles.browseBtnText}>Browse Menu</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  backBtn: {
    padding: 8, marginLeft: -4, borderRadius: 12, backgroundColor: BG
  },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 22, color: TEXT_COLOR },
  headerSub: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED, marginTop: 2 },
  
  listContent: { padding: 16, paddingBottom: 40 },
  
  orderCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderIdText: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_COLOR },
  dateText: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED },
  
  itemSummary: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED, marginBottom: 16 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontFamily: 'Inter-Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  rateBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 4.5, borderRadius: 8,
    shadowColor: PRIMARY, shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3
  },
  rateBtnText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#FFFFFF' },
  
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderTotal: { fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_COLOR },

  // Empty / Skeleton
  skeletonWrap: { padding: 16 },
  skeletonCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER, opacity: 0.5 },
  emptyIconBox: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: BORDER },
  emptyTitle: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_COLOR, marginBottom: 4 },
  emptySub: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: '80%', lineHeight: 20 },
  loginBtn: { marginTop: 24, backgroundColor: PRIMARY, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14 },
  loginBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: '#FFFFFF' },
  browseBtn: { marginTop: 24, backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 },
  browseBtnText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#FFFFFF' },
});

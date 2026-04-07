import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Platform, Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import {
  Clock, ChevronRight, Package, Truck, CheckCircle2,
  XCircle, RotateCcw, ShoppingBag,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuthStore } from '../../store/useAuthStore';
import { orderApi } from '../../services/api';
import { resolveImageURL } from '../../lib/image-utils';

const PRIMARY = '#FC8019';

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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Pending': case 'Accepted':
        return { color: '#F59E0B', bg: '#FEF3C7', icon: <Package size={14} color="#F59E0B" />, label: status };
      case 'Cooking':
        return { color: '#3B82F6', bg: '#DBEAFE', icon: <Clock size={14} color="#3B82F6" />, label: 'Preparing' };
      case 'Out for Delivery':
        return { color: '#8B5CF6', bg: '#EDE9FE', icon: <Truck size={14} color="#8B5CF6" />, label: 'On the way' };
      case 'Delivered':
        return { color: '#16a34a', bg: '#DCFCE7', icon: <CheckCircle2 size={14} color="#16a34a" />, label: 'Delivered' };
      case 'Cancelled':
        return { color: '#DC2626', bg: '#FEE2E2', icon: <XCircle size={14} color="#DC2626" />, label: 'Cancelled' };
      default:
        return { color: '#6B7280', bg: '#F3F4F6', icon: <Clock size={14} color="#6B7280" />, label: status };
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const statusInfo = getStatusInfo(item.status);
    const date = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    const time = new Date(item.createdAt).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    });
    const itemNames = item.items?.map((i: any) => i.product?.name || i.name || 'Item').slice(0, 3).join(', ');
    const itemCount = item.items?.length || 0;
    const firstImage = resolveImageURL(item.items?.[0]?.product?.image || item.items?.[0]?.image);

    return (
      <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
        <Pressable
          style={styles.orderCard}
          onPress={() => router.push(`/orders/${item._id || item.id}`)}
        >
          {/* Top row: Status + Date */}
          <View style={styles.cardTopRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              {statusInfo.icon}
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
            <Text style={styles.dateText}>{date}</Text>
          </View>

          {/* Items row */}
          <View style={styles.itemsRow}>
            {firstImage ? (
              <Image source={{ uri: firstImage }} style={styles.orderThumb} contentFit="cover" />
            ) : (
              <View style={[styles.orderThumb, { backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }]}>
                <Package size={20} color="#D0D0D0" />
              </View>
            )}
            <View style={styles.itemsInfo}>
              <Text style={styles.itemsText} numberOfLines={1}>{itemNames || 'Your order'}</Text>
              <Text style={styles.itemsCount}>{itemCount} {itemCount === 1 ? 'item' : 'items'} · {time}</Text>
            </View>
            <Text style={styles.orderTotal}>₹{(item.finalTotal || item.totalPrice || 0).toFixed(0)}</Text>
          </View>

          {/* Bottom row: Actions */}
          <View style={styles.cardBottomRow}>
            <Text style={styles.orderId}>#{(item._id || '').slice(-6).toUpperCase()}</Text>
            <View style={styles.actionBtns}>
              {item.status === 'Delivered' && (
                <TouchableOpacity style={styles.reorderBtn}>
                  <RotateCcw size={13} color={PRIMARY} />
                  <Text style={styles.reorderText}>Reorder</Text>
                </TouchableOpacity>
              )}
              <View style={styles.viewDetailBtn}>
                <Text style={styles.viewDetailText}>Details</Text>
                <ChevronRight size={14} color={PRIMARY} />
              </View>
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
            <ShoppingBag size={48} color="#D0D0D0" />
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
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSub}>{orders.length} orders placed</Text>
      </Animated.View>

      {loading ? (
        <View style={styles.centerWrap}>
          {/* Skeleton */}
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.orderCard, { opacity: 0.4 }]}>
              <View style={{ height: 14, width: 80, backgroundColor: '#F0F0F5', borderRadius: 4, marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={{ width: 50, height: 50, borderRadius: 10, backgroundColor: '#F0F0F5' }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ height: 14, width: '70%', backgroundColor: '#F0F0F5', borderRadius: 4 }} />
                  <View style={{ height: 10, width: '40%', backgroundColor: '#F0F0F5', borderRadius: 4 }} />
                </View>
              </View>
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
              <Text style={{ fontSize: 56, marginBottom: 16 }}>📦</Text>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySub}>Your delicious orders will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFCF7' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F3F3',
  },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 24, color: '#3D4152' },
  headerSub: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#93959F', marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 40 },
  orderCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontFamily: 'Inter-Bold', fontSize: 11 },
  dateText: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#93959F' },
  itemsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderThumb: { width: 50, height: 50, borderRadius: 10 },
  itemsInfo: { flex: 1 },
  itemsText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#3D4152' },
  itemsCount: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#93959F', marginTop: 2 },
  orderTotal: { fontFamily: 'Inter-Black', fontSize: 16, color: '#3D4152' },
  cardBottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5',
  },
  orderId: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#93959F' },
  actionBtns: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  reorderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#FFF3E0',
  },
  reorderText: { fontFamily: 'Inter-Bold', fontSize: 12, color: PRIMARY },
  viewDetailBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewDetailText: { fontFamily: 'Inter-Bold', fontSize: 13, color: PRIMARY },
  // Empty
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#3D4152', marginBottom: 6 },
  emptySub: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#93959F', textAlign: 'center', maxWidth: '80%', lineHeight: 20 },
  loginBtn: {
    marginTop: 24, backgroundColor: PRIMARY, borderRadius: 14,
    paddingHorizontal: 40, paddingVertical: 14,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  loginBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#FFF' },
});

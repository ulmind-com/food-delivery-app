import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Clock, ChevronRight, Package, Truck, CheckCircle2, XCircle } from 'lucide-react-native';
import { useTheme } from '../../constants/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { orderApi } from '../../services/api';

export default function OrdersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await orderApi.getMyOrders();
      setOrders(res.data.orders || res.data);
    } catch (e) {
      console.log('Error fetching orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [isAuthenticated()])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Pending':
      case 'Accepted':
        return { color: '#F59E0B', icon: <Package size={16} color="#F59E0B" /> };
      case 'Cooking':
      case 'Out for Delivery':
        return { color: '#3B82F6', icon: <Truck size={16} color="#3B82F6" /> };
      case 'Delivered':
        return { color: '#16a34a', icon: <CheckCircle2 size={16} color="#16a34a" /> };
      case 'Cancelled':
        return { color: '#DC2626', icon: <XCircle size={16} color="#DC2626" /> };
      default:
        return { color: colors.mutedForeground, icon: <Clock size={16} color={colors.mutedForeground} /> };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusInfo = getStatusInfo(item.status);
    const date = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    // Find restaurant info from items (backend includes product data in items array)
    // usually we would use item.restaurant or something similar, for now fallback to item info:
    const itemCount = item.items?.length || 0;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/orders/${item._id || item.id}`)}
        style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.orderId, { color: colors.foreground }]}>Order #{item._id?.slice(-6).toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
            {statusInfo.icon}
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Date</Text>
            <Text style={[styles.value, { color: colors.foreground }]}>{date}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Items</Text>
            <Text style={[styles.value, { color: colors.foreground }]}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Total</Text>
            <Text style={[styles.totalAmount, { color: colors.foreground }]}>₹{item.finalTotal?.toFixed(2) || item.totalPrice?.toFixed(2)}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.cardFooter}>
          <Text style={[styles.viewDetails, { color: colors.primary }]}>View Details</Text>
          <ChevronRight size={18} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated()) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Package size={64} color={colors.mutedForeground} style={{ opacity: 0.5, marginBottom: 16 }} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Login to view orders</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>You can track your previous orders here.</Text>
        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Orders</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={64} color={colors.mutedForeground} style={{ opacity: 0.5, marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No orders yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Looks like you haven't ordered anything yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: 'Inter-Black',
    fontSize: 24,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 12,
  },
  cardBody: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  value: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  totalAmount: {
    fontFamily: 'Inter-Black',
    fontSize: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  viewDetails: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 20,
  },
  loginBtn: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, CheckCircle2, ChevronDown, Phone, MapPin, ReceiptText } from 'lucide-react-native';
import { useTheme } from '../../constants/ThemeContext';
import { orderApi } from '../../services/api';
import { socket } from '../../services/socket';

const STATUS_STEPS = ['Pending', 'Accepted', 'Cooking', 'Out for Delivery', 'Delivered'];

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const router = useRouter(); // Fixing expo-router import

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await orderApi.getOrderById(id as string);
        setOrder(res.data.order || res.data);
      } catch (e) {
        console.log('Error fetching order tracking', e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!order) return;
    
    // Join room for real-time updates
    socket.emit('joinRoom', order._id);

    const handleStatusUpdate = (data: { orderId: string; status: string }) => {
      if (data.orderId === order._id) {
        setOrder((prev: any) => ({ ...prev, status: data.status }));
      }
    };

    socket.on('orderStatusUpdate', handleStatusUpdate);

    return () => {
      socket.off('orderStatusUpdate', handleStatusUpdate);
      socket.emit('leaveRoom', order._id);
    };
  }, [order?._id]);

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, fontFamily: 'Inter-Medium' }}>Order not found</Text>
      </View>
    );
  }

  const currentStepIdx = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'Cancelled';

  const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Tracking Order</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>#{order._id?.slice(-8).toUpperCase()}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Map Placeholder */}
        <View style={[styles.mapPlaceholder, { backgroundColor: isDark ? colors.card : '#e5e7eb' }]}>
          <MapPin size={32} color={colors.primary} />
          <Text style={[styles.mapText, { color: colors.mutedForeground }]}>Live Location Tracking</Text>
        </View>

        {/* Tracking Timeline */}
        <View style={[styles.trackingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 20 }]}>Status</Text>
          
          {isCancelled ? (
            <View style={styles.cancelledBox}>
              <Text style={styles.cancelledText}>Order Cancelled</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {STATUS_STEPS.map((step, idx) => {
                const isActive = idx <= currentStepIdx;
                const isLastActive = idx === currentStepIdx;
                
                return (
                  <View key={step} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.timelineDot,
                        { 
                          backgroundColor: isActive ? colors.primary : colors.muted,
                          borderColor: isLastActive ? colors.primary : 'transparent',
                          borderWidth: isLastActive ? 4 : 0
                        }
                      ]}>
                        {isActive && <CheckCircle2 size={12} color="#fff" />}
                      </View>
                      {idx < STATUS_STEPS.length - 1 && (
                        <View style={[
                          styles.timelineLine,
                          { backgroundColor: idx < currentStepIdx ? colors.primary : colors.muted }
                        ]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[
                        styles.timelineStatusTitle,
                        { color: isActive ? colors.foreground : colors.mutedForeground, fontFamily: isLastActive ? 'Inter-Bold' : 'Inter-Medium' }
                      ]}>
                        {step}
                      </Text>
                      {isLastActive && (
                        <Text style={[styles.timelineStatusDesc, { color: colors.primary }]}>
                          Currently processing this step
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Delivery Address & Contact */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoHeader}>
            <MapPin size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery to</Text>
          </View>
          {order.deliveryAddress ? (
            <View style={{ marginLeft: 32 }}>
              <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter-Bold' }]}>
                {order.deliveryAddress.type || 'Address'}
              </Text>
              <Text style={[styles.infoTextDesc, { color: colors.mutedForeground }]}>
                {order.deliveryAddress.addressLine1}, {order.deliveryAddress.city}
              </Text>
            </View>
          ) : (
            <Text style={{ marginLeft: 32, color: colors.mutedForeground }}>Address details not available</Text>
          )}
          
          {order.deliveryPartner && (
            <View style={styles.deliveryPartnerBox}>
              <View style={styles.dpAvatar}>
                <Text style={{ fontSize: 20 }}>🛵</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter-Bold' }]}>
                  {order.deliveryPartner.name}
                </Text>
                <Text style={[styles.infoTextDesc, { color: colors.mutedForeground }]}>
                  Delivery Partner
                </Text>
              </View>
              <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.primary + '15' }]}>
                <Phone size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Order Details */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoHeader}>
            <ReceiptText size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order Details</Text>
          </View>
          <Text style={[styles.infoTextDesc, { color: colors.mutedForeground, marginLeft: 32, marginBottom: 16 }]}>
            Placed on {date}
          </Text>

          <View style={styles.itemsList}>
            {order.items?.map((item: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemRowLeft}>
                  {item.product?.type === 'Veg' ? (
                    <View style={[styles.typeIcon, { borderColor: '#16a34a' }]}>
                      <View style={[styles.typeDot, { backgroundColor: '#16a34a' }]} />
                    </View>
                  ) : item.product?.type === 'Non-Veg' ? (
                    <View style={[styles.typeIcon, { borderColor: '#dc2626' }]}>
                      <View style={[styles.typeTriangle, { borderBottomColor: '#dc2626' }]} />
                    </View>
                  ) : <View style={{ width: 12 }} />}
                  <Text style={[styles.itemQty, { color: colors.primary }]}>{item.quantity}x</Text>
                  <Text style={[styles.itemText, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name || item.product?.name}
                  </Text>
                </View>
                <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.foreground }]}>Item Total</Text>
            <Text style={[styles.billValue, { color: colors.foreground }]}>₹{order.totalPrice?.toFixed(2)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.foreground }]}>Delivery & Taxes</Text>
            <Text style={[styles.billValue, { color: colors.foreground }]}>₹{(order.finalTotal - order.totalPrice)?.toFixed(2)}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.billRow}>
            <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Grand Total</Text>
            <Text style={[styles.grandTotalValue, { color: colors.primary }]}>₹{order.finalTotal?.toFixed(2)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.mutedForeground }]}>Payment Method</Text>
            <Text style={[styles.billValue, { color: colors.foreground, fontFamily: 'Inter-Medium' }]}>{order.paymentMethod}</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-Black',
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  mapPlaceholder: {
    height: 180,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    marginTop: 8,
  },
  trackingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: 'Inter-Black',
    fontSize: 18,
  },
  cancelledBox: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelledText: {
    color: '#dc2626',
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
    marginRight: 16,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: -2,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 24,
  },
  timelineStatusTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  timelineStatusDesc: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 2,
  },
  infoTextDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  deliveryPartnerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    marginLeft: 32,
  },
  dpAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(252, 128, 25, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsList: {
    marginLeft: 32,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  itemQty: {
    fontFamily: 'Inter-Black',
    fontSize: 13,
    marginHorizontal: 8,
  },
  itemText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    flex: 1,
  },
  itemPrice: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  typeIcon: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  typeDot: {
    width: 5,
    height: 5,
    borderRadius: 2,
  },
  typeTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    backgroundColor: 'transparent',
  },
  divider: {
    height: 1,
    marginLeft: 32,
    marginVertical: 12,
    opacity: 0.5,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 32,
    marginBottom: 8,
  },
  billLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  billValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  grandTotalLabel: {
    fontFamily: 'Inter-Black',
    fontSize: 16,
  },
  grandTotalValue: {
    fontFamily: 'Inter-Black',
    fontSize: 18,
  },
});

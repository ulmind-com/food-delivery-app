import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Phone, MapPin, ReceiptText, Map as MapIcon, Package, User } from 'lucide-react-native';
import { orderApi } from '../../services/api';
import { socket } from '../../services/socket';
import Animated, { FadeInDown, FadeIn, withTiming, withRepeat, withSequence, useAnimatedStyle, useSharedValue, Easing } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const PRIMARY = '#FC8019';
const TEXT_COLOR = '#1A1A1A';
const MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';
const BG = '#F9FAFB';

const STATUS_STEPS = [
  { id: 'Pending', label: 'Order Received', desc: 'We have received your order' },
  { id: 'Accepted', label: 'Order Accepted', desc: 'Restaurant is confirm your order' },
  { id: 'Cooking', label: 'Food is being prepared', desc: 'Your food is cooking' },
  { id: 'Out for Delivery', label: 'Out for Delivery', desc: 'Delivery partner is on the way' },
  { id: 'Delivered', label: 'Delivered Successfully', desc: 'Enjoy your meal!' },
];

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Animation values
  const pulseAnim = useSharedValue(1);

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
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    if (!order) return;
    
    socket.emit('joinRoom', order._id);

    const handleStatusUpdate = (data: { orderId: string; status: string }) => {
      if (data.orderId === order._id || data.orderId === id) {
        setOrder((prev: any) => ({ ...prev, status: data.status }));
      }
    };

    socket.on('orderStatusUpdate', handleStatusUpdate);

    return () => {
      socket.off('orderStatusUpdate', handleStatusUpdate);
      socket.emit('leaveRoom', order._id);
    };
  }, [order?._id]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    opacity: 1 / pulseAnim.value,
  }));

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: '#FFFFFF' }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={{ marginTop: 12, fontFamily: 'Inter-Medium', color: MUTED }}>Fetching order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: '#FFFFFF' }]}>
        <Text style={{ color: TEXT_COLOR, fontFamily: 'Inter-Medium' }}>Order not found</Text>
      </View>
    );
  }

  const currentStepIdx = STATUS_STEPS.findIndex(s => s.id === order.status);
  const isCancelled = order.status === 'Cancelled';

  const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/orders')} style={styles.backButton}>
          <ArrowLeft size={24} color={TEXT_COLOR} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Tracking Order</Text>
          <Text style={styles.headerSubtitle}>#{order._id?.slice(-8).toUpperCase()}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Animated Map Placeholder representing Live Location */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.mapPlaceholder}>
          <View style={styles.mapOverlay} />
          <View style={styles.liveLocationContainer}>
            <Animated.View style={[styles.pingCircle, animatedPulseStyle]} />
            <View style={styles.pinDot}>
              <View style={styles.pinDotInner} />
            </View>
          </View>
          <Text style={styles.mapText}>{isCancelled ? 'Tracker Disabled' : 'Delivery Location Locked'}</Text>
        </Animated.View>

        {/* Tracking Timeline */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          
          {isCancelled ? (
            <View style={styles.cancelledBox}>
              <Text style={styles.cancelledText}>Order Cancelled</Text>
              <Text style={styles.cancelledSub}>Unfortunately this order was cancelled.</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {STATUS_STEPS.map((step, idx) => {
                const isActive = idx <= currentStepIdx;
                const isLastActive = idx === currentStepIdx;
                const isDone = idx < currentStepIdx;
                
                return (
                  <View key={step.id} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.timelineDot,
                        { 
                          backgroundColor: isActive ? PRIMARY : '#F3F4F6',
                          borderColor: isLastActive ? PRIMARY : 'transparent',
                          borderWidth: isLastActive ? 4 : 0
                        }
                      ]}>
                        {isDone && <CheckCircle2 size={12} color="#fff" />}
                        {isLastActive && <View style={styles.innerDot} />}
                      </View>
                      {idx < STATUS_STEPS.length - 1 && (
                        <View style={[
                          styles.timelineLine,
                          { backgroundColor: isDone ? PRIMARY : '#F3F4F6' }
                        ]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[
                        styles.timelineStatusTitle,
                        { color: isActive ? TEXT_COLOR : MUTED, fontFamily: isLastActive ? 'Inter-Bold' : 'Inter-SemiBold' }
                      ]}>
                        {step.label}
                      </Text>
                      {isActive && (
                        <Text style={[styles.timelineStatusDesc, { color: isLastActive ? PRIMARY : MUTED }]}>
                          {step.desc}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Delivery Details */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.card}>
          <View style={styles.infoHeader}>
            <MapPin size={20} color={PRIMARY} />
            <Text style={styles.sectionTitle}>Delivery to</Text>
          </View>
          {order.deliveryAddress ? (
            <View style={{ marginLeft: 32 }}>
              <Text style={styles.infoText}>
                {order.deliveryAddress.type || 'Custom Address'}
              </Text>
              <Text style={styles.infoTextDesc}>
                {order.deliveryAddress.addressLine1}, {order.deliveryAddress.city} - {order.deliveryAddress.postalCode}
              </Text>
              {order.deliveryInstruction ? (
                <Text style={styles.instructionsText}>Note: {order.deliveryInstruction}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ marginLeft: 32, color: MUTED }}>Address not available</Text>
          )}
          
          {order.deliveryPartner && (
            <View style={styles.deliveryPartnerBox}>
              <View style={styles.dpAvatar}>
                <User size={20} color={PRIMARY} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoText}>{order.deliveryPartner.name}</Text>
                <Text style={styles.infoTextDesc}>Valet Partner</Text>
              </View>
              <TouchableOpacity style={styles.callBtn}>
                <Phone size={18} color={PRIMARY} />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Bill */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={[styles.card, { marginBottom: 40 }]}>
          <View style={styles.infoHeader}>
            <ReceiptText size={20} color={PRIMARY} />
            <Text style={styles.sectionTitle}>Bill Summary</Text>
          </View>
          <Text style={styles.dateInfoText}>Placed on {date}</Text>

          <View style={styles.itemsList}>
            {order.items?.map((item: any, idx: number) => (
               <View key={idx} style={styles.itemRow}>
                 <View style={styles.itemRowLeft}>
                    {item.variant ? (
                       <Text style={styles.itemQty}>{item.quantity}x {item.variant}</Text>
                    ) : (
                       <Text style={styles.itemQty}>{item.quantity}x</Text>
                    )}
                   <Text style={styles.itemText} numberOfLines={1}>
                     {item.name || item.product?.name}
                   </Text>
                 </View>
                 <Text style={styles.itemPrice}>
                   ₹{(item.price * item.quantity).toFixed(2)}
                 </Text>
               </View>
            ))}
          </View>

          <View style={styles.divider} />
          
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{order.totalAmount?.toFixed(2)}</Text>
          </View>

          {(order.discountApplied > 0) && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: '#16a34a' }]}>Discount</Text>
              <Text style={[styles.billValue, { color: '#16a34a' }]}>-₹{order.discountApplied?.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery & Taxes</Text>
            <Text style={styles.billValue}>₹{Math.max((order.finalAmount - order.totalAmount + (order.discountApplied || 0)), 0)?.toFixed(2)}</Text>
          </View>

          <View style={[styles.divider, { borderStyle: 'dashed' }]} />

          <View style={styles.billRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>₹{order.finalAmount?.toFixed(2)}</Text>
          </View>
          <View style={styles.paymentMethodLabel}>
            <Text style={styles.billLabel}>PAID VIA {order.paymentMethod}</Text>
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitleBox: { alignItems: 'center' },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 17, color: TEXT_COLOR },
  headerSubtitle: { fontFamily: 'Inter-Medium', fontSize: 11, color: MUTED },
  
  scrollContent: { padding: 16, gap: 16 },
  
  mapPlaceholder: {
    height: 160, borderRadius: 20, backgroundColor: '#E5E7EB', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', position: 'relative'
  },
  mapOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(252, 128, 25, 0.05)' },
  liveLocationContainer: { position: 'relative', width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  pingCircle: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(252, 128, 25, 0.3)' },
  pinDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  pinDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: PRIMARY },
  mapText: { fontFamily: 'Inter-Bold', fontSize: 13, color: PRIMARY, marginTop: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: BORDER,
  },
  sectionTitle: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_COLOR },
  
  cancelledBox: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, marginTop: 16 },
  cancelledText: { color: '#DC2626', fontFamily: 'Inter-Black', fontSize: 16, marginBottom: 2 },
  cancelledSub: { color: '#B91C1C', fontFamily: 'Inter-Medium', fontSize: 12 },

  timeline: { paddingLeft: 8, marginTop: 20 },
  timelineItem: { flexDirection: 'row', minHeight: 65 },
  timelineLeft: { alignItems: 'center', width: 24, marginRight: 16 },
  timelineDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  timelineLine: { width: 2, flex: 1, marginVertical: -2, zIndex: 1 },
  timelineContent: { flex: 1, paddingBottom: 24 },
  timelineStatusTitle: { fontSize: 15, marginBottom: 4 },
  timelineStatusDesc: { fontFamily: 'Inter-Medium', fontSize: 12 },

  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  infoText: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_COLOR, marginBottom: 4 },
  infoTextDesc: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED, lineHeight: 18 },
  instructionsText: { fontFamily: 'Inter-Bold', fontSize: 12, color: PRIMARY, marginTop: 8, backgroundColor: 'rgba(252, 128, 25, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },

  deliveryPartnerBox: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER, marginLeft: 32 },
  dpAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(252, 128, 25, 0.1)', justifyContent: 'center', alignItems: 'center' },
  callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(252, 128, 25, 0.1)', justifyContent: 'center', alignItems: 'center' },

  dateInfoText: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED, marginLeft: 32, marginBottom: 16 },
  
  itemsList: { marginLeft: 32, marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemRowLeft: { flexDirection: 'row', flex: 1, paddingRight: 16 },
  itemQty: { fontFamily: 'Inter-Black', fontSize: 13, color: PRIMARY, width: 24 },
  itemText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: TEXT_COLOR, flex: 1 },
  itemPrice: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_COLOR },

  divider: { height: 1, backgroundColor: BORDER, marginLeft: 32, marginVertical: 12 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 32, marginBottom: 8 },
  billLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED },
  billValue: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: TEXT_COLOR },
  
  grandTotalLabel: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_COLOR },
  grandTotalValue: { fontFamily: 'Inter-Black', fontSize: 18, color: PRIMARY },
  paymentMethodLabel: { marginLeft: 32, marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }
});

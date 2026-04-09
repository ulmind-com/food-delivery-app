import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Dimensions, ActivityIndicator, Pressable, Platform 
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, CheckCircle, Package, MapPin, CreditCard, 
  Clock, XCircle, ChevronRight, ShoppingBag, ChefHat, Bike, 
  MessageCircle, Phone, RefreshCw
} from 'lucide-react-native';
import { Image } from 'expo-image';
import Animated, { 
  FadeInDown, FadeIn, withTiming, withRepeat, withSequence, 
  useAnimatedStyle, useSharedValue, Easing, SlideInDown, SlideOutDown,
  withSpring
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { orderApi, restaurantApi } from '../../services/api';
import { socket } from '../../services/socket';
import MapComponent from '../../components/MapComponent';

const { width, height } = Dimensions.get('window');

const PRIMARY = '#FC8019';
const TEXT_COLOR = '#1A1A1A';
const MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';
const BG = '#F9FAFB';

const STATUS_STEPS = ["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];
const CANCEL_WINDOW_MS = 3 * 60 * 1000;

// Recreating exactly the web STATUS_CONFIG
const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; desc: string; emoji: string; lottie?: any }> = {
  PLACED: { label: "Order Placed", icon: ShoppingBag, color: "#2563EB", bg: "#3B82F6", desc: "Your order has been received", emoji: "🛒" },
  ACCEPTED: { label: "Accepted", icon: CheckCircle, color: "#0891B2", bg: "#06B6D4", desc: "Restaurant accepted your order", emoji: "✅" },
  PREPARING: { label: "Preparing", icon: ChefHat, color: "#EA580C", bg: "#F97316", desc: "Your food is being prepared", emoji: "👨‍🍳", lottie: require('../../assets/lottie/prepareing.json') },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", icon: Bike, color: "#9333EA", bg: "#A855F7", desc: "Your order is on the way!", emoji: "🛵", lottie: require('../../assets/lottie/outfordelivery.json') },
  DELIVERED: { label: "Delivered", icon: CheckCircle, color: "#16A34A", bg: "#22C55E", desc: "Enjoy your meal!", emoji: "🎉", lottie: require('../../assets/lottie/orderdelivered.json') },
  CANCELLED: { label: "Cancelled", icon: XCircle, color: "#DC2626", bg: "#EF4444", desc: "Order was cancelled", emoji: "❌" },
};

const PAYMENT_CONFIG: Record<string, { color: string; bg: string }> = {
  PENDING: { color: "#A16207", bg: "#FEF9C3" },
  PAID: { color: "#15803D", bg: "#DCFCE7" },
  FAILED: { color: "#B91C1C", bg: "#FEE2E2" },
};

const SkeletonItem = ({ heightStyle }: { heightStyle: number }) => {
  const pulse = useSharedValue(0.5);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[styles.skeleton, animStyle, { height: heightStyle }]} />;
};

function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);

  // Sockets
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [livePrepTime, setLivePrepTime] = useState<number | null>(null);

  // Animation values
  const pulseAnim = useSharedValue(1);

  const fetchOrder = async () => {
    try {
      const [resOrder, resRest] = await Promise.all([
        orderApi.getOrderById(id as string),
        restaurantApi.get().catch(() => null)
      ]);
      setOrder(resOrder.data.order || resOrder.data);
      if (resRest?.data) setRestaurant(resRest.data);
    } catch (e) {
      console.log('Error fetching order', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

    if (!id) return;
    
    // Connect to sockets (assumes socket service manages lifecycle)
    socket.emit('joinRoom', id);
    
    const onStatus = (data: any) => {
      if (data.orderId === id && data.status) {
        setLiveStatus(data.status.toUpperCase());
        fetchOrder();
      }
    };
    const onPrep = (data: any) => {
      if (data.orderId === id && data.preparationTime !== undefined) {
        setLivePrepTime(data.preparationTime);
      }
    };

    socket.on('orderStatusUpdate', onStatus);
    socket.on('preparationTimeUpdated', onPrep);

    return () => {
      socket.off('orderStatusUpdate', onStatus);
      socket.off('preparationTimeUpdated', onPrep);
      socket.emit('leaveRoom', id);
    };
  }, [id]);

  function decodePolyline(encoded: string, precision = 6): [number, number][] {
      const factor = Math.pow(10, precision);
      const coords: [number, number][] = [];
      let index = 0, lat = 0, lng = 0;
      while (index < encoded.length) {
          let b, shift = 0, result = 0;
          do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
          lat += (result & 1) ? ~(result >> 1) : (result >> 1);
          shift = 0; result = 0;
          do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
          lng += (result & 1) ? ~(result >> 1) : (result >> 1);
          coords.push([lat / factor, lng / factor]);
      }
      return coords;
  }

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    opacity: 1 / pulseAnim.value,
  }));

  const status = (liveStatus || order?.status || order?.orderStatus || "PLACED").toUpperCase();
  const isActive = !["DELIVERED", "CANCELLED"].includes(status);

  const deliveryCoords = order?.deliveryCoordinates || order?.deliveryAddress?.coordinates || (order?.deliveryAddress?.lat != null ? { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng } : null);
  const userLat: number | undefined = deliveryCoords?.lat ?? deliveryCoords?.latitude;
  const userLng: number | undefined = deliveryCoords?.lng ?? deliveryCoords?.longitude;
  const restaurantLat: number | undefined = restaurant?.location?.lat;
  const restaurantLng: number | undefined = restaurant?.location?.lng;
  const showMap = isActive && (!!(restaurantLat && restaurantLng) || !!(userLat && userLng));

  useEffect(() => {
    if (!showMap || !restaurantLat || !userLat || !restaurantLng || !userLng) return;
    const fetchRoute = async () => {
      try {
        const valhallaBody = { locations: [{ lon: restaurantLng, lat: restaurantLat }, { lon: userLng, lat: userLat }], costing: "auto", directions_options: { units: "km" } };
        const valRes = await fetch("https://valhalla1.openstreetmap.de/route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valhallaBody) });
        if (valRes.ok) {
            const valData = await valRes.json();
            const leg = valData.trip?.legs?.[0];
            if (leg?.shape) {
                const decoded = decodePolyline(leg.shape, 6);
                setRouteCoords(decoded.map(c => ({ latitude: c[0], longitude: c[1] })));
                return;
            }
        }
      } catch(e) {}
      
      try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${restaurantLng},${restaurantLat};${userLng},${userLat}?overview=full&geometries=geojson&alternatives=false&steps=false`;
          const osrmRes = await fetch(osrmUrl);
          const osrmData = await osrmRes.json();
          if (osrmData.routes?.[0]) {
              const route = osrmData.routes[0];
              setRouteCoords(route.geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] })));
              return;
          }
      } catch {}
      
      setRouteCoords([{latitude: restaurantLat, longitude: restaurantLng}, {latitude: userLat, longitude: userLng}]);
    };
    fetchRoute();
  }, [showMap, restaurantLat, restaurantLng, userLat, userLng]);

  const handleCancelClick = async () => {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    try {
      await orderApi.cancelOrder(order._id);
      setShowCancelModal(false);
      fetchOrder(); 
    } catch (e) {
      console.log('Cancel failed', e);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/orders')} style={styles.backButton}>
            <ArrowLeft size={24} color={TEXT_COLOR} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scrollContent} scrollEnabled={false}>
          <SkeletonItem heightStyle={110} />
          <SkeletonItem heightStyle={320} />
          <SkeletonItem heightStyle={200} />
        </ScrollView>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.centerWrap]}>
        <Package size={64} color={MUTED} opacity={0.3} />
        <Text style={styles.emptyTitle}>Order not found</Text>
        <TouchableOpacity style={styles.btnSolid} onPress={() => router.replace('/(tabs)/orders')}>
          <Text style={styles.btnSolidText}>Back to Orders</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PLACED;
  const currentStepIdx = STATUS_STEPS.indexOf(status);
  const isCancelled = status === "CANCELLED";
  const currentPrepTime = livePrepTime !== null ? livePrepTime : order?.preparationTime;

  const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const deliveryAddr = order.deliveryAddress;
  const deliveryText = typeof deliveryAddr === "object" && deliveryAddr
    ? [deliveryAddr.addressLine1 || deliveryAddr.houseNo, deliveryAddr.addressLine2 || deliveryAddr.street, deliveryAddr.city, deliveryAddr.postalCode || deliveryAddr.zip].filter(Boolean).join(", ")
    : (order.address || deliveryAddr || "Address not available");

  const canCancel = status === "PLACED" && (Date.now() - new Date(order.createdAt).getTime()) < CANCEL_WINDOW_MS;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_right' }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/orders')} style={styles.backButton}>
          <ArrowLeft size={24} color={TEXT_COLOR} />
        </TouchableOpacity>
        <Text style={styles.headerTitleMain}>Track Order</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ── Hero Status Banner ── */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.heroBanner, { backgroundColor: cfg.bg, position: 'relative', overflow: 'hidden' }]}>
          {/* Subtle Background Pattern or Lottie Blob effect */}
          <View style={styles.heroGlowOverlay} />
          
          <View style={styles.heroContentRow}>
            <View style={{ flex: 1, zIndex: 10 }}>
              <View style={styles.heroTitleRow}>
                {!cfg.lottie && (
                  <Animated.Text style={[styles.heroEmoji, isActive && animatedPulseStyle]}>
                    {cfg.emoji}
                  </Animated.Text>
                )}
                <Text style={styles.heroTitle}>{cfg.label}</Text>
              </View>
              <Text style={styles.heroDesc}>{cfg.desc}</Text>

              {status === "PREPARING" && currentPrepTime > 0 && (
                <View style={[styles.prepTimeBadge, { marginTop: 8 }]}>
                  <Clock size={12} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.prepTimeText}>Takes {currentPrepTime} mins</Text>
                </View>
              )}

              <Text style={styles.heroMeta}>
                #{order.customId || (order._id || '').slice(-6).toUpperCase()} · {date}
              </Text>
            </View>

            {/* Dynamic Lottie / Icon Render on Right Side */}
            <View style={styles.heroRightSide}>
              {cfg.lottie ? (
                <LottieView 
                  source={cfg.lottie} 
                  autoPlay 
                  loop
                  style={styles.heroLottie}
                />
              ) : (
                <View style={styles.heroIconBox}>
                  <cfg.icon color="#FFFFFF" size={32} />
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* ── Live Tracker Map Card ── */}
        {showMap && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.card}>
            <View style={styles.cardHeaderRow}>
               <View style={styles.cardTitleWrap}>
                  <MapPin size={16} color={PRIMARY} />
                  <Text style={styles.cardTitle}>{isActive ? "Live Tracking" : "Delivery Route"}</Text>
               </View>
               {isActive && (
                 <View style={styles.liveBadgeBox}>
                   <Animated.View style={[styles.liveDot, animatedPulseStyle]} />
                   <Text style={styles.liveBadgeText}>LIVE</Text>
                 </View>
               )}
            </View>
            
            <View style={styles.mapPlaceholder}>
              {(restaurantLat && userLat) ? (
                <View style={StyleSheet.absoluteFillObject}>
                  <MapComponent 
                    restaurantLat={restaurantLat}
                    restaurantLng={restaurantLng!}
                    userLat={userLat}
                    userLng={userLng!}
                    routeCoords={routeCoords}
                    isActive={isActive}
                    animatedPulseStyle={animatedPulseStyle}
                  />
                </View>
              ) : (
                <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.mapText}>No GPS coordinates found for this order</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── Order Status Stepper ── */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
          <View style={styles.cardHeaderRow}>
             <View style={styles.cardTitleWrap}>
                <Package size={16} color={PRIMARY} />
                <Text style={styles.cardTitle}>Order Progress</Text>
             </View>
          </View>
          
          {isCancelled ? (
            <View style={styles.cancelledBox}>
              <View style={styles.cancelIconRow}>
                 <View style={styles.cancelIconWrap}><XCircle color="#FFFFFF" size={20}/></View>
                 <View>
                   <Text style={styles.cancelledText}>Order Cancelled</Text>
                   <Text style={styles.cancelledSubText}>This order process was aborted.</Text>
                 </View>
              </View>
            </View>
          ) : (
            <View style={styles.stepperContainer}>
              {STATUS_STEPS.map((step, idx) => {
                 const stepCfg = STATUS_CONFIG[step];
                 const isStepActive = idx <= currentStepIdx;
                 const isStepCurrent = idx === currentStepIdx;
                 const StepIcon = stepCfg.icon;

                 return (
                   <View key={step} style={styles.stepRow}>
                     <View style={styles.stepIconColumn}>
                       <View style={[
                         styles.stepIconDot, 
                         isStepActive ? { backgroundColor: stepCfg.bg } : { backgroundColor: '#F3F4F6' },
                         isStepCurrent && { borderWidth: 4, borderColor: `${stepCfg.bg}30` }
                        ]}>
                         <StepIcon size={18} color={isStepActive ? '#FFFFFF' : '#9CA3AF'} />
                       </View>
                       {idx < STATUS_STEPS.length - 1 && (
                         <View style={[styles.stepLine, isStepActive && idx < currentStepIdx ? { backgroundColor: stepCfg.bg } : { backgroundColor: '#F3F4F6' }]} />
                       )}
                     </View>
                     <View style={styles.stepTextColumn}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                         <Text style={[styles.stepLabel, isStepActive ? { color: TEXT_COLOR } : { color: MUTED }]}>
                           {stepCfg.label}
                         </Text>
                         {isStepCurrent && <Text style={{ fontSize: 16 }}>{stepCfg.emoji}</Text>}
                       </View>
                       {isStepCurrent && <Text style={styles.stepDesc}>{stepCfg.desc}</Text>}
                     </View>
                   </View>
                 )
              })}
            </View>
          )}
        </Animated.View>

        {/* ── Order Items & Bill ── */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.card}>
          <View style={styles.cardHeaderRow}>
             <View style={styles.cardTitleWrap}>
                <ShoppingBag size={16} color={PRIMARY} />
                <Text style={styles.cardTitle}>Items · {order?.items?.length || 0}</Text>
             </View>
          </View>
          
          <View style={styles.itemsList}>
            {(order.items || []).map((item: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                {item.image && (
                  <Image source={{ uri: item.image }} style={styles.itemThumb} contentFit="cover" />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name || item.product?.name || item.menuItem?.name || "Item"}
                  </Text>
                  {item.variant && <Text style={styles.itemVariant}>{item.variant}</Text>}
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{Number((item.price || 0) * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.billBox}>
            <View style={styles.billRow}><Text style={styles.billKey}>Subtotal</Text><Text style={styles.billVal}>₹{Number(order.totalAmount || 0).toFixed(2)}</Text></View>
            {order.deliveryFee > 0 && (
              <View style={styles.billRow}><Text style={styles.billKey}>Delivery Fee</Text><Text style={styles.billVal}>₹{order.deliveryFee}</Text></View>
            )}
            
            {order.taxAmount > 0 || order.cgstTotal > 0 ? (
              <View style={styles.billRow}>
                 <Text style={styles.billKey}>Taxes (CGST/SGST)</Text>
                 <Text style={styles.billVal}>₹{order.taxAmount || ((order.cgstTotal||0) + (order.sgstTotal||0))}</Text>
              </View>
            ) : null}

            {order.discountApplied > 0 && (
              <View style={styles.billRow}>
                 <Text style={[styles.billKey, { color: '#16A34A' }]}>Discount</Text>
                 <Text style={[styles.billVal, { color: '#16A34A' }]}>-₹{order.discountApplied}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.billRow}>
              <Text style={styles.billTotalKey}>Total Paid</Text>
              <Text style={styles.billTotalVal}>₹{Number(order.finalAmount || order.totalAmount || 0).toFixed(2)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Delivery Info ── */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.card}>
          <View style={styles.cardHeaderRow}>
             <View style={styles.cardTitleWrap}>
                <CreditCard size={16} color={PRIMARY} />
                <Text style={styles.cardTitle}>Payment & Delivery</Text>
             </View>
          </View>
          
          <View style={styles.paymentRow}>
             <Text style={styles.paymentKey}>Payment</Text>
             <Text style={styles.paymentMode}>{order.paymentMethod || "—"}</Text>
             {order.paymentStatus && (
               <View style={[styles.paymentBadge, { backgroundColor: PAYMENT_CONFIG[order.paymentStatus?.toUpperCase()]?.bg || '#F3F4F6' }]}>
                 <Text style={[styles.paymentBadgeText, { color: PAYMENT_CONFIG[order.paymentStatus?.toUpperCase()]?.color || '#374151' }]}>
                   {order.paymentStatus}
                 </Text>
               </View>
             )}
          </View>

          {deliveryText && (
            <View style={styles.addressRow}>
              <MapPin size={16} color={PRIMARY} style={{ marginTop: 2, flexShrink: 0 }} />
              <Text style={styles.addressText}>{deliveryText}</Text>
            </View>
          )}

          {restaurant?.mobile && (
             <View style={styles.restaurantContactBox}>
                <View style={{ flex: 1 }}>
                   <Text style={styles.restaurantTitle}>{restaurant.name || 'Restaurant'}</Text>
                   <Text style={styles.restaurantSub}>Need help with your order?</Text>
                </View>
                <TouchableOpacity style={styles.callBadge} onPress={() => {/* Linking.openURL(`tel:${restaurant.mobile}`) */}}>
                   <Phone size={14} color="#2563EB" />
                   <Text style={{ color: '#2563EB', fontFamily: 'Inter-Bold', fontSize: 12 }}>Call</Text>
                </TouchableOpacity>
             </View>
          )}
        </Animated.View>

        {/* ── Cancel Button ── */}
        {canCancel && (
          <Animated.View entering={FadeInDown.delay(350).springify()} style={{ paddingBottom: 40 }}>
            <TouchableOpacity 
              style={styles.cancelOuterBtn}
              onPress={() => setShowCancelModal(true)}
            >
              <XCircle size={18} color="#DC2626" />
              <Text style={styles.cancelOuterText}>Cancel Order</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      {/* Cancel Modal */}
      {showCancelModal && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.modalOverlay}>
          <Animated.View entering={SlideInDown.duration(300).springify()} style={styles.modalContent}>
             <Text style={styles.modalTitle}>Cancel Order?</Text>
             <Text style={styles.modalSub}>Are you sure you want to cancel this order? Please state a reason.</Text>
             
             {/* Note: In React Native, TextInput is required, but we can fake it with simplified UX or avoid to focus error on modal. */}
             
             <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalBtnKeep} onPress={() => setShowCancelModal(false)}>
                   <Text style={styles.modalBtnKeepText}>Keep Order</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setCancelReason('User Requested'); handleCancelClick(); }}>
                   {cancelling ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalBtnCancelText}>Cancel</Text>}
                </TouchableOpacity>
             </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: BORDER,
    zIndex: 10,
  },
  backButton: { padding: 4 },
  headerTitleMain: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_COLOR },
  
  scrollContent: { padding: 16, paddingBottom: 60 },
  
  skeleton: { backgroundColor: '#F0F0F5', borderRadius: 16, marginBottom: 16 },

  heroBanner: { borderRadius: 24, padding: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  heroGlowOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF', opacity: 0.1, alignSelf: 'flex-end', width: '150%', height: '150%', borderRadius: 300, top: -100, right: -100 },
  heroContentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  heroEmoji: { fontSize: 28 },
  heroTitle: { fontFamily: 'Inter-Black', fontSize: 24, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 },
  heroDesc: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#FFFFFF', opacity: 0.9, marginBottom: 12 },
  prepTimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  prepTimeText: { fontFamily: 'Inter-Bold', fontSize: 12, color: '#FFFFFF' },
  heroMeta: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#FFFFFF', opacity: 0.75, letterSpacing: 0.5, marginTop: 4 },
  
  heroRightSide: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  heroIconBox: { width: 64, height: 64, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-10deg' }] },
  heroLottie: { width: 140, height: 140, position: 'absolute', right: -20, top: -20 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  liveBadgeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  liveBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#15803D' },

  mapPlaceholder: { height: 280, backgroundColor: '#F0F0F5', borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#E5E7EB', opacity: 0.5 },
  liveLocationContainer: { alignItems: 'center', justifyContent: 'center' },
  pingCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(34,197,94,0.3)', position: 'absolute' },
  pinDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#16A34A', borderWidth: 3, borderColor: '#FFFFFF', elevation: 2 },
  mapText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: MUTED, marginTop: 16 },

  restMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EA580C', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', elevation: 4 },
  userMarker: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48 },
  pulsingUserMarker: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(34,197,94,0.3)' },
  userDotMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', elevation: 4 },

  cancelledBox: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FECACA' },
  cancelIconRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cancelIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  cancelledText: { fontFamily: 'Inter-Bold', fontSize: 15, color: '#DC2626' },
  cancelledSubText: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#EF4444', opacity: 0.8 },

  stepperContainer: { paddingVertical: 4 },
  stepRow: { flexDirection: 'row', minHeight: 60 },
  stepIconColumn: { width: 40, alignItems: 'center' },
  stepIconDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  stepLine: { width: 2, flex: 1, marginVertical: -4, zIndex: 1 },
  stepTextColumn: { flex: 1, paddingBottom: 24, paddingTop: 6, paddingLeft: 8 },
  stepLabel: { fontFamily: 'Inter-Bold', fontSize: 14 },
  stepDesc: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED, marginTop: 2 },

  itemsList: { marginBottom: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  itemThumb: { width: 44, height: 44, borderRadius: 10 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: TEXT_COLOR },
  itemVariant: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED },
  itemQty: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED },
  itemPrice: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_COLOR },
  
  billBox: { backgroundColor: BG, padding: 16, borderRadius: 12 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billKey: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED },
  billVal: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: MUTED },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 8 },
  billTotalKey: { fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_COLOR },
  billTotalVal: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_COLOR },

  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  paymentKey: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED },
  paymentMode: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: TEXT_COLOR },
  paymentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  paymentBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, textTransform: 'uppercase' },

  addressRow: { flexDirection: 'row', gap: 8 },
  addressText: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_COLOR, lineHeight: 18 },

  restaurantContactBox: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, marginTop: 16, alignItems: 'center', justifyContent: 'space-between' },
  restaurantTitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#1E3A8A' },
  restaurantSub: { fontFamily: 'Inter-Medium', fontSize: 11, color: '#3B82F6' },
  callBadge: { flexDirection: 'row', backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 4, alignItems: 'center' },

  cancelOuterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#FECACA' },
  cancelOuterText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#DC2626' },

  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 24, padding: 24, elevation: 10 },
  modalTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_COLOR, marginBottom: 8 },
  modalSub: { fontFamily: 'Inter-Medium', fontSize: 14, color: MUTED, marginBottom: 24, lineHeight: 20 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtnKeep: { paddingHorizontal: 16, paddingVertical: 10 },
  modalBtnKeepText: { fontFamily: 'Inter-Bold', fontSize: 14, color: MUTED },
  modalBtnCancel: { backgroundColor: '#DC2626', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  modalBtnCancelText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#FFFFFF' },

  centerWrap: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_COLOR, marginTop: 16, marginBottom: 16 },
  btnSolid: { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnSolidText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#FFFFFF' },
});

export default OrderTrackingScreen;

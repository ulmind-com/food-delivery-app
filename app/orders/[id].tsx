import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Dimensions, ActivityIndicator, Pressable, Platform, TextInput, Alert, Linking
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, CheckCircle, Package, MapPin, CreditCard, 
  Clock, XCircle, ChevronRight, ShoppingBag, ChefHat, Bike, 
  MessageCircle, Phone, RefreshCw, CloudRain, Copy, Receipt, Calendar, User, MessageSquareText
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, FadeIn, withTiming, withRepeat, withSequence, withDelay,
  useAnimatedStyle, useSharedValue, Easing, SlideInDown, SlideOutDown,
  withSpring
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { orderApi, restaurantApi } from '../../services/api';
import { socket } from '../../services/socket';
import MapComponent from '../../components/MapComponent';
import { useWeather } from '../../hooks/useWeather';
import { useAuthStore } from '../../store/useAuthStore';

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
  PLACED: { label: "Order Placed", icon: ShoppingBag, color: "#16A34A", bg: "#22C55E", desc: "Your order has been received", emoji: "🛒", lottie: require('../../assets/lottie/OrderPlaced.json') },
  ACCEPTED: { label: "Order Confirmed", icon: CheckCircle, color: "#0891B2", bg: "#06B6D4", desc: "Restaurant accepted your order", emoji: "✅", lottie: require('../../assets/lottie/Order-Confirmed.json') },
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

// ─── Animated RainDrop Component ───
function RainDrop({ leftPct, delay, duration, height }: { leftPct: number; delay: number; duration: number; height: number }) {
  const translateY = useSharedValue(-30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delay,
      withRepeat(
        withTiming(250, { duration, easing: Easing.linear }),
        -1, false
      )
    );
    opacity.value = withDelay(delay,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 100 }),
          withTiming(0.7, { duration: duration - 200 }),
          withTiming(0, { duration: 100 })
        ),
        -1, false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        left: `${leftPct}%`,
        top: -20,
        width: 1.5,
        height,
        backgroundColor: 'rgba(255,255,255,0.45)',
        borderRadius: 1,
      }, animStyle]}
    />
  );
}

function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelRemaining, setCancelRemaining] = useState('');
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);

  // Authenticated Used Backup
  const { user: authUser } = useAuthStore();

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
  const userLat: number | undefined = deliveryCoords?.lat ?? deliveryCoords?.latitude ?? deliveryCoords?.[1];
  const userLng: number | undefined = deliveryCoords?.lng ?? deliveryCoords?.longitude ?? deliveryCoords?.[0];
  const restaurantLat: number | undefined = restaurant?.location?.lat;
  const restaurantLng: number | undefined = restaurant?.location?.lng;
  const showMap = (!!restaurantLat && !!restaurantLng) && (!!userLat && !!userLng);

  const { isRaining: dynamicIsRaining } = useWeather(userLat || restaurantLat, userLng || restaurantLng);
  // Disable weather theme if order is DELIVERED or CANCELLED
  const isRaining = dynamicIsRaining && isActive;

  // ─── Raindrop Re-render Memoization ───
  const rainDropsConfig = React.useMemo(() => {
    return Array.from({ length: 35 }).map(() => ({
      left: Math.random() * 100,
      delay: Math.random() * 1500,
      duration: 600 + Math.random() * 500,
      h: 12 + Math.random() * 14
    }));
  }, []);

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
    if (!cancelReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for cancellation.');
      return;
    }
    setCancelling(true);
    try {
      await orderApi.cancelOrder(order._id, cancelReason.trim());
      setShowCancelModal(false);
      setCancelReason('');
      fetchOrder(); 
    } catch (e: any) {
      Alert.alert('Cancel Failed', e.response?.data?.message || 'Could not cancel order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // Countdown timer for cancel window (must be before early returns)
  const canCancel = !loading && order && status === "PLACED" && (Date.now() - new Date(order.createdAt).getTime()) < CANCEL_WINDOW_MS;

  useEffect(() => {
    if (!canCancel || !order?.createdAt) { setCancelRemaining(''); return; }
    const tick = () => {
      const left = CANCEL_WINDOW_MS - (Date.now() - new Date(order.createdAt).getTime());
      if (left <= 0) { setCancelRemaining(''); return; }
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      setCancelRemaining(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [canCancel, order?.createdAt]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView style={[styles.scrollContent, { marginTop: Platform.OS === 'ios' ? 50 : 30 }]} scrollEnabled={false}>
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
  const rawPrepTime = livePrepTime !== null ? livePrepTime : order?.preparationTime;
  const currentPrepTime = Number(rawPrepTime) || 0;

  const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const deliveryAddr = order.deliveryAddress;
  const deliveryText = typeof deliveryAddr === "object" && deliveryAddr
    ? [deliveryAddr.addressLine1 || deliveryAddr.houseNo, deliveryAddr.addressLine2 || deliveryAddr.street, deliveryAddr.city, deliveryAddr.postalCode || deliveryAddr.zip].filter(Boolean).join(", ")
    : (order.address || deliveryAddr || "Address not available");


  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_right' }} />

      {/* ── OP Top Navigation Bar ── */}
      <View style={{ 
         paddingTop: Platform.OS === 'ios' ? 54 : 40, 
         paddingBottom: 16, 
         paddingHorizontal: 16, 
         backgroundColor: '#FFFFFF', 
         flexDirection: 'row', 
         alignItems: 'center', 
         justifyContent: 'space-between',
         borderBottomWidth: 1,
         borderBottomColor: '#F3F4F6',
         zIndex: 100 
      }}>
         <TouchableOpacity 
            onPress={() => router.replace('/(tabs)/orders')} 
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' }}
         >
            <ArrowLeft size={20} color="#111827" />
         </TouchableOpacity>
         
         <Text style={{ fontFamily: 'Inter-Black', fontSize: 17, color: '#111827', letterSpacing: -0.3 }}>
            Order Details
         </Text>

         <TouchableOpacity 
            onPress={() => router.push('/chat')} 
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10 }}
         >
            <MessageSquareText size={16} color="#EF4444" strokeWidth={2.5} />
            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 13, color: '#EF4444' }}>Support</Text>
         </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ── Hero Status + Map (Floating Premium Card) ── */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.heroMapWrap, { position: 'relative', overflow: 'hidden', marginHorizontal: 16, marginTop: 16, borderRadius: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' }]}>

          {/* Status Section */}
          <LinearGradient 
            colors={isRaining ? ['#334155', '#0F172A'] : [cfg.bg, cfg.color]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.heroSection, { overflow: 'hidden', paddingVertical: 32 }]}
          >
            {/* BACKGROUND WRAPPER */}
            <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]}>
              {isRaining && (
                <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                  <Image source={require('../../assets/images/rainImage.png')} style={[StyleSheet.absoluteFillObject, { opacity: 0.95 }]} contentFit="cover" />
                  {rainDropsConfig.map((rd, i) => (
                    <RainDrop key={`rd-${i}`} leftPct={rd.left} delay={rd.delay} duration={rd.duration} height={rd.h} />
                  ))}
                </View>
              )}
              <View style={styles.heroGlowOverlay} />
            </View>
            <View style={[styles.heroContentRow, { zIndex: 5 }]}>
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
                  <View style={[styles.prepTimeBadge, { marginTop: 4 }]}>
                    <Clock size={12} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.prepTimeText}>Arriving in ~{currentPrepTime} mins</Text>
                  </View>
                )}

                {isRaining && status !== "DELIVERED" && status !== "CANCELLED" && (
                  <View style={[styles.prepTimeBadge, { marginTop: 4, backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.2)' }]}>
                    <CloudRain size={12} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.prepTimeText}>Rain expected • Delivery may be delayed</Text>
                  </View>
                )}

                <Text style={styles.heroMeta}>
                  #{order.customId || (order._id || '').slice(-6).toUpperCase()} · {date}
                </Text>
              </View>

              <View style={[styles.heroRightSide, { transform: [{ scale: 1.45 }], right: 5, top: 5 }]}>
                {cfg.lottie ? (
                  <LottieView source={cfg.lottie} autoPlay loop style={styles.heroLottie} />
                ) : (
                  <View style={styles.heroIconBox}>
                    <cfg.icon color="#FFFFFF" size={32} />
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>

          {/* Map Section (directly below, no gap) */}
          {showMap && (
            <View style={styles.mapSection}>
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
          )}
        </Animated.View>

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

        {/* OP DETAILS ENHANCEMENT BEGINS HERE */}
        
        {/* ── 1. Restaurant & Items Layout ── */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={[styles.card, { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }]}>
           
           {/* Restaurant Header Block */}
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                 <Image source={restaurant?.logo ? { uri: restaurant.logo } : require('../../assets/images/icon.png')} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#F3F4F6' }} />
                 <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: TEXT_COLOR }}>{restaurant?.name || 'Restaurant'}</Text>
                    <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED }} numberOfLines={1}>{restaurant?.address || 'Local Kitchen'}</Text>
                 </View>
              </View>
              <TouchableOpacity style={styles.opCallBtn} onPress={() => { restaurant?.mobile && Linking.openURL(`tel:${restaurant.mobile.replace(/[^0-9+]/g, '')}`) }}>
                  <Phone size={16} color="#DC2626" strokeWidth={2} />
              </TouchableOpacity>
           </View>

           <View style={[styles.divider, { marginVertical: 0 }]} />

           {/* Items Section */}
           <View style={{ padding: 16, backgroundColor: '#FFFFFF' }}>
              {/* Order ID */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                 <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#4B5563' }}>Order ID: #{order.customId || order.orderId || order._id}</Text>
                 <TouchableOpacity><Copy size={12} color="#6B7280" /></TouchableOpacity>
              </View>

              {/* Enhanced Items List */}
              <View style={{ gap: 12 }}>
                {(order.items || []).map((item: any, idx: number) => {
                   const rawName = item.name || item.product?.name || item.menuItem?.name || "Item";
                   // Highly dynamic veg/non-veg detection
                   const isNonVeg = item.type === 'Non-Veg' || 
                                    item.type?.toLowerCase().includes('non-veg') ||
                                    item.isVeg === false || 
                                    item.product?.isVeg === false || 
                                    item.menuItem?.isVeg === false ||
                                    /chicken|mutton|beef|pork|fish|egg|prawn/i.test(rawName);

                   return (
                   <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                        {isNonVeg ? (
                          <View style={[styles.typeIcon, { borderColor: '#DC2626', marginTop: 4, width: 12, height: 12, borderRadius: 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }]}>
                             <View style={{ width: 6, height: 6, backgroundColor: '#DC2626', borderRadius: 3 }} />
                          </View>
                        ) : (
                          <View style={[styles.typeIcon, { borderColor: '#16A34A', marginTop: 4, width: 12, height: 12, borderRadius: 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }]}>
                             <View style={{ width: 6, height: 6, backgroundColor: '#16A34A', borderRadius: 3 }} />
                          </View>
                        )}
                        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_COLOR, flex: 1, lineHeight: 20 }}>
                          {item.quantity} x {rawName}
                        </Text>
                      </View>
                      <Text style={{ fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_COLOR }}>₹{Number((item.price || 0) * item.quantity).toFixed(2)}</Text>
                   </View>
                   );
                })}
              </View>
           </View>
        </Animated.View>

        {/* ── 2. Premium Bill Summary Card ── */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.card, { paddingBottom: order.discountApplied > 0 ? 0 : 16, overflow: 'hidden' }]}>
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <View style={{ backgroundColor: '#F3F4F6', padding: 8, borderRadius: 12 }}>
                 <Receipt size={18} color="#4B5563" />
              </View>
              <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: TEXT_COLOR }}>Bill Summary</Text>
           </View>

           <View style={{ gap: 12 }}>
              <View style={styles.billRow}>
                 <Text style={styles.opBillKey}>Item total</Text>
                 <Text style={styles.opBillVal}>₹{Number(order.totalAmount || 0).toFixed(2)}</Text>
              </View>
              
              {(order.taxAmount > 0 || order.cgstTotal > 0 || order.sgstTotal > 0) && (
                <View style={styles.billRow}>
                   <Text style={styles.opBillKey}>GST (govt. taxes)</Text>
                   <Text style={styles.opBillVal}>₹{Number(order.taxAmount || ((order.cgstTotal||0) + (order.sgstTotal||0))).toFixed(2)}</Text>
                </View>
              )}

              {/* Delivery charges */}
              <View style={styles.billRow}>
                 <Text style={styles.opBillKey}>Delivery charges</Text>
                 {Number(order.deliveryFee) > 0 ? (
                    <Text style={styles.opBillVal}>₹{Number(order.deliveryFee).toFixed(2)}</Text>
                 ) : (
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                       <Text style={[styles.opBillVal, { textDecorationLine: 'line-through', color: MUTED }]}>₹29.00</Text>
                       <Text style={[styles.opBillVal, { color: '#2563EB' }]}>FREE</Text>
                    </View>
                 )}
              </View>
           </View>

           <View style={[styles.divider, { borderStyle: 'dashed', borderWidth: 1, borderColor: BORDER, height: 1, backgroundColor: 'transparent', marginVertical: 16 }]} />

           <View style={{ gap: 12, marginBottom: order.discountApplied > 0 ? 20 : 0 }}>
              <View style={styles.billRow}>
                 <Text style={{ fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_COLOR }}>Grand total</Text>
                 <Text style={{ fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_COLOR }}>₹{(Number(order.totalAmount || 0) + Number(order.taxAmount || ((order.cgstTotal||0) + (order.sgstTotal||0))) + Number(order.deliveryFee || 0)).toFixed(2)}</Text>
              </View>

              {order.discountApplied > 0 && (
                <View style={styles.billRow}>
                   <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#2563EB' }}>Coupon applied{order.couponCode ? ` - ${order.couponCode}` : ''}</Text>
                   <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#2563EB' }}>-₹{Number(order.discountApplied).toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.billRow}>
                 <Text style={{ fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_COLOR }}>Paid</Text>
                 <Text style={{ fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_COLOR }}>₹{Number(order.finalAmount || order.totalAmount || 0).toFixed(2)}</Text>
              </View>
           </View>

           {order.discountApplied > 0 && (
              <View style={{ backgroundColor: '#DBEAFE', marginHorizontal: -16, paddingVertical: 16, alignItems: 'center', position: 'relative', marginTop: 12 }}>
                 {/* Wavy Cutout Top Edge */}
                 <View style={{ width: width, flexDirection: 'row', position: 'absolute', top: -6, left: 0, zIndex: 10 }}>
                    {Array.from({ length: 50 }).map((_, i) => (
                       <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', marginLeft: -3 }} />
                    ))}
                 </View>
                 <Text style={{ fontFamily: 'Inter-Bold', fontSize: 13, color: '#1E3A8A', marginTop: 2 }}>🥳 You saved ₹{Number(order.discountApplied).toFixed(2)} on this order!</Text>
              </View>
           )}
        </Animated.View>

        {/* ── 3. Customer Info Mega-Card ── */}
        <Animated.View entering={FadeInDown.delay(350).springify()} style={[styles.card, { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }]}>
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {order.user?.profileImage || authUser?.profileImage || order.user?.image || authUser?.image ? (
                 <Image source={{ uri: order.user?.profileImage || authUser?.profileImage || order.user?.image || authUser?.image }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#E5E7EB' }} />
              ) : (
                 <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}>
                    <User size={20} color="#4B5563" />
                 </View>
              )}
              <View style={{ flex: 1 }}>
                 <Text style={{ fontFamily: 'Inter-Bold', fontSize: 15, color: TEXT_COLOR }}>{order.user?.name || authUser?.name || "Customer"}</Text>
                 <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED }}>{order.user?.phone || authUser?.mobile ? String(order.user?.phone || authUser?.mobile).replace(/.(?=.{4})/g, 'x') : "Phone hidden"}</Text>
              </View>
           </View>

           <View style={[styles.divider, { marginVertical: 8 }]} />
           <View style={styles.opInfoRow}>
              <View style={styles.opInfoIconBox}><CreditCard size={18} color="#6B7280" strokeWidth={2.5} /></View>
              <View style={{ flex: 1 }}>
                 <Text style={styles.opInfoTitle}>Payment method</Text>
                 <Text style={styles.opInfoSub}>Paid via: {order.paymentMethod || "Online"}</Text>
              </View>
           </View>

           <View style={[styles.divider, { marginVertical: 8 }]} />
           <View style={styles.opInfoRow}>
              <View style={styles.opInfoIconBox}><Calendar size={18} color="#6B7280" strokeWidth={2.5} /></View>
              <View style={{ flex: 1 }}>
                 <Text style={styles.opInfoTitle}>Payment date</Text>
                 <Text style={styles.opInfoSub}>{date}</Text>
              </View>
           </View>

           {deliveryText && (
              <>
                 <View style={[styles.divider, { marginVertical: 8 }]} />
                 <View style={styles.opInfoRow}>
                    <View style={styles.opInfoIconBox}><MapPin size={18} color="#6B7280" strokeWidth={2.5} /></View>
                    <View style={{ flex: 1 }}>
                       <Text style={styles.opInfoTitle}>Delivery address</Text>
                       <Text style={[styles.opInfoSub, { lineHeight: 18, marginTop: 2 }]} numberOfLines={3}>{deliveryText}</Text>
                    </View>
                 </View>
              </>
           )}
        </Animated.View>

        {/* ── FSSAI Badge ── */}
        {restaurant?.fssaiLicense && (
           <Animated.View entering={FadeInDown.delay(400).springify()} style={{ marginTop: 24, alignSelf: 'stretch', marginBottom: 24, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Image 
                   source={require('../../assets/logo/fssai-logo-fssai-icon-free-free-vector-removebg-preview.png')}
                   style={{ width: 60, height: 26, opacity: 0.6 }}
                   contentFit="contain"
                />
                <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: '#9CA3AF' }}>License No. {restaurant.fssaiLicense}</Text>
              </View>
           </Animated.View>
        )}

        {canCancel && cancelRemaining !== '' && (
          <Animated.View entering={FadeInDown.delay(350).springify()} style={{ paddingBottom: 40 }}>
            <TouchableOpacity 
              style={styles.cancelOuterBtn}
              onPress={() => setShowCancelModal(true)}
            >
              <XCircle size={18} color="#DC2626" />
              <Text style={styles.cancelOuterText}>Cancel Order</Text>
              <View style={styles.cancelTimerBadge}>
                <Clock size={12} color="#DC2626" />
                <Text style={styles.cancelTimerText}>{cancelRemaining}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>


      {/* Cancel Modal */}
      {showCancelModal && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.modalOverlay}>
          <Animated.View entering={SlideInDown.duration(300).springify()} style={styles.modalContent}>
             <Text style={styles.modalTitle}>Cancel Order?</Text>
             <Text style={styles.modalSub}>Please tell us why you want to cancel this order. This helps us improve our service.</Text>
             
             <TextInput
               style={styles.cancelReasonInput}
               placeholder="Reason for cancellation..."
               placeholderTextColor="#9CA3AF"
               value={cancelReason}
               onChangeText={setCancelReason}
               multiline
               numberOfLines={4}
               textAlignVertical="top"
               autoFocus
             />
             
             <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalBtnKeep} onPress={() => { setShowCancelModal(false); setCancelReason(''); }}>
                   <Text style={styles.modalBtnKeepText}>Keep Order</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtnCancel, !cancelReason.trim() && { opacity: 0.5 }]} 
                  onPress={handleCancelClick}
                  disabled={cancelling || !cancelReason.trim()}
                >
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
  floatingBack: {
    position: 'absolute', top: 16, left: 16, zIndex: 50,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  
  scrollContent: { paddingBottom: 60 },
  
  skeleton: { backgroundColor: '#F0F0F5', borderRadius: 16, marginBottom: 16 },

  // ── Seamless Hero + Map ──
  heroMapWrap: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  heroSection: { paddingTop: Platform.OS === 'ios' ? 70 : 52, paddingBottom: 20, paddingHorizontal: 24, position: 'relative' },
  heroGlowOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF', opacity: 0.08, alignSelf: 'flex-end', width: '150%', height: '150%', borderRadius: 300, top: -100, right: -100 },
  heroContentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  heroEmoji: { fontSize: 28 },
  heroTitle: { fontFamily: 'Inter-Black', fontSize: 22, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 },
  heroDesc: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#FFFFFF', opacity: 0.9, marginBottom: 8 },
  prepTimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  prepTimeText: { fontFamily: 'Inter-Bold', fontSize: 12, color: '#FFFFFF' },
  heroMeta: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#FFFFFF', opacity: 0.7, letterSpacing: 0.5, marginTop: 2 },
  
  heroRightSide: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  heroIconBox: { width: 60, height: 60, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-10deg' }] },
  heroLottie: { width: 130, height: 130, position: 'absolute', right: -15, top: -15 },

  // ── Map (inside heroMapWrap, no gap) ──
  mapSection: { height: 300, backgroundColor: '#F0F0F5', position: 'relative' },
  liveOverlayBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  liveBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#15803D' },
  mapText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: MUTED, marginTop: 16 },

  // ── Cards below map (unchanged) ──
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  liveBadgeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  mapPlaceholder: { height: 280, backgroundColor: '#F0F0F5', borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },

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
  cancelTimerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  cancelTimerText: { fontFamily: 'Inter-Bold', fontSize: 12, color: '#DC2626', fontVariant: ['tabular-nums'] },

  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 24, padding: 24, elevation: 10 },
  modalTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_COLOR, marginBottom: 8 },
  modalSub: { fontFamily: 'Inter-Medium', fontSize: 14, color: MUTED, marginBottom: 16, lineHeight: 20 },
  cancelReasonInput: {
    fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_COLOR,
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 14,
    padding: 14, minHeight: 100, marginBottom: 24,
  },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtnKeep: { paddingHorizontal: 16, paddingVertical: 10 },
  modalBtnKeepText: { fontFamily: 'Inter-Bold', fontSize: 14, color: MUTED },
  modalBtnCancel: { backgroundColor: '#DC2626', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  modalBtnCancelText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#FFFFFF' },

  centerWrap: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_COLOR, marginTop: 16, marginBottom: 16 },
  btnSolid: { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnSolidText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#FFFFFF' },

  // OP New Styles Additions
  typeIcon: { width: 12, height: 12, borderRadius: 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  typeTriangle: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 3.5, borderRightWidth: 3.5, borderBottomWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  opCallBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  opBillKey: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#4B5563' },
  opBillVal: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: TEXT_COLOR },
  opInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  opInfoIconBox: { width: 32, alignItems: 'center' },
  opInfoTitle: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_COLOR },
  opInfoSub: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#6B7280', marginTop: 2 },
});

export default OrderTrackingScreen;

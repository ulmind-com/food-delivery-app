import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, MapPin, ChevronDown, MessageCircle, SlidersHorizontal, CheckCircle, Tag, Clock, Copy, Percent, Zap, Gift, Heart, User, Mic, Mic2, Cloud } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  FadeInDown,
  FadeInRight,
  FadeIn,
  FadeOut,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import LottieView from 'lottie-react-native';
import { menuApi, restaurantApi, couponApi, userApi } from '../../services/api';
import { ProductCard } from '../../components/ProductCard';
import { FloatingCartBar } from '../../components/FloatingCartBar';
import { useAuthStore } from '../../store/useAuthStore';
import { useCartStore } from '../../store/useCartStore';
import { useLocationStore } from '../../store/useLocationStore';
import { resolveImageURL } from '../../lib/image-utils';
import { TabScrollContext } from './_layout';
import { useWeather } from '../../hooks/useWeather';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const PRIMARY_LIGHT = '#FFF7ED';
const CARD_WIDTH = width - 32;

// ─── Static Promo Fallbacks (shown when no hero videos) ──
const PROMOS = [
  { id: '1', title: '50% OFF', sub: 'on your first order!', bg: '#FC8019', emoji: '🎉' },
  { id: '2', title: 'FREE Delivery', sub: 'on orders above ₹199', bg: '#16a34a', emoji: '🛵' },
  { id: '3', title: 'Try New', sub: 'Biriyani Collection', bg: '#7C3AED', emoji: '🍛' },
];

function ShimmerBlock({ w, h, r = 8, style }: { w: number | string; h: number; r?: number; style?: any }) {
  const shimmer = useSharedValue(0.3);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ), -1, false
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  return (
    <Animated.View style={[{
      width: w as any, height: h, borderRadius: r,
      backgroundColor: '#F0F0F5',
    }, animStyle, style]} />
  );
}

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

const LOADING_TEXTS = [
  "Firing up the pans... 🔥",
  "Gathering the freshest ingredients... 🥬",
  "Adding a secret pinch of love... ✨",
  "Good food takes time, but we're hurrying! 🏃‍♂️",
  "Finding our quickest delivery hero... 🦸‍♂️",
  "Seasoning your meal to perfection... 🧂",
  "Assembling your dream plate... 🍽️",
  "Cooking up something truly delicious... 🍳"
];

function HomeSkeletonLoader() {
  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0]);

  useEffect(() => {
    setLoadingText(LOADING_TEXTS[Math.floor(Math.random() * LOADING_TEXTS.length)]);
    
    // Cycle texts every 2.5 seconds to keep user engaged
    const interval = setInterval(() => {
        setLoadingText(LOADING_TEXTS[Math.floor(Math.random() * LOADING_TEXTS.length)]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const { height: screenHeight } = Dimensions.get('window');

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: screenHeight * 0.7 }}>
      <View style={{ width: 90, height: 90, marginBottom: 8 }}>
        <LottieView
          source={require('../../assets/lottie/Pizza.json')}
          autoPlay
          loop
          style={{ width: '100%', height: '100%' }}
        />
      </View>
      <Animated.Text 
        key={loadingText} 
        entering={FadeIn.duration(400)} 
        style={{ 
          fontFamily: 'Inter-Medium', 
          fontSize: 15, 
          color: '#6B7280', 
          textAlign: 'center',
          paddingHorizontal: 40 
        }}
      >
        {loadingText}
      </Animated.Text>
    </View>
  );
}

// ─── Hero Banner Section (Dynamic: Video or Promo) ────
const TICKET_COLORS = ['#F59E0B', '#EAB308', '#14B8A6', '#EC4899', '#8B5CF6'];

function HeroBannerSection() {
  const scrollRef = useRef<FlatList>(null);
  const heroScrollRef = useRef<FlatList>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [carouselItems, setCarouselItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);

  // Fetch admin-configured hero videos and coupons
  useEffect(() => {
    (async () => {
      try {
        const [vidRes, coupRes] = await Promise.all([
          restaurantApi.getVideos().catch(() => ({ data: { videos: [] } })),
          couponApi.getAll().catch(() => ({ data: { coupons: [] } }))
        ]);
        
        const vids = vidRes.data?.videos || [];
        
        let cData = coupRes.data?.coupons || coupRes.data || [];
        if (!Array.isArray(cData)) cData = [];
        let activeCoupons = cData.filter((c: any) => c.isActive !== false);

        setCarouselItems([
          ...vids.map((v: string) => ({ type: 'video', url: v })),
          ...activeCoupons.map((c: any) => ({ type: 'coupon', data: c }))
        ]);
      } catch (e) {
        console.log('Error fetching hero content', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasItems = carouselItems.length > 0;

  // Auto-scroll promos (only when showing fallback promos)
  useEffect(() => {
    if (hasItems || loading) return;
    const timer = setInterval(() => {
      setActiveIdx(prev => {
        const next = (prev + 1) % PROMOS.length;
        scrollRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [hasItems, loading]);

  // Auto-cycle through items (ONLY for Coupons or Mobile Image fallback)
  useEffect(() => {
    if (!hasItems || carouselItems.length <= 1) return;

    const currentItem = carouselItems[activeIdx];
    // Let the video component handle its own completion (both web and mobile)
    if (currentItem.type === 'video') return;

    // Otherwise, auto-swap after 5 seconds
    const timer = setInterval(() => {
      setActiveIdx(prev => {
        const next = (prev + 1) % carouselItems.length;
        heroScrollRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [hasItems, carouselItems, activeIdx]);

  if (loading) {
    return (
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <ShimmerBlock w="100%" h={200} r={20} />
      </View>
    );
  }

  // ── Unified Hero Mode (Videos + Coupons) ──
  if (hasItems) {
    return (
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroVideoContainer}>
        <FlatList
          ref={heroScrollRef}
          data={carouselItems}
          horizontal
          snapToInterval={CARD_WIDTH}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH));
          }}
          keyExtractor={(item, idx) => `hero-${idx}`}
          getItemLayout={(_, index) => ({ length: CARD_WIDTH, offset: CARD_WIDTH * index, index })}
          renderItem={({ item, index }) => (
            <View style={[styles.heroVideoCard, { width: CARD_WIDTH, marginRight: 0 }]}>
              {item.type === 'video' ? (
                <>
                  {/* Loading spinner — visible behind video while buffering */}
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 0 }}>
                    <ActivityIndicator size="small" color={PRIMARY} />
                  </View>
                  {Platform.OS === 'web' ? (
                    <video
                      key={`vid-${index}-${item.url}`}
                      ref={(ref) => {
                        if (ref) {
                          if (activeIdx === index) {
                            ref.play().catch(() => {});
                          } else {
                            ref.pause();
                            ref.currentTime = 0;
                          }
                        }
                      }}
                      src={item.url}
                      autoPlay={activeIdx === index}
                      muted
                      playsInline
                      loop={carouselItems.length === 1}
                      onEnded={() => {
                        if (carouselItems.length > 1 && activeIdx === index) {
                          const nextIdx = (index + 1) % carouselItems.length;
                          heroScrollRef.current?.scrollToIndex({ index: nextIdx, animated: true });
                          setActiveIdx(nextIdx);
                        }
                      }}
                      style={{
                        position: 'absolute', top: 0, left: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover', borderRadius: 20, zIndex: 0,
                      } as any}
                    />
                  ) : (
                    <Video
                      source={{ uri: item.url }}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 20 }}
                      resizeMode={"cover" as any}
                      shouldPlay={activeIdx === index}
                      positionMillis={activeIdx === index ? undefined : 0}
                      isLooping={carouselItems.length === 1}
                      isMuted={true}
                      onPlaybackStatusUpdate={(status: any) => {
                        if (status.didJustFinish && !status.isLooping && carouselItems.length > 1 && activeIdx === index) {
                          const nextIdx = (index + 1) % carouselItems.length;
                          heroScrollRef.current?.scrollToIndex({ index: nextIdx, animated: true });
                          setActiveIdx(nextIdx);
                        }
                      }}
                    />
                  )}


                </>
              ) : (
                /* ── ULTRA Premium TICKET Coupon UI ── */
                <View style={[styles.heroCouponCard, { backgroundColor: TICKET_COLORS[index % TICKET_COLORS.length] }]}>
                  {/* Main Top Section */}
                  <View style={styles.ticketTop}>
                    <View style={styles.ticketLeft}>
                      <View style={styles.couponBadgeWrap}>
                        <Tag size={12} color={TICKET_COLORS[index % TICKET_COLORS.length]} fill="#FFF" />
                        <Text style={[styles.couponBadgeText, { color: TICKET_COLORS[index % TICKET_COLORS.length] }]}>
                          {item.data.name || 'EXCLUSIVE OFFER'}
                        </Text>
                      </View>

                      <Text style={styles.ticketDiscount}>
                        {item.data.discountType === 'PERCENTAGE'
                          ? `${item.data.discountPercent || item.data.discountAmount}% off`
                          : `₹${item.data.discountAmount} off`}
                      </Text>
                      <Text style={styles.ticketDesc} numberOfLines={2}>
                        {item.data.description || (item.data.minOrderValue ? `on orders above ₹${item.data.minOrderValue}` : 'valid on all orders')}
                      </Text>

                      <View style={styles.ticketCodeRow}>
                        <Text style={styles.ticketCode}>{item.data.code}</Text>
                        <Pressable
                          style={styles.ticketCopyBtn}
                          onPress={async () => {
                            if (Platform.OS === 'web') await navigator.clipboard.writeText(item.data.code);
                            setCopiedCouponId(item.data._id);
                            setTimeout(() => setCopiedCouponId(null), 2000);
                          }}
                        >
                          {copiedCouponId === item.data._id ? <CheckCircle size={14} color="#FFF" /> : <Copy size={14} color="#FFF" />}
                        </Pressable>
                      </View>
                    </View>

                    {/* Mascot Image / Lottie Animation */}
                    <View style={styles.ticketRight}>
                      <LottieView
                        source={require('../../assets/lottie/happy-woman-eating.json')}
                        autoPlay
                        loop
                        style={styles.ticketMascot}
                      />
                    </View>
                  </View>

                  {/* Bottom Valid Strip */}
                  <View style={styles.ticketBottom}>
                    <Text style={styles.ticketValidText}>
                      {item.data.validUntil
                        ? `VALID UNTIL ${new Date(item.data.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, ':')} IN ORDERS FROM ₹${item.data.minOrderValue || 0}`
                        : `VALID ANYTIME IN ORDERS FROM ₹${item.data.minOrderValue || 0}`}
                    </Text>
                  </View>

                  {/* Punch Hole Notches */}
                  <View style={styles.ticketNotchLeft} />
                  <View style={styles.ticketNotchRight} />
                </View>
              )}
            </View>
          )}
        />

        {/* Unified Dots Indicator */}
        {carouselItems.length > 1 && (
          <View style={styles.heroDotsRow}>
            {carouselItems.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  heroScrollRef.current?.scrollToIndex({ index: i, animated: true });
                  setActiveIdx(i);
                }}
                style={{ padding: 4 }}
              >
                <View style={[styles.heroDot, i === activeIdx && styles.heroDotActive]} />
              </Pressable>
            ))}
          </View>
        )}
      </Animated.View>
    );
  }

  // ── Fallback: Static Promo Banners ──
  return (
    <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.promoContainer}>
      <FlatList
        ref={scrollRef}
        data={PROMOS}
        horizontal
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH));
        }}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={[styles.promoBanner, { backgroundColor: item.bg, width: CARD_WIDTH }]}>
            <View style={styles.promoTextArea}>
              <Text style={styles.promoTitle}>{item.title}</Text>
              <Text style={styles.promoSub}>{item.sub}</Text>
              <View style={styles.promoBtn}>
                <Text style={styles.promoBtnText}>ORDER NOW</Text>
              </View>
            </View>
            <Text style={styles.promoEmoji}>{item.emoji}</Text>
            <View style={[styles.promoCircle, { top: -20, right: -20 }]} />
            <View style={[styles.promoCircle, { bottom: -15, left: 60, width: 50, height: 50, borderRadius: 25 }]} />
          </View>
        )}
      />
      <View style={styles.dotsRow}>
        {PROMOS.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIdx && styles.dotActive]} />
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Category Item ─────────────────────────────────────
function CategoryItem({ item, isSelected, onSelect, index }: any) {
  const imageUrl = item.name === 'All' ? null : resolveImageURL(item.image || item.imageURL);
  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(400)}>
      <Pressable
        onPress={() => onSelect(item._id)}
        style={[styles.catItem, isSelected && styles.catItemSelected]}
      >
        <View style={[
          styles.catImageWrap, 
          item.name === 'All' && { borderColor: '#FC8019', backgroundColor: '#FFF7ED', borderWidth: 2.5 },
          isSelected && styles.catImageWrapSelected
        ]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.catImage} contentFit="cover" />
          ) : (
            <View style={[styles.catImagePlaceholder, item.name === 'All' && { backgroundColor: 'transparent' }]}>
              <Text style={{ fontSize: 28 }}>🍽️</Text>
            </View>
          )}
        </View>
        <Text style={[styles.catName, isSelected && styles.catNameSelected]} numberOfLines={1}>
          {item.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ═════════════════════════════════════════════════════════
//  MAIN HOME SCREEN
// ═════════════════════════════════════════════════════════
export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userName = user?.name;
  const userImage = user?.profileImage;
  const cartItems = useCartStore((s) => s.items);
  const { selectedAddress } = useLocationStore();

  const isTabBarHidden = useContext(TabScrollContext);
  const lastScrollY = useSharedValue(0);

  // ─── Raindrop Re-render Memoization ───
  const rainDropsConfig = React.useMemo(() => {
    return Array.from({ length: 35 }).map(() => ({
      left: Math.random() * 100,
      delay: Math.random() * 1500,
      duration: 600 + Math.random() * 500,
      h: 12 + Math.random() * 14
    }));
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (!isTabBarHidden) return;
      const currentY = event.contentOffset.y;
      
      if (currentY <= 0) {
        if (isTabBarHidden.value !== 0) isTabBarHidden.value = 0;
      } else {
        const delta = currentY - lastScrollY.value;
        if (delta > 5 && currentY > 60) {
          if (isTabBarHidden.value !== 1) isTabBarHidden.value = 1;
        } else if (delta < -10) { 
          if (isTabBarHidden.value !== 0) isTabBarHidden.value = 0;
        }
      }
      lastScrollY.value = currentY;
    }
  });

  const locationLabel = selectedAddress
    ? selectedAddress.type === "HOME"
      ? "Home"
      : selectedAddress.type === "WORK"
        ? "Work"
        : selectedAddress.addressLine1?.split(",")[0]?.trim() || "My Location"
    : userName ? `Hi, ${userName.split(' ')[0]}!` : 'Deliver to';

  const userLat: number | undefined = selectedAddress?.lat || selectedAddress?.coordinates?.lat || selectedAddress?.coordinates?.[1] || selectedAddress?.latitude;
  const userLng: number | undefined = selectedAddress?.lng || selectedAddress?.coordinates?.lng || selectedAddress?.coordinates?.[0] || selectedAddress?.longitude;
  const { isRaining: dynamicIsRaining } = useWeather(userLat, userLng);
  const isRaining = dynamicIsRaining; console.log('DEBUG WEATHER:', userLat, userLng, isRaining);

  const locationSub = selectedAddress
    ? [selectedAddress.city, selectedAddress.state].filter(Boolean).join(", ")
    : "Tap to set delivery location";

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fssaiLicense, setFssaiLicense] = useState<string | null>(null);
  const [freshImage, setFreshImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechPartial, setSpeechPartial] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [showVegSplash, setShowVegSplash] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Search placeholder animation
  const placeholders = ['Pizza', 'Biryani', 'Burger', 'Ice Cream', 'Rolls', 'Chowmin'];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const fetchHomeData = async () => {
    try {
      const [catRes, prodRes, restRes, profileRes] = await Promise.all([
        menuApi.getCategories(),
        menuApi.getMenu(),
        restaurantApi.get().catch(() => null),
        userApi.getProfile().catch(() => null),
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
      if (restRes?.data?.fssaiLicense) {
        setFssaiLicense(restRes.data.fssaiLicense);
      }
      const profileData = profileRes?.data?.user || profileRes?.data;
      if (profileData?.profileImage) {
        setFreshImage(profileData.profileImage);
      }
    } catch (error) {
      console.log('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHomeData();
    }, [])
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeData();
  }, []);

  // Native Speech Event Listeners
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setSpeechError('');
    setSpeechPartial('Listening...');
  });
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('error', (event) => {
    setSpeechError('Sorry, could not understand. Try again.');
    setTimeout(() => setIsListening(false), 2000);
  });
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript || '';
    setSpeechPartial(transcript);
    
    // If it's the final result, trigger search automatically
    if (event.isFinal) {
      let finalSpeech = transcript;
      if (finalSpeech.endsWith('.')) finalSpeech = finalSpeech.slice(0, -1);
      setSearchQuery(finalSpeech);
      setTimeout(() => setIsListening(false), 1000);
    }
  });

  const handleVoiceSearch = async () => {
    if (Platform.OS === 'web') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsListening(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = event.results[0][0].transcript;
          if (transcript.endsWith('.')) transcript = transcript.slice(0, -1);
          setSearchQuery(transcript);
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        try { recognition.start(); } catch (e) { setIsListening(false); }
      } else {
        alert('Real-time Voice Search requires Chrome or Edge on Web. Try entering manually!');
      }
    } else {
      // Mobile: Trigger Zomato-tier Native Voice Overlay!
      setSpeechPartial('Listening...');
      setSpeechError('');
      setIsListening(true);
      
      const permItem = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permItem.granted) {
        setSpeechError('Tap allow so we can hear your cravings!');
        setTimeout(() => setIsListening(false), 3000);
        return;
      }
      
      try {
        ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          maxAlternatives: 1
        });
      } catch (err) {
        setSpeechError('Hardware error starting microphone.');
        setTimeout(() => setIsListening(false), 2000);
      }
    }
  };

  const stopVoiceSearch = () => {
    if (Platform.OS !== 'web') {
      ExpoSpeechRecognitionModule.stop();
    }
    setIsListening(false);
  };

  const handleVegToggle = () => {
    const nextState = !isVegOnly;
    setIsVegOnly(nextState);
    setShowVegSplash(true);
    setTimeout(() => {
      setShowVegSplash(false);
    }, 1300);
  };

  const getFilteredProducts = () => {
    let result = products;
    if (searchQuery.trim()) {
      const exactQ = searchQuery.trim().toLowerCase();
      const queryWords = exactQ.split(/\s+/).filter(w => w.length > 2 || w === 'egg' || w === 'non');
      
      result = result.filter((p: any) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const catName = (typeof p.category === 'object' ? p.category?.name || '' : '').toLowerCase();
        
        // Full exact match
        if (name.includes(exactQ) || desc.includes(exactQ) || catName.includes(exactQ)) return true;
        
        // Partial word match (e.g. "mutton biryani" matches "Mutton Dum Biryani")
        if (queryWords.length > 1) {
          return queryWords.some(w => name.includes(w) || catName.includes(w) || desc.includes(w));
        }
        
        return false;
      });
    }
    if (selectedCategory) {
      result = result.filter((p: any) =>
        (typeof p.category === 'object' ? p.category._id : p.category) === selectedCategory
      );
    }
    if (isVegOnly) {
      result = result.filter((p: any) => p.type === 'Veg');
    }
    return result;
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id === selectedCategory ? '' : id);
  };  const filteredProducts = getFilteredProducts();

  return (
    <View style={styles.container}>
      {/* ─── WEATHER THEME WRAPPER (Spans Header & Search) ─── */}
      <Animated.View entering={FadeIn.duration(400)} style={isRaining && { paddingBottom: 0 }}>
        {/* ═══ NEW: rainImage.png Background + Animated Raindrops ═══ */}
        {isRaining && (
          <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]} pointerEvents="none">
            {/* Background Image */}
            <Image
              source={require('../../assets/images/rainImage.png')}
              style={[StyleSheet.absoluteFillObject, { opacity: 0.95 }]}
              contentFit="cover"
            />
            {/* Animated Raindrops Layer */}
            {rainDropsConfig.map((rd, i) => (
              <RainDrop key={`rd-${i}`} leftPct={rd.left} delay={rd.delay} duration={rd.duration} height={rd.h} />
            ))}
          </View>
        )}

        {/* Seamless Bottom Gradient for Weather Theme */}
        {isRaining && (
          <LinearGradient
            colors={['transparent', '#FFFCF7']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 45, zIndex: 1 }}
            pointerEvents="none"
          />
        )}

        {/* ─── HEADER CONTENT ─── */}
        <View style={[styles.header, isRaining && { backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: 'transparent' }]}>
        
        <TouchableOpacity style={styles.headerLeft} activeOpacity={0.7} onPress={() => router.push('/location-picker')}>
          <View style={[styles.locationRow, { zIndex: 5 }]}>
            <Image 
               source={require('../../assets/icons/locationICON.png')} 
               style={{ width: 22, height: 22, tintColor: isRaining ? "#FFFFFF" : PRIMARY }} 
               contentFit="contain" 
            />
            <Text style={[styles.headerLocationTitle, isRaining && { color: '#FFFFFF', fontSize: 19 }]}>
              {locationLabel}
            </Text>
            <ChevronDown size={18} color={isRaining ? "#FFFFFF" : "#3D4152"} />
          </View>
          <Text style={[styles.headerLocationSub, { zIndex: 5 }, isRaining && { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={1}>
            {locationSub}
          </Text>
        </TouchableOpacity>
        <View style={[styles.headerRight, { zIndex: 5 }]}>
          <TouchableOpacity style={[styles.headerIconBtn, isRaining && { backgroundColor: 'transparent' }]} onPress={() => router.push('/chat')}>
            <MessageCircle size={22} color={isRaining ? "rgba(255,255,255,0.9)" : "#3D4152"} />
            <View style={[styles.notifDot, isRaining && { borderColor: 'transparent', right: 5, top: 4 }]} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.avatarCircle, isRaining && { borderWidth: 0 }]} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.7}>
            {freshImage || userImage ? (
              <Image source={{ uri: resolveImageURL(freshImage || userImage) }} style={styles.headerAvatarImg} contentFit="cover" />
            ) : (
              <User size={18} color={PRIMARY} strokeWidth={2.2} />
            )}
          </TouchableOpacity>
        </View>
        </View>

        {/* ─── STICKY SEARCH BAR (Zomato Style) ─── */}
        <View style={[styles.stickySearchWrap, isRaining && { backgroundColor: 'transparent', borderBottomColor: 'transparent', zIndex: 5 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.searchBar, { flex: 1 }]}>
            <Search size={20} color="#9CA3AF" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder={`Search "${placeholders[placeholderIndex]}"`}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={Platform.OS === 'ios' ? true : false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); searchInputRef.current?.blur(); }} style={styles.searchClearBtn}>
                <Text style={styles.searchClearText}>✕</Text>
              </TouchableOpacity>
            )}
            {!searchQuery.length && (
              <>
                <View style={{ width: 1, height: 20, backgroundColor: '#EBEBEB', marginHorizontal: 4 }} />
                <TouchableOpacity onPress={handleVoiceSearch} style={{ padding: 4 }}>
                  <Mic size={20} color={PRIMARY} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Pure Veg Toggle */}
          <Pressable 
            style={[styles.vegToggleBtn, isVegOnly && styles.vegToggleBtnActive]}
            onPress={handleVegToggle}
          >
            <View style={[styles.vegToggleDot, isVegOnly && styles.vegToggleDotActive]} />
            <Text style={[styles.vegToggleText, isVegOnly && styles.vegToggleTextActive]}>Veg</Text>
          </Pressable>
        </View>
      </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />
        }
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        stickyHeaderIndices={[1]}
      >
        {loading ? <HomeSkeletonLoader /> : <HeroBannerSection />}

        {!loading ? (
          <View style={{ backgroundColor: '#FFFFFF', paddingTop: 16, paddingBottom: 8 }}>
            <Animated.View entering={FadeInDown.delay(250).duration(400)}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catRow}
              >
              {/* "All" category */}
              <CategoryItem
                item={{ _id: '', name: 'All', image: null }}
                isSelected={selectedCategory === ''}
                onSelect={() => setSelectedCategory('')}
                index={0}
              />
              {categories.map((cat, idx) => (
                <CategoryItem
                  key={cat._id}
                  item={cat}
                  isSelected={selectedCategory === cat._id}
                  onSelect={handleCategorySelect}
                  index={idx + 1}
                />
              ))}
            </ScrollView>
          </Animated.View>
        </View>
        ) : <View />}

        {!loading ? <View style={styles.divider} /> : null}

        {!loading ? (
          <View style={styles.productsSection}>
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                <Text style={styles.sectionTitle}>
                  {selectedCategory
                    ? categories.find((c: any) => c._id === selectedCategory)?.name || 'Menu'
                    : 'Recommended for you'}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {filteredProducts.length} items available
                </Text>
              </Animated.View>

              <View style={styles.productGrid}>
                {filteredProducts.map((item: any, idx: number) => (
                  <Animated.View key={item._id} entering={FadeInDown.delay(350 + idx * 60).duration(400)}>
                    <ProductCard
                      item={item}
                      onPress={() => router.push({ 
                        pathname: '/product/[id]', 
                        params: { id: item._id, itemData: encodeURIComponent(JSON.stringify(item)) } 
                      })}
                    />
                  </Animated.View>
                ))}

                {filteredProducts.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>🍽️</Text>
                    <Text style={styles.emptyTitle}>No items found</Text>
                    <Text style={styles.emptySub}>
                      Try a different category or remove the filter
                    </Text>
                  </View>
                )}
              </View>
            </View>
        ) : null}

        {/* ─── CREATOR FOOTER ─── */}
        {!loading ? (
          <View style={styles.footerSection}>
              <View style={styles.footerInner}>
                <Text style={styles.liveText}>Live</Text>
                <Text style={styles.itUpText}>it up!</Text>
                <View style={styles.craftedRow}>
                   <Text style={styles.craftedText}>Crafted with </Text>
                   <Heart size={16} fill="#EF4444" color="#EF4444" />
                   <Text style={styles.craftedText}> in Kolkata, India</Text>
                </View>

                {/* ─── FSSAI License ─── */}
                {fssaiLicense ? (
                  <View style={styles.fssaiContainer}>
                    <View style={styles.fssaiDivider} />
                    <View style={styles.fssaiBadge}>
                      <Image
                        source={require('../../assets/logo/fssai-logo-fssai-icon-free-free-vector-removebg-preview.png')}
                        style={styles.fssaiLogo}
                        contentFit="contain"
                      />
                      <Text style={styles.fssaiLicenseText}>License No. {fssaiLicense}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
        ) : null}
      </Animated.ScrollView>

      {/* Floating Cart Bar */}
      <FloatingCartBar />


      {/* ─── VOICE SEARCH OVERLAY ─── */}
      {isListening && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={styles.voiceOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={stopVoiceSearch} />
          <View style={styles.voiceModal}>
            <Animated.View 
               entering={ZoomIn.springify().damping(12).delay(100)} 
               style={[styles.voiceMicCircle, speechError ? { backgroundColor: '#DC2626', shadowColor: '#DC2626' } : {}]}
            >
              <Mic2 size={40} color="#FFFFFF" />
            </Animated.View>
            
            <Text style={[styles.voiceText, speechError ? { color: '#DC2626' } : {}]}>
              {speechError || speechPartial || 'Listening...'}
            </Text>
            
            {!speechError && (
              <Text style={styles.voiceSubtext}>
                {speechPartial.length > 0 ? "Keep speaking..." : "Try saying \"Biryani\" or \"Pizza\""}
              </Text>
            )}
            
            <TouchableOpacity onPress={stopVoiceSearch} style={styles.voiceCancelBtn}>
              <Text style={styles.voiceCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ─── OP VEG MODE SPLASH ─── */}
      <Modal visible={showVegSplash} transparent animationType="fade">
        <Animated.View 
          style={[styles.vegSplashContainer, { backgroundColor: isVegOnly ? '#16A34A' : '#8B1118' }]}
        >
          {/* FLOATING OP ICONS */}
          {Array.from({ length: 12 }).map((_, i) => (
            <Animated.Text
              key={`float-${i}`}
              entering={FadeInDown.delay(i * 60).springify().damping(12)}
              style={{
                position: 'absolute',
                fontSize: Math.random() * 20 + 34,
                opacity: 0.15,
                left: `${Math.random() * 90}%`,
                top: `${Math.random() * 80 + 10}%`,
                transform: [{ rotate: `${Math.random() * 360}deg` }]
              }}
            >
              {isVegOnly 
                ? (['🍃', '🌿', '🥗', '🥦', '🥑'][i % 5]) 
                : (['🍗', '🥩', '🍔', '🍕', '🍳'][i % 5])
              }
            </Animated.Text>
          ))}

          <Animated.View entering={FadeInDown.delay(100).springify().damping(14)} style={styles.vegSplashTextWrap}>
            <Text style={[styles.vegSplashTextTitle, { color: '#FFFFFF' }]}>{isVegOnly ? "VEG" : "REGULAR"}</Text>
            <Text style={[styles.vegSplashTextTitle, { color: '#FFFFFF' }]}>MODE</Text>
          </Animated.View>

          <Animated.View entering={ZoomIn.delay(300).springify().damping(14)} style={[styles.vegSplashHugeToggle, { backgroundColor: isVegOnly ? '#14532D' : '#450A0A' }]}>
            <Animated.View 
               style={[
                 styles.vegSplashHugeKnob, 
                 isVegOnly ? { alignSelf: 'flex-end', backgroundColor: '#FFFFFF' } : { alignSelf: 'flex-start', backgroundColor: '#D1D5DB' }
               ]} 
            />
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

// ═════════════════════════════════════════════════════════
//  STYLES
// ═════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFCF7' },
  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: { flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerLocationTitle: {
    fontFamily: 'Inter-Bold', fontSize: 17, color: '#3D4152',
  },
  headerLocationSub: {
    fontFamily: 'Inter-Medium', fontSize: 12, color: '#93959F', marginTop: 1, paddingLeft: 22,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F7F7F7', alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 1, right: 3, width: 8, height: 8,
    borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PRIMARY_LIGHT, borderWidth: 1.5, borderColor: '#FDDCB5',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: '100%', height: '100%',
  },
  scrollContent: { paddingBottom: 0 },
  // Search (Sticky)
  stickySearchWrap: {
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F3F4F6', borderRadius: 24,
    paddingHorizontal: 16, height: 48,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1, fontFamily: 'Inter-Medium', fontSize: 15, color: '#1A1A1A',
    height: '100%', paddingVertical: 0,
  },
  searchClearBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  searchClearText: { fontFamily: 'Inter-Bold', fontSize: 12, color: '#6B7280' },
  searchPlaceholder: { fontFamily: 'Inter-Medium', fontSize: 15, color: '#9CA3AF' },
  searchHighlight: { color: PRIMARY, fontFamily: 'Inter-Bold' },
  // Promo Banners
  promoContainer: { paddingLeft: 16, marginTop: 16, marginBottom: 8 },
  promoBanner: {
    height: 140, borderRadius: 16, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, marginRight: 16, position: 'relative',
  },
  promoTextArea: { flex: 1, zIndex: 2 },
  promoTitle: { fontFamily: 'Inter-Black', fontSize: 26, color: '#FFF' },
  promoSub: { fontFamily: 'Inter-Medium', fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  promoBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
    alignSelf: 'flex-start', marginTop: 10,
  },
  promoBtnText: { fontFamily: 'Inter-ExtraBold', fontSize: 11, color: '#3D4152', letterSpacing: 0.5 },
  promoEmoji: { fontSize: 64, position: 'absolute', right: 20, top: '50%', marginTop: -32 },
  promoCircle: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 6, marginTop: 10, paddingRight: 16,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D9D9D9' },
  dotActive: { width: 20, borderRadius: 3, backgroundColor: PRIMARY },
  // Filters
  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 16, gap: 8,
  },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#EBEBEB',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: { backgroundColor: '#3D4152', borderColor: '#3D4152' },
  filterPillText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#6B7280' },
  filterPillTextActive: { color: '#FFFFFF', fontFamily: 'Inter-Bold' },
  filterPillVeg: { borderColor: '#BBF7D0' },
  filterPillVegActive: { backgroundColor: '#F0FDF4', borderColor: '#16a34a' },
  vegDot: {
    width: 10, height: 10, borderRadius: 2,
    borderWidth: 1.5, borderColor: '#16a34a',
    alignItems: 'center', justifyContent: 'center',
  },
  filterIconBtn: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#EBEBEB',
    alignItems: 'center', justifyContent: 'center',
  },
  // Categories
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 20, marginBottom: 12, gap: 8,
  },
  sectionBullet: {
    width: 4, height: 18, borderRadius: 2, backgroundColor: PRIMARY,
  },
  sectionTitle: {
    fontFamily: 'Inter-ExtraBold', fontSize: 19, color: '#3D4152', letterSpacing: -0.3,
  },
  catRow: { paddingHorizontal: 12, gap: 4 },
  catItem: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
  catItemSelected: {},
  catImageWrap: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2, borderColor: '#F0F0F5',
    overflow: 'hidden', backgroundColor: '#FAFAFA',
    marginBottom: 6,
  },
  catImageWrapSelected: { borderColor: PRIMARY, borderWidth: 2.5 },
  catImage: { width: '100%', height: '100%' },
  catImagePlaceholder: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF3E0',
  },
  catName: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#6B7280', maxWidth: 72, textAlign: 'center' },
  catNameSelected: { color: PRIMARY, fontFamily: 'Inter-ExtraBold' },
  // Divider
  divider: {
    height: 8, backgroundColor: '#F5F5F5', marginTop: 16,
  },
  // Products
  productsSection: { paddingHorizontal: 16, paddingTop: 20 },
  sectionSubtitle: {
    fontFamily: 'Inter-Medium', fontSize: 13, color: '#93959F', marginTop: 2, marginBottom: 16,
  },
  productGrid: {},
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#3D4152' },
  emptySub: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#93959F', textAlign: 'center', marginTop: 6, lineHeight: 20 },

  // Footer Section
  footerSection: { 
    paddingHorizontal: 16,
    paddingVertical: 30, 
    paddingBottom: 90, // Acts as the scroll clearance to hide the white background gap
    backgroundColor: '#F3F4F6',
    marginTop: 20
  },
  footerInner: {
    alignItems: 'flex-start',
  },
  liveText: { 
    fontFamily: 'Inter-Black', 
    fontSize: 70, 
    color: '#9CA3AF', 
    letterSpacing: -2, 
    lineHeight: 70 
  },
  itUpText: { 
    fontFamily: 'Inter-Black', 
    fontSize: 70, 
    color: '#6B7280', 
    letterSpacing: -2, 
    lineHeight: 70, 
    marginTop: -5 
  },
  craftedRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 24 
  },
  craftedText: { 
    fontFamily: 'Inter-Bold', 
    fontSize: 16, 
    color: '#6B7280' 
  },

  // FSSAI License Badge
  fssaiContainer: { marginTop: 32, alignSelf: 'stretch' },
  fssaiDivider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 24 },
  fssaiBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 18, paddingHorizontal: 20,
    borderRadius: 12,
  },
  fssaiLogo: {
    width: 60, height: 30,
    opacity: 0.45,
    marginRight: 14,
  },
  fssaiLicenseText: {
    fontFamily: 'Inter-Medium', fontSize: 14,
    color: '#9CA3AF', letterSpacing: 0.3,
    lineHeight: 20,
  },

  // Hero Video Section
  heroVideoContainer: { paddingHorizontal: 16, marginTop: 16 },
  heroVideoCard: {
    width: '100%', height: 200, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#1A1A2E', position: 'relative',
  },
  heroVideoImage: { width: '100%', height: '100%' },
  heroDotsRow: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6, zIndex: 10,
  },
  heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  heroDotActive: { width: 22, borderRadius: 4, backgroundColor: '#FFFFFF' },
  heroCouponCard: { flex: 1, borderRadius: 16, overflow: 'hidden', flexDirection: 'column', position: 'relative' },
  ticketTop: { flex: 1, flexDirection: 'row' },
  ticketLeft: { flex: 1, padding: 20, justifyContent: 'center' },
  couponBadgeWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginBottom: 8, gap: 4,
  },
  couponBadgeText: { fontFamily: 'Inter-Black', fontSize: 10 },
  ticketDiscount: { fontFamily: 'Inter-Black', fontSize: 32, color: '#FFFFFF', marginBottom: 4, letterSpacing: -1 },
  ticketDesc: { fontFamily: 'Inter-Medium', fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: 12 },
  ticketCodeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'flex-start', borderRadius: 8, paddingLeft: 12, paddingRight: 4, paddingVertical: 4 },
  ticketCode: { fontFamily: 'Inter-Black', fontSize: 14, color: '#FFFFFF', letterSpacing: 1.5, marginRight: 10 },
  ticketCopyBtn: { backgroundColor: 'rgba(255,255,255,0.25)', padding: 6, borderRadius: 6 },
  ticketRight: { width: 120, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  ticketMascot: { width: 130, height: 130 },
  ticketBottom: { height: 36, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  ticketValidText: { fontFamily: 'Inter-Bold', fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase' },
  ticketNotchLeft: { position: 'absolute', top: '50%', left: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#F8F9FA' },
  ticketNotchRight: { position: 'absolute', top: '50%', right: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#F8F9FA' },

  // Veg Toggle Zomato Style
  vegToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  vegToggleBtnActive: {
    borderColor: '#22C55E', backgroundColor: '#F0FDF4',
  },
  vegToggleDot: {
    width: 10, height: 10, borderRadius: 2, borderWidth: 1, borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
  },
  vegToggleDotActive: {
    borderColor: '#22C55E', backgroundColor: '#22C55E', borderRadius: 5,
  },
  vegToggleText: {
    fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#6B7280',
  },
  vegToggleTextActive: {
    color: '#16A34A',
  },

  // Voice Search Overlay
  voiceOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  voiceModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 30, alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
  },
  voiceMicCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  voiceText: {
    fontFamily: 'Inter-Bold', fontSize: 24, color: '#1A1A1A', marginBottom: 8,
  },
  voiceSubtext: {
    fontFamily: 'Inter-Medium', fontSize: 15, color: '#6B7280', marginBottom: 30,
  },
  voiceCancelBtn: {
    paddingVertical: 12, paddingHorizontal: 30,
    borderRadius: 24, backgroundColor: '#F3F4F6',
  },
  voiceCancelText: {
    fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#4B5563',
  },

  // OP Veg Splash
  vegSplashContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegSplashTextWrap: {
    alignItems: 'center',
    marginBottom: 40,
  },
  vegSplashTextTitle: {
    fontFamily: 'Inter-Black',
    fontSize: 56,
    color: '#FFFFFF',
    lineHeight: 58,
    letterSpacing: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  vegSplashHugeToggle: {
    width: 140,
    height: 70,
    borderRadius: 35,
    padding: 6,
    justifyContent: 'center',
  },
  vegSplashHugeKnob: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },

  vegSplashHugeKnob: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
});

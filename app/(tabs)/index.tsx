import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { Search, MapPin, ChevronDown, Bell, SlidersHorizontal, CheckCircle, Tag, Clock, Copy, Percent, Zap, Gift } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  FadeInDown,
  FadeInRight,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { menuApi, restaurantApi, couponApi } from '../../services/api';
import { ProductCard } from '../../components/ProductCard';
import { ProductDetailSheet } from '../../components/ProductDetailSheet';
import { FloatingCartBar } from '../../components/FloatingCartBar';
import { useAuthStore } from '../../store/useAuthStore';
import { useCartStore } from '../../store/useCartStore';
import { resolveImageURL } from '../../lib/image-utils';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const CARD_WIDTH = width - 32;

// ─── Static Promo Fallbacks (shown when no hero videos) ──
const PROMOS = [
  { id: '1', title: '50% OFF', sub: 'on your first order!', bg: '#FC8019', emoji: '🎉' },
  { id: '2', title: 'FREE Delivery', sub: 'on orders above ₹199', bg: '#16a34a', emoji: '🛵' },
  { id: '3', title: 'Try New', sub: 'Biriyani Collection', bg: '#7C3AED', emoji: '🍛' },
];

// ─── Shimmer Placeholder ──────────────────────────────
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

function HomeSkeletonLoader() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      <ShimmerBlock w="100%" h={180} r={16} style={{ marginBottom: 24 }} />
      <ShimmerBlock w={140} h={18} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <ShimmerBlock w={68} h={68} r={34} />
            <ShimmerBlock w={50} h={12} r={4} />
          </View>
        ))}
      </View>
      {[1, 2, 3].map(i => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 16, padding: 12, borderRadius: 16, backgroundColor: '#FAFAFA' }}>
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <ShimmerBlock w="40%" h={10} r={4} />
            <ShimmerBlock w="80%" h={16} r={4} />
            <ShimmerBlock w="30%" h={16} r={4} />
            <ShimmerBlock w="95%" h={10} r={4} />
          </View>
          <ShimmerBlock w={100} h={100} r={12} />
        </View>
      ))}
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
          pagingEnabled
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
                      resizeMode={"cover"}
                      shouldPlay={activeIdx === index}
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

                  <View style={styles.heroOverlay} />
                  <View style={styles.heroTextArea}>
                    <Text style={styles.heroWelcome}>🍕 Welcome to FoodieExpress</Text>
                    <Text style={styles.heroHeadline}>
                      Crafted with <Text style={{ color: PRIMARY }}>passion</Text>,{'\n'}served with love.
                    </Text>
                  </View>
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
                        source={require('../../public/Fast-food.json')}
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
        pagingEnabled
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
  const imageUrl = resolveImageURL(item.image || item.imageURL);
  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(400)}>
      <Pressable
        onPress={() => onSelect(item._id)}
        style={[styles.catItem, isSelected && styles.catItemSelected]}
      >
        <View style={[styles.catImageWrap, isSelected && styles.catImageWrapSelected]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.catImage} contentFit="cover" />
          ) : (
            <View style={styles.catImagePlaceholder}>
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
  const userName = useAuthStore((s) => s.user?.name);
  const cartItems = useCartStore((s) => s.items);

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search placeholder animation
  const placeholders = ['Pizza', 'Biryani', 'Burger', 'Ice Cream', 'Rolls', 'Chowmin'];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const fetchHomeData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        menuApi.getCategories(),
        menuApi.getMenu(),
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
    } catch (e) {
      console.log('Error fetching home data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHomeData(); }, []);
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

  const getFilteredProducts = () => {
    let result = products;
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
  };

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const filteredProducts = getFilteredProducts();

  return (
    <View style={styles.container}>
      {/* ─── HEADER ─── */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.locationRow}>
            <MapPin size={18} color={PRIMARY} fill={PRIMARY} />
            <Text style={styles.headerLocationTitle}>
              {userName ? `Hi, ${userName.split(' ')[0]}!` : 'Deliver to'}
            </Text>
            <ChevronDown size={16} color="#3D4152" />
          </View>
          <Text style={styles.headerLocationSub} numberOfLines={1}>
            Siliguri, West Bengal 🇮🇳
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Bell size={20} color="#3D4152" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 18 }}>🍟</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />
        }
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── SEARCH BAR ─── */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.searchWrap}>
          <Pressable style={styles.searchBar}>
            <Search size={20} color="#9CA3AF" />
            <Text style={styles.searchPlaceholder}>
              Search "<Text style={styles.searchHighlight}>{placeholders[placeholderIndex]}</Text>"
            </Text>
          </Pressable>
        </Animated.View>

        {loading ? (
          <HomeSkeletonLoader />
        ) : (
          <>
            {/* ─── UNIFIED HERO SECTION (Videos & Coupons) ─── */}
            <HeroBannerSection />

            {/* ─── VEG / NON-VEG FILTER ─── */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.filterRow}>
              <Pressable
                style={[styles.filterPill, !isVegOnly && styles.filterPillActive]}
                onPress={() => setIsVegOnly(false)}
              >
                <Text style={[styles.filterPillText, !isVegOnly && styles.filterPillTextActive]}>All</Text>
              </Pressable>
              <Pressable
                style={[styles.filterPill, styles.filterPillVeg, isVegOnly && styles.filterPillVegActive]}
                onPress={() => setIsVegOnly(true)}
              >
                <View style={styles.vegDot} />
                <Text style={[styles.filterPillText, isVegOnly && { color: '#16a34a', fontFamily: 'Inter-Bold' }]}>
                  Pure Veg
                </Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.filterIconBtn}>
                <SlidersHorizontal size={18} color="#6B7280" />
              </TouchableOpacity>
            </Animated.View>

            {/* ─── CATEGORY CAROUSEL ─── */}
            <Animated.View entering={FadeInDown.delay(250).duration(400)}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionBullet} />
                <Text style={styles.sectionTitle}>What's on your mind?</Text>
              </View>
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

            {/* ─── DIVIDER ─── */}
            <View style={styles.divider} />

            {/* ─── PRODUCTS ─── */}
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
                      onPress={() => setSelectedProduct(item)}
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
          </>
        )}
      </ScrollView>

      {/* Floating Cart Bar */}
      <FloatingCartBar />

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        item={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
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
    borderBottomWidth: 1, borderBottomColor: '#F3F3F3',
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
    position: 'absolute', top: 8, right: 9,
    width: 7, height: 7, borderRadius: 4, backgroundColor: '#FC8019',
  },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF3E0', borderWidth: 2, borderColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { paddingBottom: 100 },
  // Search
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F7F7F7', borderRadius: 14,
    paddingHorizontal: 16, height: 48,
    borderWidth: 1, borderColor: '#EBEBEB',
  },
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
  emptySub: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#93959F', marginTop: 4 },
  // Hero Video Section
  heroVideoContainer: { paddingHorizontal: 16, marginTop: 16 },
  heroVideoCard: {
    width: '100%', height: 200, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#1A1A2E', position: 'relative',
  },
  heroVideoImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20,
  },
  heroTextArea: {
    position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 10,
  },
  heroWelcome: {
    fontFamily: 'Inter-Bold', fontSize: 12, color: PRIMARY,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
  heroHeadline: {
    fontFamily: 'Inter-Black', fontSize: 22, color: '#FFFFFF', lineHeight: 28,
  },
  heroDotsRow: {
    position: 'absolute', bottom: 12, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5, zIndex: 10,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  heroDotActive: { width: 18, borderRadius: 3, backgroundColor: '#FFFFFF' },
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
  ticketRight: { width: 120, justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden' },
  ticketMascot: { width: 140, height: 140, marginBottom: -20, marginRight: -20 },
  ticketBottom: { height: 36, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  ticketValidText: { fontFamily: 'Inter-Bold', fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase' },
  ticketNotchLeft: { position: 'absolute', top: '50%', left: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#F8F9FA' },
  ticketNotchRight: { position: 'absolute', top: '50%', right: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#F8F9FA' },
});

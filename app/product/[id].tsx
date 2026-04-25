import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, StatusBar, Platform, Pressable, PlatformColor
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, ShoppingCart, Plus, Minus, ArrowRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn, SlideInDown, useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { resolveImageURL } from '../../lib/image-utils';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const GRAY_BG = '#F2F2F4';

// Veg/Non-Veg indicators to replace the mock rating/distance pills
const VegIcon = ({ size = 16 }) => (
  <View style={[styles.typeIconContainer, { borderColor: '#16a34a', width: size, height: size }]}>
    <View style={[styles.typeIconInner, { backgroundColor: '#16a34a', width: size * 0.4, height: size * 0.4 }]} />
  </View>
);

const NonVegIcon = ({ size = 16 }) => (
  <View style={[styles.typeIconContainer, { borderColor: '#EF4444', width: size, height: size }]}>
    <View style={[styles.typeIconInner, { 
      borderBottomWidth: size * 0.4, borderLeftWidth: size * 0.25, borderRightWidth: size * 0.25, 
      borderBottomColor: '#EF4444', borderLeftColor: 'transparent', borderRightColor: 'transparent', 
      backgroundColor: 'transparent'
    }]} />
  </View>
);

export default function ProductDetailScreen() {
  const router = useRouter();
  const { itemData } = useLocalSearchParams();
  const [item, setItem] = useState<any>(null);

  const { items, addItem, incrementItem, decrementItem } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [localQty, setLocalQty] = useState(1);

  useEffect(() => {
    if (itemData && typeof itemData === 'string') {
      try {
        setItem(JSON.parse(decodeURIComponent(itemData)));
      } catch (e) {
        console.error('Error parsing item data', e);
      }
    }
  }, [itemData]);

  // --- All Hooks must be declared before any early return ---
  
  const cartItem = item ? items.find((i) => i._id === item._id) : null;
  const displayPrice = item ? (item.price || item.variants?.[0]?.price || 0) : 0;
  const imageUrl = item ? resolveImageURL(item.image || item.imageURL) : '';
  const categoryName = item ? (typeof item.category === 'object' ? item.category?.name : item.category) : '';

  // --- SWIPE GESTURE LOGIC ---
  const translateX = useSharedValue(0);
  const SWIPE_LIMIT = width - 48 - 64; // container width minus padding minus circle width

  const isSyncing = cartItem?.itemId?.startsWith('temp_') ?? false;

  // Keep localQty matched to cartItem when it loads
  useEffect(() => {
    if (cartItem && !isSyncing) {
      setLocalQty(cartItem.quantity);
    }
  }, [cartItem?.quantity, isSyncing]);

  const handleAdd = () => {
    if (!isAuthenticated()) {
      return router.push('/(auth)/login');
    }
    
    addItem({
      _id: item._id,
      name: item.name,
      price: Number(displayPrice),
      image: imageUrl || '',
      type: item.type,
      category: typeof item.category === 'object' ? item.category?._id : item.category,
      quantity: localQty, // <--- Correctly pass the quantity so we don't duplicate items
    });
  };

  const handleIncrement = () => {
    if (!isAuthenticated()) return router.push('/(auth)/login');
    if (cartItem) {
        if (!isSyncing) incrementItem(cartItem.itemId);
    } else {
        setLocalQty(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (!isAuthenticated()) return router.push('/(auth)/login');
    if (cartItem) {
        if (!isSyncing) decrementItem(cartItem.itemId);
    } else {
        setLocalQty(prev => Math.max(1, prev - 1));
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((e) => {
      if (cartItem) return; // If already in cart, disable swipe
      translateX.value = Math.max(0, Math.min(e.translationX, SWIPE_LIMIT));
    })
    .onEnd((e) => {
      if (cartItem) return;
      if (translateX.value > SWIPE_LIMIT * 0.5) {
        translateX.value = withSpring(SWIPE_LIMIT, { damping: 16, stiffness: 120, overshootClamping: true });
        runOnJS(handleAdd)();
      } else {
        translateX.value = withSpring(0, { damping: 16, stiffness: 120, overshootClamping: true });
      }
    });

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - (translateX.value / SWIPE_LIMIT) * 1.5),
    transform: [{ translateX: translateX.value * 0.1 }]
  }));

  // Quantity to display inline
  const currentQuantity = cartItem ? cartItem.quantity : localQty;
  const finalPrice = displayPrice * currentQuantity;

  // --- EARLY RETURN FOR LOADING STATE ---
  if (!item) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Hero Background Block (Top Half) */}
      <View style={styles.topBgBlock} />

      {/* Header Actions (Floating over BG) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#1A1A1A" />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.headerBtn, { position: 'relative' }]} onPress={() => router.push('/cart')}>
          <ShoppingCart size={20} color="#1A1A1A" />
          {items.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{items.reduce((s, i) => s + i.quantity, 0)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        
        {/* Large Product Image spilling into the bottom card */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.imageWrapper}>
           {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.heroImage} contentFit="contain" />
            ) : (
              <View style={styles.heroFallback}><Text style={{fontSize:80}}>🍽️</Text></View>
            )}
        </Animated.View>

        {/* Bottom Details Sheet (White Box) */}
        <Animated.View entering={SlideInDown.delay(200).duration(400)} style={styles.detailsSheet}>
          
          {/* Title Row */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.name}</Text>
          </View>

          {/* Info Pills (using actual item data to replace dummy ratings) */}
          <View style={styles.pillsRow}>
             {categoryName && (
               <View style={styles.pill}>
                  <Text style={styles.pillText}>{categoryName}</Text>
               </View>
             )}
             {item.type && (
               <View style={styles.pill}>
                  {item.type === 'Veg' ? <VegIcon size={14} /> : <NonVegIcon size={14} />}
                  <Text style={[styles.pillText, { marginLeft: 4 }]}>{item.type}</Text>
               </View>
             )}
             {item.bestseller && (
               <View style={styles.pill}>
                  <Text style={[styles.pillText, { color: '#F59E0B' }]}>⭐ Bestseller</Text>
               </View>
             )}
          </View>

          {/* Description Section */}
          <View style={styles.descSection}>
            <Text style={styles.descTitle}>Description</Text>
            <Text style={styles.description}>
              {item.description || 'A delicious, handcrafted recipe prepared with the freshest ingredients. Perfect for satisfying your cravings — made with love, just for you.'}
              {/* Optional read more logic can be added here if text is too long */}
            </Text>
          </View>

          {/* Spacer to push pricing down if content is short */}
          <View style={{ flex: 1, minHeight: 40 }} />

          {/* Price & Quantity Row */}
          <View style={styles.priceRow}>
             <Text style={styles.priceText}>₹{displayPrice}</Text>

             <View style={styles.stepperWrap}>
               <TouchableOpacity 
                 style={styles.stepperBtn} 
                 onPress={handleDecrement}
                 disabled={cartItem ? currentQuantity <= 1 : localQty <= 1}
                 hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
               >
                 <Minus size={16} color={(cartItem ? currentQuantity > 1 : localQty > 1) ? '#1A1A1A' : '#D1D5DB'} />
               </TouchableOpacity>
               <Text style={styles.stepperCount}>{currentQuantity}</Text>
               <TouchableOpacity 
                 style={styles.stepperBtn} 
                 onPress={handleIncrement}
                 hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
               >
                 <Plus size={16} color={PRIMARY} />
               </TouchableOpacity>
             </View>
          </View>

          {/* Add to Cart Premium Action */}
          {cartItem ? (
             <TouchableOpacity 
               style={styles.addCartFullBtn} 
               activeOpacity={0.85} 
               onPress={() => router.push('/cart')}
             >
                <View style={[styles.arrowCircle, { position: 'absolute', right: 8 }]}>
                   <ArrowRight size={20} color="#FFFFFF" strokeWidth={3} />
                </View>
                <View style={{ width: '100%', alignItems: 'center' }}>
                   <Text style={[styles.addCartFullText, { color: PRIMARY }]}>Go to Cart • {cartItem.quantity} items</Text>
                </View>
             </TouchableOpacity>
          ) : (
             <GestureDetector gesture={panGesture}>
               <View style={styles.addCartFullBtn}>
                  <Animated.View style={[styles.arrowCircle, circleStyle]}>
                    <ArrowRight size={20} color="#FFFFFF" strokeWidth={3} />
                  </Animated.View>

                  <Animated.View style={[{ position: 'absolute', width: '100%', alignItems: 'center', paddingLeft: 30, zIndex: -1 }, textStyle]}>
                     <Text style={styles.addCartFullText}>Swipe to add to cart</Text>
                  </Animated.View>
               </View>
             </GestureDetector>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBgBlock: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: height * 0.45,
    backgroundColor: GRAY_BG,
  },
  header: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 40, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, zIndex: 50,
  },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  cartBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#EF4444', width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  cartBadgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Inter-Bold' },
  
  imageWrapper: {
    width: width,
    height: height * 0.35,
    marginTop: Platform.OS === 'ios' ? 100 : 80,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  heroImage: { width: '85%', height: '100%' },
  heroFallback: { width: '85%', height: '100%', alignItems: 'center', justifyContent: 'center' },

  detailsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -40,
    minHeight: height * 0.6,
    paddingHorizontal: 24, paddingVertical: 32,
    zIndex: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 15,
  },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    flex: 1, fontFamily: 'Inter-Black', fontSize: 28, color: '#1A1A1A', lineHeight: 34,
    marginRight: 16,
  },

  
  pillsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#F9FAFB', borderRadius: 20,
  },
  pillText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#4B5563' },
  typeIconContainer: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  typeIconInner: { borderRadius: 2 },

  descSection: { marginBottom: 30 },
  descTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#1A1A1A', marginBottom: 12 },
  description: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#6B7280', lineHeight: 22 },

  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
  },
  priceText: { fontFamily: 'Inter-Black', fontSize: 28, color: '#1A1A1A' },
  
  stepperWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 24, paddingHorizontal: 6, paddingVertical: 6,
  },
  stepperBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stepperCount: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#1A1A1A', marginHorizontal: 16 },

  addCartFullBtn: {
    width: '100%', height: 64, borderRadius: 32,
    backgroundColor: '#FFE5D6', // Light peachy background
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
    position: 'relative',
    overflow: 'hidden'
  },
  addCartFullText: { fontFamily: 'Inter-Black', fontSize: 16, color: '#1A1A1A' },
  arrowCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10
  }
});

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetFooter } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Minus, X, Star, Clock, Flame, ShoppingBag, ChevronDown } from 'lucide-react-native';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { resolveImageURL } from '../lib/image-utils';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const PRIMARY_DARK = '#E5720F';

// Veg/Non-Veg icons
const VegIcon = ({ size = 18 }: { size?: number }) => (
  <View style={[styles.typeIconContainer, { borderColor: '#16a34a', width: size, height: size }]}>  
    <View style={[styles.typeIconInner, { backgroundColor: '#16a34a', borderRadius: 4, width: size * 0.4, height: size * 0.4 }]} />
  </View>
);

const NonVegIcon = ({ size = 18 }: { size?: number }) => (
  <View style={[styles.typeIconContainer, { borderColor: '#EF4444', width: size, height: size }]}>
    <View style={[styles.typeIconInner, { 
      borderBottomWidth: 7, borderLeftWidth: 4.5, borderRightWidth: 4.5, 
      borderBottomColor: '#EF4444', borderLeftColor: 'transparent', borderRightColor: 'transparent', backgroundColor: 'transparent',
      width: size * 0.4, height: size * 0.4,
    }]} />
  </View>
);

interface ProductDetailSheetProps {
  item: any | null;
  onClose: () => void;
}

export function ProductDetailSheet({ item, onClose }: ProductDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const snapPoints = useMemo(() => ['88%'], []);
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  const { items, addItem, incrementItem, decrementItem } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.65} />
    ),
    []
  );

  const cartItem = item ? items.find((i) => i._id === item._id) : null;
  const displayPrice = item ? (item.price || item.variants?.[0]?.price || 0) : 0;
  const imageUrl = item ? resolveImageURL(item.image || item.imageURL) : null;
  const categoryName = item ? (typeof item.category === 'object' ? item.category?.name : item.category) : '';

  const handleAdd = () => {
    if (!item) return;
    if (!isAuthenticated()) {
      onClose();
      return router.push('/(auth)/login');
    }
    addItem({
      _id: item._id,
      name: item.name,
      price: Number(displayPrice),
      image: imageUrl || '',
      type: item.type,
      category: typeof item.category === 'object' ? item.category?._id : item.category,
    });
  };

  const renderFooter = useCallback(
    (props: any) => {
      if (!item) return null;
      return (
        <BottomSheetFooter {...props} bottomInset={60}>
          <View style={[styles.bottomBarWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Price summary row */}
            <View style={styles.footerPriceRow}>
              <Text style={styles.footerPriceLabel}>Total</Text>
              <Text style={styles.footerPriceValue}>₹{cartItem ? displayPrice * cartItem.quantity : displayPrice}</Text>
            </View>
            {/* Action */}
            <View style={styles.bottomBarInner}>
              {cartItem ? (
                <View style={styles.counterRow}>
                  <View style={styles.counterWrap}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (!isAuthenticated()) { onClose(); return router.push('/(auth)/login'); }
                        decrementItem(cartItem.itemId);
                      }}
                    >
                      <Minus size={20} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                    <Text style={styles.counterVal}>{cartItem.quantity}</Text>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (!isAuthenticated()) { onClose(); return router.push('/(auth)/login'); }
                        incrementItem(cartItem.itemId);
                      }}
                    >
                      <Plus size={20} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={styles.viewCartBtn} 
                    activeOpacity={0.8}
                    onPress={() => { onClose(); router.push('/cart'); }}
                  >
                    <ShoppingBag size={16} color="#FFFFFF" />
                    <Text style={styles.viewCartText}>View Cart</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={handleAdd}>
                  <Text style={styles.addBtnText}>Add to Cart</Text>
                  <View style={styles.addBtnPrice}>
                    <Text style={styles.addBtnPriceText}>₹{displayPrice}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </BottomSheetFooter>
      );
    },
    [item, cartItem, displayPrice, insets.bottom, isAuthenticated, handleAdd]
  );

  React.useEffect(() => {
    if (item) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [item]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 44, height: 5, borderRadius: 3 }}
    >
      {/* ─── Close Button (always on top-right corner) ─── */}
      {item && (
        <TouchableOpacity 
          onPress={() => { bottomSheetRef.current?.close(); onClose(); }} 
          style={styles.closeBtn} 
          activeOpacity={0.7}
        >
          <X size={20} color="#3D4152" strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      {item && (
        <BottomSheetScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 180 }]} 
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Hero Image with Gradient Overlay ─── */}
          <View style={styles.imageWrapper}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.heroImage} contentFit="cover" />
            ) : (
              <View style={styles.heroFallback}>
                <Text style={{ fontSize: 80 }}>🍽️</Text>
              </View>
            )}
            {/* Gradient at bottom of image for smooth text transition */}
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.85)', '#FFFFFF']}
              style={styles.imageGradient}
            />

            {/* Type badge floating on image */}
            {item.type && (
              <View style={styles.typeBadgeFloat}>
                {item.type === 'Veg' ? <VegIcon size={20} /> : <NonVegIcon size={20} />}
              </View>
            )}
          </View>

          {/* ─── Item Details ─── */}
          <View style={styles.detailsBox}>
            {/* Category + Bestseller */}
            <View style={styles.metaRow}>
              {categoryName ? (
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{categoryName}</Text>
                </View>
              ) : null}
              {item.bestseller && (
                <View style={styles.bestsellerBadge}>
                  <Star size={11} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.bestsellerText}>Bestseller</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={styles.title}>{item.name}</Text>

            {/* Price + Discount */}
            <View style={styles.priceRow}>
              <Text style={styles.priceTag}>₹{displayPrice}</Text>
              {item.hasDiscount && item.originalPrice && (
                <>
                  <View style={styles.originalPriceWrap}>
                    <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
                    <View style={styles.strikethrough} />
                  </View>
                  <View style={styles.discountPill}>
                    <Text style={styles.discountPillText}>{item.discountPercentage}% OFF</Text>
                  </View>
                </>
              )}
            </View>

            {/* Quick Info Strip */}
            <View style={styles.quickInfoStrip}>
              <View style={styles.quickInfoItem}>
                <Flame size={14} color="#EF4444" />
                <Text style={styles.quickInfoText}>Popular Choice</Text>
              </View>
              {item.type && (
                <>
                  <View style={styles.quickInfoDot} />
                  <View style={styles.quickInfoItem}>
                    <View style={[styles.typeIconSmall, { borderColor: item.type === 'Veg' ? '#16a34a' : '#EF4444' }]}>
                      <View style={[styles.typeIconSmallInner, { backgroundColor: item.type === 'Veg' ? '#16a34a' : '#EF4444' }]} />
                    </View>
                    <Text style={styles.quickInfoText}>{item.type === 'Veg' ? 'Pure Veg' : 'Non-Veg'}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Description Section */}
            <Text style={styles.descTitle}>About this dish</Text>
            <Text style={styles.description}>
              {item.description || 'A delicious, handcrafted recipe prepared with the freshest ingredients. Perfect for satisfying your cravings — made with love, just for you.'}
            </Text>
          </View>
        </BottomSheetScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 20 },

  // ─── Hero Image ───
  imageWrapper: {
    width: '100%', height: width * 0.7,
    backgroundColor: '#FFF5EC',
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5EC' },
  imageGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 14, zIndex: 99,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  typeBadgeFloat: {
    position: 'absolute', bottom: 20, left: 20, zIndex: 10,
    backgroundColor: '#FFFFFF', padding: 6, borderRadius: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },

  // ─── Details ───
  detailsBox: {
    paddingHorizontal: 20, paddingTop: 4,
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: '#FDDCB5',
  },
  categoryPillText: {
    fontFamily: 'Inter-SemiBold', fontSize: 11, color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  bestsellerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  bestsellerText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.3 },
  
  title: {
    fontFamily: 'Inter-Black', fontSize: 24, color: '#1A1A1A', marginBottom: 10, lineHeight: 30,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  priceTag: { fontFamily: 'Inter-ExtraBold', fontSize: 24, color: '#1A1A1A' },
  originalPriceWrap: { position: 'relative', justifyContent: 'center' },
  originalPrice: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#9CA3AF' },
  strikethrough: { position: 'absolute', height: 1.5, backgroundColor: '#EF4444', width: '100%', top: '50%' },
  discountPill: {
    backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  discountPillText: { fontFamily: 'Inter-Bold', fontSize: 11, color: '#16a34a' },

  // ─── Quick Info ───
  quickInfoStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F9FAFB', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
    marginBottom: 20,
  },
  quickInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickInfoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' },
  quickInfoText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#4B5563' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 20 },
  descTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: '#374151', marginBottom: 8, letterSpacing: 0.2 },
  description: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#6B7280', lineHeight: 22 },

  typeIconContainer: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  typeIconInner: {},
  typeIconSmall: { width: 14, height: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  typeIconSmallInner: { width: 6, height: 6, borderRadius: 3 },

  // ─── Footer / Bottom Bar ───
  bottomBarWrap: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 15,
  },
  footerPriceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  footerPriceLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#9CA3AF' },
  footerPriceValue: { fontFamily: 'Inter-ExtraBold', fontSize: 18, color: '#1A1A1A' },
  bottomBarInner: { width: '100%' },

  addBtn: {
    width: '100%', backgroundColor: PRIMARY,
    borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  addBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#FFFFFF' },
  addBtnPrice: {
    backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10,
  },
  addBtnPriceText: { fontFamily: 'Inter-ExtraBold', fontSize: 14, color: '#FFFFFF' },

  counterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  counterWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: PRIMARY,
    borderRadius: 16, height: 52, paddingHorizontal: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
  },
  counterBtn: { width: 52, height: '100%', alignItems: 'center', justifyContent: 'center' },
  counterVal: { fontFamily: 'Inter-Black', fontSize: 18, color: '#FFFFFF' },
  viewCartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#16a34a', paddingHorizontal: 18, paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5,
  },
  viewCartText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#FFFFFF' },
});

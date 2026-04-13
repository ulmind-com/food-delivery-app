import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, ActivityIndicator, Platform, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ShoppingBag, ArrowLeft, Trash2, Plus, Minus, Info, Clock, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../constants/ThemeContext';
import { Button } from '../components/ui/Button';
import { TicketCoupon } from '../components/TicketCoupon';

const PRIMARY = '#FC8019';

export default function CartScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const {
    items,
    isLoading,
    totalPrice,
    discountAmount,
    tax,
    finalPrice,
    deliveryFee,
    incrementItem,
    decrementItem,
    clearCart,
    fetchCart,
  } = useCartStore();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated()) {
      fetchCart();
    }
  }, [isAuthenticated]);

  const toPay = finalPrice;

  const handleCheckout = () => {
    if (!isAuthenticated()) {
      router.push('/(auth)/login');
      return;
    }
    router.push('/checkout');
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconBox, { backgroundColor: colors.muted }]}>
        <ShoppingBag size={48} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your cart is empty</Text>
      <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
        Add items from the menu to get started
      </Text>
      <Button
        title="Browse Restaurant"
        onPress={() => router.push('/(tabs)')}
        style={{ marginTop: 24, width: 'auto', paddingHorizontal: 32 }}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Order</Text>
        {items.length > 0 ? (
          <Pressable 
            onPress={() => {
              if (Platform.OS === 'web') {
                if (window.confirm('Remove all items from your cart?')) clearCart();
              } else {
                Alert.alert('Clear Cart', 'Remove all items from your cart?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: clearCart },
                ]);
              }
            }} 
            style={({ pressed }) => [
              styles.clearBtn, 
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Trash2 size={20} color={colors.destructive} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Loading State — Skeleton Loader */}
      {isLoading && items.length === 0 ? (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20 }}>
          {/* Delivery estimate skeleton */}
          <Animated.View entering={FadeInDown.delay(50)} style={{ height: 48, borderRadius: 14, backgroundColor: colors.muted, marginBottom: 16, opacity: 0.5 }} />
          {/* Item skeleton cards */}
          {[1, 2, 3].map(i => (
            <Animated.View entering={FadeInDown.delay(100 * i)} key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 12, gap: 12 }}>
              <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.muted, opacity: 0.4 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ width: '70%', height: 14, borderRadius: 4, backgroundColor: colors.muted, opacity: 0.4 }} />
                <View style={{ width: '40%', height: 12, borderRadius: 4, backgroundColor: colors.muted, opacity: 0.3 }} />
                <View style={{ width: '30%', height: 16, borderRadius: 4, backgroundColor: colors.muted, opacity: 0.4 }} />
              </View>
              <View style={{ width: 80, height: 32, borderRadius: 10, backgroundColor: colors.muted, opacity: 0.3 }} />
            </Animated.View>
          ))}
          {/* Bill skeleton */}
          <Animated.View entering={FadeInDown.delay(400)} style={{ borderRadius: 16, backgroundColor: colors.muted, opacity: 0.3, height: 160, marginTop: 8 }} />
        </View>
      ) : !isAuthenticated() || items.length === 0 ? (
        renderEmptyCart()
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >

            {/* Items List */}
            <View style={styles.itemsList}>
              {items.map((item) => (
                <View
                  key={item.itemId || `${item._id}-${item.variant}`}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.itemImageContainer}>
                    <Image source={{ uri: item.image }} style={styles.itemImage} contentFit="cover" />
                  </View>
                  <View style={styles.itemDetails}>
                    <View style={styles.itemHeader}>
                      {item.type === 'Veg' ? (
                        <View style={[styles.typeIcon, { borderColor: '#16a34a' }]}>
                          <View style={[styles.typeDot, { backgroundColor: '#16a34a', borderRadius: 2 }]} />
                        </View>
                      ) : item.type === 'Non-Veg' ? (
                        <View style={[styles.typeIcon, { borderColor: '#dc2626' }]}>
                          <View style={[styles.typeTriangle, { borderBottomColor: '#dc2626' }]} />
                        </View>
                      ) : null}
                      <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    {item.variant && (
                      <Text style={[styles.itemVariant, { color: colors.mutedForeground }]}>
                        {item.variant}
                      </Text>
                    )}
                    <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                      ₹{item.price * item.quantity}
                    </Text>
                  </View>
                  <View style={[styles.counterContainer, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={decrementItem.bind(null, item.itemId)}
                    >
                      <Minus size={14} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.counterText, { color: colors.primary }]}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={incrementItem.bind(null, item.itemId)}
                    >
                      <Plus size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Add More Items CTA */}
            <TouchableOpacity style={styles.addMoreCta} onPress={() => router.replace('/(tabs)')}>
              <Plus size={16} color={PRIMARY} strokeWidth={2.5} />
              <Text style={styles.addMoreCtaText}>Add more items</Text>
              <ChevronRight size={14} color={PRIMARY} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Any delivery instructions block (placeholder) */}
            <View style={styles.containerPadding}>
              
              <TicketCoupon />

              {/* Bill Details */}
              <View style={[styles.billCard, { backgroundColor: isDark ? colors.card : colors.muted, borderColor: colors.border }]}>
                <Text style={styles.billHeader}>BILL DETAILS</Text>
                
                <View style={styles.billRow}>
                  <Text style={[styles.billText, { color: colors.foreground }]}>Item Total</Text>
                  <Text style={[styles.billText, { color: colors.foreground, fontFamily: 'Inter-Medium' }]}>
                    ₹{totalPrice.toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.billRow}>
                  <Text style={styles.billTextLight}>Delivery Fee</Text>
                  <Text style={[styles.billTextLight, { fontSize: 11, fontStyle: 'italic' }]}>
                    Calculated at Checkout
                  </Text>
                </View>

                <View style={styles.billRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.billTextLight}>GST & Taxes</Text>
                    <Info size={12} color={colors.mutedForeground} />
                  </View>
                  <Text style={styles.billTextLight}>₹{tax.toFixed(2)}</Text>
                </View>

                {discountAmount > 0 && (
                  <View style={styles.billRow}>
                    <Text style={[styles.billText, { color: colors.success }]}>Item Discount</Text>
                    <Text style={[styles.billText, { color: colors.success }]}>
                      -₹{discountAmount.toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.billRow}>
                  <Text style={[styles.grandTotalText, { color: colors.foreground }]}>To Pay</Text>
                  <Text style={[styles.grandTotalText, { color: colors.foreground }]}>
                    ₹{toPay.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

        </>
      )}

      {/* Sticky Checkout Bottom Bar — Premium */}
      {items.length > 0 && (
        <Animated.View entering={FadeInUp.delay(200)} style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} activeOpacity={0.85}>
            <View>
              <Text style={styles.checkoutBtnLabel}>TOTAL</Text>
              <Text style={styles.checkoutBtnAmount}>
                ₹{toPay.toFixed(0)}
              </Text>
            </View>
            <View style={styles.checkoutBtnRight}>
              <Text style={styles.checkoutBtnText}>PROCEED TO CHECKOUT</Text>
              <Text style={styles.checkoutBtnArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitle: {
    fontFamily: 'Inter-Black',
    fontSize: 20,
  },
  clearBtn: {
    padding: 8,
    marginRight: -8,
  },
  clearBtnConfirm: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: -4,
  },
  clearBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#EF4444',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    marginBottom: 8,
  },
  emptyDesc: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 150,
  },
  itemsList: {
    paddingTop: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  itemImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
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
  itemName: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    flex: 1,
  },
  itemVariant: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    marginBottom: 4,
  },
  itemPrice: {
    fontFamily: 'Inter-ExtraBold',
    fontSize: 14,
    marginTop: 2,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    height: 32,
    marginLeft: 8,
  },
  counterBtn: {
    paddingHorizontal: 8,
    height: '100%',
    justifyContent: 'center',
  },
  counterText: {
    fontFamily: 'Inter-Black',
    fontSize: 14,
    minWidth: 20,
    textAlign: 'center',
  },
  containerPadding: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  billCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  billHeader: {
    fontFamily: 'Inter-ExtraBold',
    fontSize: 11,
    color: '#8B99B0',
    letterSpacing: 1,
    marginBottom: 16,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  billText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  billTextLight: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#8B99B0',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 12,
  },
  grandTotalText: {
    fontFamily: 'Inter-Black',
    fontSize: 16,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 20,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  checkoutBtnLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  checkoutBtnAmount: {
    fontFamily: 'Inter-Black',
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  checkoutBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  checkoutBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  checkoutBtnArrow: {
    fontFamily: 'Inter-Black',
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  deliveryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1, marginBottom: 8,
  },
  deliveryBannerText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#374151' },
  deliveryBannerBold: { fontFamily: 'Inter-Black', color: PRIMARY },
  addMoreCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 8, backgroundColor: `${PRIMARY}08`, borderRadius: 14,
    borderWidth: 1, borderColor: `${PRIMARY}20`,
  },
  addMoreCtaText: { fontFamily: 'Inter-Bold', fontSize: 13, color: PRIMARY },
});

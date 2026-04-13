import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, 
  ActivityIndicator, Alert, Platform, Dimensions, FlatList 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { 
  ArrowLeft, MapPin, ChevronRight, Banknote, ReceiptText, 
  Home, Briefcase, Plus, Minus, FileText, UtensilsCrossed, 
  Clock, ShoppingBag, ChevronDown, Sparkles
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn, SlideInUp } from 'react-native-reanimated';
import { useCartStore } from '../store/useCartStore';
import { useLocationStore } from '../store/useLocationStore';
import { useAuthStore } from '../store/useAuthStore';
import { orderApi, restaurantApi, cartApi } from '../services/api';
import { TicketCoupon } from '../components/TicketCoupon';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const PRIMARY_DARK = '#E06B10';
const TEXT_COLOR = '#1A1A1A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const BG = '#F8F9FB';
const CARD_BG = '#FFFFFF';
const SUCCESS = '#16A34A';

export default function CheckoutScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const { 
    items, totalPrice, discountAmount, finalPrice, tax, taxBreakdown, 
    deliveryFee, appliedCoupon, clearCart, incrementItem, decrementItem,
    isLoading: isCartLoading, fetchCart, addItem
  } = useCartStore();
  
  const { selectedAddress } = useLocationStore();
  const user = useAuthStore((s) => s.user);

  const [deliveryInstruction, setDeliveryInstruction] = useState('');
  const [noCutlery, setNoCutlery] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [isPlacing, setIsPlacing] = useState(false);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);

  // Fetch restaurant info + recommendations on mount
  useEffect(() => {
    restaurantApi.get()
      .then(res => setRestaurant(res.data))
      .catch(() => {});

    cartApi.getRecommendations()
      .then(res => setRecommendedProducts(res.data || []))
      .catch(() => {});
  }, []);

  // Fetch cart with coordinates when we have a selected address
  useEffect(() => {
    if (selectedAddress?.coordinates?.lat && selectedAddress?.coordinates?.lng) {
      fetchCart({ lat: selectedAddress.coordinates.lat, lng: selectedAddress.coordinates.lng });
    } else {
      fetchCart();
    }
  }, [selectedAddress?._id]);

  const isRestaurantClosed = restaurant && !restaurant.isOpen;

  // COD disable logic (same as web)
  let isCodDisabled = false;
  let codDisableReason = '';
  if (user?.isCodDisabled) {
    isCodDisabled = true;
    codDisableReason = 'Disabled for your account';
  } else if (restaurant && restaurant.isCodEnabled === false) {
    isCodDisabled = true;
    codDisableReason = 'Currently disabled by restaurant';
  } else if (restaurant?.codStartTime && restaurant?.codEndTime) {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentHhMm = String(istTime.getHours()).padStart(2, '0') + ':' + String(istTime.getMinutes()).padStart(2, '0');
    const start = restaurant.codStartTime;
    const end = restaurant.codEndTime;
    if (start < end) {
      if (currentHhMm >= start && currentHhMm <= end) {
        isCodDisabled = true;
        codDisableReason = `Not available between ${start} and ${end}`;
      }
    } else if (start > end) {
      if (currentHhMm >= start || currentHhMm <= end) {
        isCodDisabled = true;
        codDisableReason = `Not available between ${start} and ${end}`;
      }
    }
  }

  useEffect(() => {
    if (isCodDisabled && paymentMethod === 'COD') {
      setPaymentMethod('ONLINE');
    }
  }, [isCodDisabled]);

  const isLoading = isPlacing || isCartLoading;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address before placing your order.');
      return;
    }

    if (paymentMethod === 'ONLINE') {
      Alert.alert('Coming Soon', 'Online payment via Razorpay is coming soon! Please use Cash on Delivery for now.');
      setPaymentMethod('COD');
      return;
    }

    try {
      setIsPlacing(true);

      const orderItems = items.map(i => ({
        product: i._id,
        quantity: i.quantity,
        variant: i.variant || 'Standard',
        price: i.price,
      }));

      const combinedInstruction = `${deliveryInstruction}${noCutlery ? " | Don't send cutlery 🍴❌" : ""}`.trim();

      const payload = {
        items: orderItems,
        totalAmount: totalPrice,
        discountApplied: discountAmount,
        finalAmount: finalPrice,
        deliveryAddress: selectedAddress._id || (selectedAddress as any).id,
        address: [
          selectedAddress.addressLine1,
          selectedAddress.addressLine2,
          selectedAddress.city,
          selectedAddress.state,
          selectedAddress.postalCode,
        ].filter(Boolean).join(', '),
        deliveryInstruction: combinedInstruction || undefined,
        deliveryCoordinates: selectedAddress.coordinates || undefined,
        deliveryFee,
        paymentMethod: 'COD',
      };

      const res = await orderApi.placeOrder(payload);
      const orderId = res.data?.order?._id || res.data?._id;
      
      // Navigate to success screen first
      router.replace(`/order-success?orderId=${orderId}`);

      // Clear the cart slightly after navigation to prevent empty cart flash UI
      setTimeout(() => {
        clearCart();
      }, 500);
    } catch (err: any) {
      Alert.alert('Order Failed', err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsPlacing(false);
    }
  };

  const getAddressIcon = (type: string) => {
    if (type === 'HOME') return <Home size={20} color={PRIMARY} />;
    if (type === 'WORK') return <Briefcase size={20} color={PRIMARY} />;
    return <MapPin size={20} color={PRIMARY} />;
  };

  const getAddressLabel = (type: string) => {
    if (type === 'HOME') return 'Home';
    if (type === 'WORK') return 'Work';
    return 'Address';
  };

  const filteredRecommendations = recommendedProducts.filter(
    p => !items.find(i => i._id === p._id)
  );

  // Empty cart state
  if (items.length === 0 && !isCartLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/cart')} style={styles.backButton}>
            <ArrowLeft size={24} color={TEXT_COLOR} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShoppingBag size={48} color={MUTED} style={{ opacity: 0.4 }} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyDesc}>Add items from the menu to get started.</Text>
          <TouchableOpacity style={styles.browsePrimaryBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.browsePrimaryBtnText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const addressText = selectedAddress 
    ? [selectedAddress.addressLine1, selectedAddress.addressLine2, selectedAddress.city, selectedAddress.postalCode].filter(Boolean).join(', ')
    : '';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_right' }} />

      {/* ─── Header ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/cart')} style={styles.backButton}>
          <ArrowLeft size={24} color={TEXT_COLOR} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        ref={scrollRef}
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* ─── 1. Delivery Address Card ─── */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.section}>
          <Text style={styles.sectionLabel}>DELIVER TO</Text>
          {selectedAddress ? (
            <View style={styles.card}>
              <View style={styles.addressRow}>
                <View style={styles.addressIconWrap}>
                  {getAddressIcon(selectedAddress.type)}
                </View>
                <View style={styles.addressBlock}>
                  <Text style={styles.addressType}>
                    Delivery to {getAddressLabel(selectedAddress.type)}
                  </Text>
                  <Text style={styles.addressText} numberOfLines={2}>{addressText}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/addresses')} style={styles.changeBtn}>
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => router.push('/addresses')} style={styles.addAddressCard}>
              <View style={styles.addAddressCircle}>
                <Plus size={24} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addAddressTitle}>Add Delivery Address</Text>
                <Text style={styles.addAddressSub}>Select where you want your food delivered</Text>
              </View>
              <ChevronRight size={20} color={PRIMARY} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ─── 2. Items Summary Card ─── */}
        <Animated.View entering={FadeIn.duration(400).delay(50)} style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR ORDER</Text>
          <View style={styles.card}>
            {items.map((item, idx) => (
              <View key={item.itemId || `${item._id}-${item.variant}`}>
                <View style={styles.itemRow}>
                  <Image source={{ uri: item.image }} style={styles.itemImg} contentFit="cover" />
                  <View style={styles.itemInfo}>
                    <View style={styles.itemNameRow}>
                      {item.type === 'Veg' ? (
                        <View style={[styles.typeIcon, { borderColor: '#16a34a' }]}>
                          <View style={[styles.typeDot, { backgroundColor: '#16a34a' }]} />
                        </View>
                      ) : item.type === 'Non-Veg' ? (
                        <View style={[styles.typeIcon, { borderColor: '#dc2626' }]}>
                          <View style={[styles.typeTriangle, { borderBottomColor: '#dc2626' }]} />
                        </View>
                      ) : null}
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    </View>
                    {item.variant && <Text style={styles.itemVariant}>{item.variant}</Text>}
                    <View style={styles.itemBottomRow}>
                      <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                      {item.quantity > 1 && (
                        <Text style={styles.itemUnitPrice}>₹{item.price} each</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => decrementItem(item.itemId)}>
                      <Minus size={12} color={PRIMARY} strokeWidth={3} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => incrementItem(item.itemId)}>
                      <Plus size={12} color={PRIMARY} strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                </View>
                {idx < items.length - 1 && <View style={styles.itemDivider} />}
              </View>
            ))}

            {/* Add more items */}
            <TouchableOpacity style={styles.addMoreBtn} onPress={() => router.replace('/(tabs)')}>
              <Plus size={16} color={PRIMARY} strokeWidth={2.5} />
              <Text style={styles.addMoreText}>Add more items</Text>
            </TouchableOpacity>

            {/* ─── Notes & Cutlery ─── */}
            <View style={styles.notesCutleryDivider} />
            <View style={styles.notesCutleryRow}>
              <TouchableOpacity 
                style={[styles.noteCutleryBtn, (isNoteOpen || deliveryInstruction) && styles.noteCutleryBtnActive]}
                onPress={() => setIsNoteOpen(!isNoteOpen)}
              >
                <FileText size={14} color={(isNoteOpen || deliveryInstruction) ? PRIMARY : MUTED} strokeWidth={2.5} />
                <Text style={[styles.noteCutleryBtnText, (isNoteOpen || deliveryInstruction) && { color: PRIMARY }]}>
                  {deliveryInstruction ? 'Edit Note' : 'Add a note'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.noteCutleryBtn, noCutlery && styles.noteCutleryBtnActive]}
                onPress={() => setNoCutlery(!noCutlery)}
              >
                <UtensilsCrossed size={14} color={noCutlery ? PRIMARY : MUTED} strokeWidth={2.5} />
                <Text style={[styles.noteCutleryBtnText, noCutlery && { color: PRIMARY }]}>
                  No cutlery
                </Text>
              </TouchableOpacity>
            </View>

            {(isNoteOpen || !!deliveryInstruction) && (
              <Animated.View entering={FadeIn.duration(200)}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="e.g. Leave at door, don't ring bell..."
                  placeholderTextColor={MUTED}
                  value={deliveryInstruction}
                  onChangeText={setDeliveryInstruction}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* ─── 3. Recommended Products ─── */}
        {filteredRecommendations.length > 0 && (
          <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.section}>
            <View style={styles.recHeaderRow}>
              <Sparkles size={14} color={PRIMARY} />
              <Text style={styles.sectionLabel}>YOU MAY ALSO LIKE</Text>
            </View>
            <FlatList
              data={filteredRecommendations}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item: product }) => (
                <View style={styles.recCard}>
                  <View style={styles.recImgWrap}>
                    <Image source={{ uri: product.imageURL }} style={styles.recImg} contentFit="cover" />
                    <View style={styles.recTypeBadge}>
                      <View style={[styles.recTypeDot, { backgroundColor: product.type === 'Veg' ? '#16a34a' : '#dc2626' }]} />
                      <Text style={styles.recTypeText}>{product.type === 'Veg' ? 'Veg' : 'Non-Veg'}</Text>
                    </View>
                  </View>
                  <View style={styles.recBody}>
                    <Text style={styles.recName} numberOfLines={2}>{product.name}</Text>
                    <View style={styles.recBottomRow}>
                      <Text style={styles.recPrice}>₹{product.variants?.[0]?.price || product.price || 0}</Text>
                      <TouchableOpacity 
                        style={styles.recAddBtn}
                        onPress={() => addItem({
                          _id: product._id,
                          name: product.name,
                          price: Number(product.variants?.[0]?.price || product.price || 0),
                          image: product.imageURL,
                          type: product.type,
                          category: typeof product.category === 'object' ? product.category?._id : product.category,
                        })}
                      >
                        <Text style={styles.recAddBtnText}>ADD</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            />
          </Animated.View>
        )}

        {/* ─── 4. Apply Coupon ─── */}
        <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.section}>
          <TicketCoupon />
        </Animated.View>

        {/* ─── 5. Bill Summary ─── */}
        <Animated.View entering={FadeIn.duration(400).delay(200)} style={styles.section}>
          <Text style={styles.sectionLabel}>BILL SUMMARY</Text>
          <View style={styles.card}>
            <View style={styles.billRow}>
              <Text style={styles.billKey}>Item total</Text>
              <Text style={styles.billVal}>₹{totalPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billKey}>Delivery fee</Text>
              <Text style={styles.billVal}>
                {deliveryFee > 0 ? `₹${deliveryFee.toFixed(2)}` : selectedAddress ? 'FREE' : '—'}
              </Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billKey}>GST (Total)</Text>
              <Text style={styles.billVal}>₹{tax.toFixed(2)}</Text>
            </View>
            {taxBreakdown && (taxBreakdown.cgstTotal > 0 || taxBreakdown.sgstTotal > 0) && (
              <View style={styles.taxSubBlock}>
                <View style={styles.billRowMini}>
                  <Text style={styles.billKeyMini}>CGST</Text>
                  <Text style={styles.billValMini}>₹{taxBreakdown.cgstTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.billRowMini}>
                  <Text style={styles.billKeyMini}>SGST</Text>
                  <Text style={styles.billValMini}>₹{taxBreakdown.sgstTotal.toFixed(2)}</Text>
                </View>
              </View>
            )}
            {taxBreakdown && taxBreakdown.igstTotal > 0 && (
              <View style={styles.taxSubBlock}>
                <View style={styles.billRowMini}>
                  <Text style={styles.billKeyMini}>IGST</Text>
                  <Text style={styles.billValMini}>₹{taxBreakdown.igstTotal.toFixed(2)}</Text>
                </View>
              </View>
            )}
            {discountAmount > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billKey, { color: SUCCESS }]}>Item Discount</Text>
                <Text style={[styles.billVal, { color: SUCCESS }]}>-₹{discountAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.billTotalDivider} />
            <View style={styles.billRow}>
              <Text style={styles.billTotalKey}>To Pay</Text>
              <Text style={styles.billTotalVal}>₹{finalPrice.toFixed(0)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── 6. Savings Banner ─── */}
        {discountAmount > 0 && (
          <Animated.View entering={FadeIn.duration(400).delay(250)} style={styles.section}>
            <View style={styles.savingsBanner}>
              <Text style={styles.savingsText}>
                🎉 You saved ₹{discountAmount.toFixed(0)} on this order!
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Bottom spacer for fixed bar */}
        <View style={{ height: 200 }} />
      </ScrollView>

      {/* ─── Fixed Bottom: Payment + Place Order ─── */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.fixedBottom}>
        {/* Payment method toggle */}
        <View style={styles.paymentToggleRow}>
          <TouchableOpacity 
            style={[styles.paymentToggle, paymentMethod === 'ONLINE' && styles.paymentToggleActive]}
            onPress={() => setPaymentMethod('ONLINE')}
          >
            <ReceiptText size={16} color={paymentMethod === 'ONLINE' ? PRIMARY : MUTED} strokeWidth={2.5} />
            <Text style={[styles.paymentToggleText, paymentMethod === 'ONLINE' && { color: PRIMARY }]}>
              Pay Online
            </Text>
            {paymentMethod === 'ONLINE' && <View style={styles.paymentActiveDot} />}
          </TouchableOpacity>

          <View style={{ width: 8 }} />

          <TouchableOpacity 
            style={[
              styles.paymentToggle, 
              paymentMethod === 'COD' && styles.paymentToggleActive,
              isCodDisabled && styles.paymentToggleDisabled,
            ]}
            onPress={() => !isCodDisabled && setPaymentMethod('COD')}
            disabled={isCodDisabled}
          >
            <Banknote size={16} color={isCodDisabled ? '#D1D5DB' : paymentMethod === 'COD' ? PRIMARY : MUTED} strokeWidth={2.5} />
            <Text style={[
              styles.paymentToggleText, 
              paymentMethod === 'COD' && { color: PRIMARY },
              isCodDisabled && { color: '#D1D5DB' },
            ]}>Cash</Text>
            {paymentMethod === 'COD' && !isCodDisabled && <View style={styles.paymentActiveDot} />}
          </TouchableOpacity>
        </View>
        {isCodDisabled && (
          <Text style={styles.codDisabledText}>{codDisableReason}</Text>
        )}

        {/* Place Order Button */}
        {isRestaurantClosed ? (
          <View style={styles.closedBanner}>
            <Text style={styles.closedBannerText}>Restaurant is currently closed</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.placeOrderBtn, isLoading && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handlePlaceOrder}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.loadingText}>
                  {isCartLoading ? 'Preparing Cart...' : 'Placing Order...'}
                </Text>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={styles.placeOrderLabel}>TOTAL</Text>
                  <Text style={styles.placeOrderAmount}>₹{finalPrice.toFixed(0)}</Text>
                </View>
                <View style={styles.placeOrderRight}>
                  <Text style={styles.placeOrderRightText}>
                    {paymentMethod === 'COD' ? 'Place Order' : 'Pay Now'}
                  </Text>
                  <Text style={styles.placeOrderArrow}>›</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 16,
    backgroundColor: CARD_BG, borderBottomWidth: 1, borderBottomColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_COLOR },
  backButton: { padding: 8, marginLeft: -8 },

  scrollContent: { paddingTop: 16, paddingBottom: 150 },

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel: { fontFamily: 'Inter-Black', fontSize: 11, color: MUTED, letterSpacing: 1.2, marginBottom: 10 },

  card: {
    backgroundColor: CARD_BG, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },

  // Address
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addressIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${PRIMARY}15`, alignItems: 'center', justifyContent: 'center' },
  addressBlock: { flex: 1 },
  addressType: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_COLOR, marginBottom: 3 },
  addressText: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED, lineHeight: 17 },
  changeBtn: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: `${PRIMARY}10`, borderRadius: 10, borderWidth: 1, borderColor: `${PRIMARY}30` },
  changeBtnText: { fontFamily: 'Inter-Bold', fontSize: 11, color: PRIMARY },

  addAddressCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: CARD_BG, borderRadius: 20, borderWidth: 2, borderColor: PRIMARY, borderStyle: 'dashed', gap: 14,
  },
  addAddressCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${PRIMARY}15`, alignItems: 'center', justifyContent: 'center' },
  addAddressTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: PRIMARY, marginBottom: 2 },
  addAddressSub: { fontFamily: 'Inter-Medium', fontSize: 11, color: MUTED },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  itemImg: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#F3F4F6' },
  itemInfo: { flex: 1 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  typeIcon: { width: 12, height: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  typeDot: { width: 5, height: 5, borderRadius: 2 },
  typeTriangle: { width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 5, borderLeftColor: 'transparent', borderRightColor: 'transparent', backgroundColor: 'transparent' },
  itemName: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: TEXT_COLOR, flex: 1 },
  itemVariant: { fontFamily: 'Inter-Medium', fontSize: 10, color: MUTED, marginBottom: 2 },
  itemBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  itemPrice: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_COLOR },
  itemUnitPrice: { fontFamily: 'Inter-Medium', fontSize: 10, color: MUTED },
  qtyControl: { flexDirection: 'row', alignItems: 'center', height: 28, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: BG },
  qtyBtn: { paddingHorizontal: 8, height: '100%', justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontFamily: 'Inter-Black', fontSize: 12, color: TEXT_COLOR, minWidth: 20, textAlign: 'center' },
  itemDivider: { height: 1, backgroundColor: BORDER },

  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 14 },
  addMoreText: { fontFamily: 'Inter-Bold', fontSize: 13, color: PRIMARY },

  // Notes & Cutlery
  notesCutleryDivider: { height: 1, backgroundColor: BORDER, marginTop: 14, marginBottom: 14, borderStyle: 'dashed' },
  notesCutleryRow: { flexDirection: 'row', gap: 8 },
  noteCutleryBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, 
    height: 36, borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: BG,
  },
  noteCutleryBtnActive: { borderColor: PRIMARY, backgroundColor: `${PRIMARY}08` },
  noteCutleryBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: MUTED },
  noteInput: { 
    marginTop: 12, fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_COLOR,
    backgroundColor: BG, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    minHeight: 80, 
  },

  // Recommendations
  recHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  recCard: { width: 140, borderRadius: 14, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  recImgWrap: { height: 96, backgroundColor: '#F3F4F6', position: 'relative' },
  recImg: { width: '100%', height: '100%' },
  recTypeBadge: { 
    position: 'absolute', top: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  recTypeDot: { width: 5, height: 5, borderRadius: 3 },
  recTypeText: { fontFamily: 'Inter-Bold', fontSize: 8, color: '#FFFFFF' },
  recBody: { padding: 8, flex: 1, justifyContent: 'space-between' },
  recName: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_COLOR, lineHeight: 15, marginBottom: 8 },
  recBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: `${BORDER}80`, paddingTop: 6 },
  recPrice: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_COLOR },
  recAddBtn: { 
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', 
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  recAddBtnText: { fontFamily: 'Inter-Black', fontSize: 9, color: '#15803D', letterSpacing: 0.5 },

  // Bill
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  billKey: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED },
  billVal: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: TEXT_COLOR },
  taxSubBlock: { marginLeft: 14, borderLeftWidth: 2, borderLeftColor: BORDER, paddingLeft: 12, marginBottom: 10 },
  billRowMini: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  billKeyMini: { fontFamily: 'Inter-Medium', fontSize: 11, color: `${MUTED}CC` },
  billValMini: { fontFamily: 'Inter-Medium', fontSize: 11, color: `${MUTED}CC` },
  billTotalDivider: { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: BORDER, marginVertical: 12 },
  billTotalKey: { fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_COLOR },
  billTotalVal: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_COLOR },

  // Savings
  savingsBanner: { backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#BBF7D0' },
  savingsText: { fontFamily: 'Inter-Bold', fontSize: 13, color: SUCCESS },

  // Fixed Bottom
  fixedBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: CARD_BG, borderTopWidth: 1, borderTopColor: BORDER,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: -6 }, elevation: 20,
  },
  paymentToggleRow: { flexDirection: 'row', marginBottom: 12 },
  paymentToggle: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
  },
  paymentToggleActive: { borderColor: PRIMARY, backgroundColor: `${PRIMARY}08` },
  paymentToggleDisabled: { opacity: 0.5, backgroundColor: '#F9FAFB' },
  paymentToggleText: { fontFamily: 'Inter-Bold', fontSize: 12, color: MUTED },
  paymentActiveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: PRIMARY, marginLeft: 2 },
  codDisabledText: { fontFamily: 'Inter-Bold', fontSize: 9, color: '#DC2626', textAlign: 'center', marginTop: -8, marginBottom: 8 },

  closedBanner: { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, alignItems: 'center' },
  closedBannerText: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#DC2626' },

  placeOrderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  placeOrderLabel: { fontFamily: 'Inter-Black', fontSize: 12, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' },
  placeOrderAmount: { fontFamily: 'Inter-Black', fontSize: 20, color: '#FFFFFF' },
  placeOrderRight: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
  },
  placeOrderRightText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#FFFFFF' },
  placeOrderArrow: { fontFamily: 'Inter-Black', fontSize: 20, color: '#FFFFFF', lineHeight: 22 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flex: 1, paddingVertical: 4 },
  loadingText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#FFFFFF' },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_COLOR, marginBottom: 8 },
  emptyDesc: { fontFamily: 'Inter-Medium', fontSize: 14, color: MUTED, textAlign: 'center' },
  browsePrimaryBtn: { marginTop: 24, backgroundColor: PRIMARY, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  browsePrimaryBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: '#FFFFFF' },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Truck, ChevronRight, CheckCircle2, Circle, Banknote, ReceiptText, Home, Briefcase, Plus } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useCartStore } from '../store/useCartStore';
import { useLocationStore } from '../store/useLocationStore';
import { orderApi } from '../services/api';

const PRIMARY = '#FC8019';
const TEXT_COLOR = '#1A1A1A';
const MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';
const BG = '#F9FAFB';

export default function CheckoutScreen() {
  const router = useRouter();

  const { items, totalPrice, discountAmount, finalPrice, tax, taxBreakdown, clearCart } = useCartStore();
  const { selectedAddress } = useLocationStore();

  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Online'>('COD');
  const [isPlacing, setIsPlacing] = useState(false);

  // Hardcode delivery fee for now to match exactly what is mapped. In actual, it could be derived from Cart API
  const deliveryFee = 0; 

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Address missing', 'Please select a delivery address');
      return;
    }

    if (paymentMethod === 'Online') {
      Alert.alert('Coming Soon', 'Online payment via Razorpay natively is coming soon! Please use Cash on Delivery for this release.');
      setPaymentMethod('COD');
      return;
    }

    try {
      setIsPlacing(true);
      
      const payload = {
        deliveryAddress: selectedAddress._id || selectedAddress.id,
        paymentMethod: 'COD',
        deliveryInstruction: deliveryInstructions.trim(),
        totalAmount: totalPrice,
        discountApplied: discountAmount,
        finalAmount: finalPrice,
        deliveryFee,
        items: items.map(i => ({
          product: i._id,
          quantity: i.quantity,
          variant: i.variant || "Standard",
          price: i.price
        }))
      };

      const res = await orderApi.placeOrder(payload);
      
      await clearCart();
      const orderId = res.data?.order?._id || res.data?._id;
      
      // Navigate to order details tracking page
      router.replace(`/(tabs)/orders/${orderId}`);
    } catch (err: any) {
      Alert.alert('Order Failed', err.response?.data?.message || 'Failed to place order');
    } finally {
      setIsPlacing(false);
    }
  };

  const getAddressIcon = (type: string) => {
    if (type === 'HOME') return <Home size={20} color={PRIMARY} />;
    if (type === 'WORK') return <Briefcase size={20} color={PRIMARY} />;
    return <MapPin size={20} color={PRIMARY} />;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={TEXT_COLOR} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Delivery Address Section */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={styles.sectionHeader}>DELIVERY ADDRESS</Text>
          {selectedAddress ? (
            <View style={styles.card}>
              <View style={styles.addressRow}>
                <View style={styles.addressIconWrap}>
                  {getAddressIcon(selectedAddress.type)}
                </View>
                <View style={styles.addressBlock}>
                  <Text style={styles.addressType}>{selectedAddress.type}</Text>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {selectedAddress.addressLine1}, {selectedAddress.city} - {selectedAddress.postalCode}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/addresses')} style={styles.changeBtn}>
                  <Text style={styles.changeBtnText}>CHANGE</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.instructionWrap}>
                <TextInput
                  style={styles.instructionInput}
                  placeholder="App instructions (e.g. Ring the bell)"
                  placeholderTextColor={MUTED}
                  value={deliveryInstructions}
                  onChangeText={setDeliveryInstructions}
                />
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => router.push('/addresses')} style={styles.addAddressCard}>
              <View style={styles.addAddressCircle}>
                <Plus size={24} color={PRIMARY} />
              </View>
              <View>
                <Text style={styles.addAddressTitle}>Add New Address</Text>
                <Text style={styles.addAddressSub}>Provide a location to deliver your food</Text>
              </View>
              <ChevronRight size={20} color={PRIMARY} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Payment Method */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <Text style={styles.sectionHeader}>PAYMENT METHOD</Text>
          <View style={styles.card}>
            
            <TouchableOpacity 
              style={[styles.paymentRow, paymentMethod === 'Online' && styles.paymentRowActive]}
              onPress={() => setPaymentMethod('Online')}
            >
              <View style={[styles.paymentIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <ReceiptText size={20} color="#3B82F6" />
              </View>
              <View style={styles.paymentBlock}>
                <Text style={styles.paymentTitle}>Pay Online</Text>
                <Text style={styles.paymentSub}>Credit, Debit, Netbanking, UPI</Text>
              </View>
              <View style={styles.radio}>
                {paymentMethod === 'Online' && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={[styles.paymentRow, paymentMethod === 'COD' && styles.paymentRowActive]}
              onPress={() => setPaymentMethod('COD')}
            >
              <View style={[styles.paymentIconWrap, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                <Banknote size={20} color="#22C55E" />
              </View>
              <View style={styles.paymentBlock}>
                <Text style={styles.paymentTitle}>Cash on Delivery</Text>
                <Text style={styles.paymentSub}>Pay exactly when you receive</Text>
              </View>
              <View style={styles.radio}>
                {paymentMethod === 'COD' && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>

          </View>
        </Animated.View>

        {/* Bill Details matches the exact Web calculation */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <Text style={styles.sectionHeader}>BILL DETAILS</Text>
          <View style={styles.card}>
            <View style={styles.billRow}>
              <Text style={styles.billKey}>Item Total</Text>
              <Text style={styles.billVal}>₹{totalPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billKey}>Delivery Fee</Text>
              <Text style={styles.billVal}>₹{deliveryFee.toFixed(2)}</Text>
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

            {discountAmount > 0 && (
              <View style={styles.billRow}>
                <Text style={[styles.billKey, { color: '#16a34a' }]}>Item Discount</Text>
                <Text style={[styles.billVal, { color: '#16a34a' }]}>-₹{discountAmount.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.billDivider} />
            
            <View style={styles.billRow}>
              <Text style={styles.billTotalKey}>To Pay</Text>
              <Text style={styles.billTotalVal}>₹{finalPrice.toFixed(0)}</Text>
            </View>
          </View>
        </Animated.View>

      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View entering={FadeInUp.duration(400)} style={styles.fixedBottom}>
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.bottomTotalKey}>PAY USING {paymentMethod}</Text>
            <Text style={styles.bottomTotalVal}>₹{finalPrice.toFixed(0)}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.checkoutBtn, isPlacing && { opacity: 0.7 }]}
            activeOpacity={0.8}
            onPress={handlePlaceOrder}
            disabled={isPlacing}
          >
            {isPlacing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.checkoutBtnText}>PLACE ORDER</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_COLOR },
  backButton: { padding: 8, marginLeft: -8 },
  
  scrollContent: { paddingVertical: 20, paddingBottom: 120 },
  
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: { fontFamily: 'Inter-Bold', fontSize: 13, color: MUTED, marginBottom: 8, letterSpacing: 0.5 },
  
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  
  // Address
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addressIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(252, 128, 25, 0.1)', alignItems: 'center', justifyContent: 'center' },
  addressBlock: { flex: 1 },
  addressType: { fontFamily: 'Inter-Bold', fontSize: 15, color: TEXT_COLOR, marginBottom: 2 },
  addressText: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED, lineHeight: 18 },
  changeBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(252, 128, 25, 0.1)', borderRadius: 8 },
  changeBtnText: { fontFamily: 'Inter-Bold', fontSize: 12, color: PRIMARY },
  instructionWrap: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER, borderStyle: 'dashed' },
  instructionInput: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_COLOR, backgroundColor: BG, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },

  addAddressCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: PRIMARY, borderStyle: 'dashed',
    gap: 16
  },
  addAddressCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(252, 128, 25, 0.1)', alignItems: 'center', justifyContent: 'center' },
  addAddressTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: PRIMARY, marginBottom: 2 },
  addAddressSub: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED },

  // Payments
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  paymentRowActive: { opacity: 1 },
  paymentIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paymentBlock: { flex: 1 },
  paymentTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: TEXT_COLOR, marginBottom: 2 },
  paymentSub: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: PRIMARY },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },

  // Bill
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  billKey: { fontFamily: 'Inter-Medium', fontSize: 14, color: MUTED },
  billVal: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_COLOR },
  
  taxSubBlock: { marginLeft: 16, borderLeftWidth: 2, borderLeftColor: BORDER, paddingLeft: 12, marginBottom: 12 },
  billRowMini: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  billKeyMini: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED },
  billValMini: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED },

  billDivider: { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: BORDER, marginVertical: 12 },
  billTotalKey: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_COLOR },
  billTotalVal: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_COLOR },

  // Fixed Bottom
  fixedBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: BORDER,
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 20,
  },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottomTotalKey: { fontFamily: 'Inter-Bold', fontSize: 11, color: MUTED, letterSpacing: 0.5 },
  bottomTotalVal: { fontFamily: 'Inter-Black', fontSize: 24, color: TEXT_COLOR },
  checkoutBtn: {
    backgroundColor: PRIMARY, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  checkoutBtnText: { fontFamily: 'Inter-Black', fontSize: 15, color: '#FFFFFF', letterSpacing: 0.5 },
});

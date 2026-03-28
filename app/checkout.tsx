import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Truck, ChevronRight, CheckCircle2, Circle } from 'lucide-react-native';
import { useCartStore } from '../store/useCartStore';
import { useLocationStore } from '../store/useLocationStore';
import { useTheme } from '../constants/ThemeContext';
import { Button } from '../components/ui/Button';
import { orderApi } from '../services/api';

export default function CheckoutScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const { items, finalPrice, clearCart } = useCartStore();
  const { selectedAddress } = useLocationStore();

  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Online'>('COD');
  const [isPlacing, setIsPlacing] = useState(false);

  // Hardcode delivery fee for simplicity (should come from backend)
  const deliveryFee = 0;
  const toPay = finalPrice + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Address missing', 'Please select a delivery address');
      return;
    }

    if (paymentMethod === 'Online') {
      Alert.alert('Hold on!', 'Online payment via Razorpay will be integrated shortly. Please use COD for now.');
      setPaymentMethod('COD');
      return;
    }

    try {
      setIsPlacing(true);
      const payload = {
        deliveryAddress: selectedAddress._id || selectedAddress.id,
        paymentMethod: 'COD',
        deliveryInstructions,
      };

      const res = await orderApi.placeOrder(payload);
      
      // Clear cart on success
      await clearCart();
      
      // Redirect to order details
      router.replace(`/(tabs)/orders`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to place order');
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Address Selection Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery Address</Text>
          </View>

          {selectedAddress ? (
            <View style={[styles.addressBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.addressLeft}>
                <Text style={[styles.addressType, { color: colors.foreground }]}>{selectedAddress.type}</Text>
                <Text style={[styles.addressText, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {selectedAddress.addressLine1}, {selectedAddress.city}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/addresses')} style={{ padding: 4 }}>
                <Text style={[styles.changeText, { color: colors.primary }]}>CHANGE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/addresses')}
              style={[styles.addAddressBtn, { borderColor: colors.primary, borderStyle: 'dashed' }]}
            >
              <Text style={[styles.addAddressText, { color: colors.primary }]}>+ Add new address</Text>
              <ChevronRight size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Delivery Instructions Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Truck size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery Instructions (Optional)</Text>
          </View>
          <TextInput
            style={[styles.instructionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="e.g. Leave at the door, Ring the bell"
            placeholderTextColor={colors.mutedForeground}
            value={deliveryInstructions}
            onChangeText={setDeliveryInstructions}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Payment Method Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 16 }]}>Payment Method</Text>

          <TouchableOpacity
            style={[styles.paymentOption, { borderColor: paymentMethod === 'COD' ? colors.primary : colors.border, backgroundColor: paymentMethod === 'COD' ? colors.primary + '10' : colors.card }]}
            onPress={() => setPaymentMethod('COD')}
          >
            <View style={styles.paymentLeft}>
              {paymentMethod === 'COD' ? (
                <CheckCircle2 size={24} color={colors.primary} />
              ) : (
                <Circle size={24} color={colors.mutedForeground} />
              )}
              <View>
                <Text style={[styles.paymentTitle, { color: colors.foreground }]}>Cash on Delivery (COD)</Text>
                <Text style={[styles.paymentSub, { color: colors.mutedForeground }]}>Pay with cash or UPI at doorstep</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, { borderColor: paymentMethod === 'Online' ? colors.primary : colors.border, backgroundColor: paymentMethod === 'Online' ? colors.primary + '10' : colors.card }]}
            onPress={() => setPaymentMethod('Online')}
          >
            <View style={styles.paymentLeft}>
              {paymentMethod === 'Online' ? (
                <CheckCircle2 size={24} color={colors.primary} />
              ) : (
                <Circle size={24} color={colors.mutedForeground} />
              )}
              <View>
                <Text style={[styles.paymentTitle, { color: colors.foreground }]}>Pay Online (Razorpay)</Text>
                <Text style={[styles.paymentSub, { color: colors.mutedForeground }]}>Credit/Debit Cards, UPI, Wallets</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.toPayBox}>
          <Text style={[styles.toPaySub, { color: colors.mutedForeground }]}>Total to Pay</Text>
          <Text style={[styles.toPayAmount, { color: colors.foreground }]}>₹{toPay.toFixed(2)}</Text>
        </View>
        
        <Button
          title={`PLACE ORDER`}
          onPress={handlePlaceOrder}
          disabled={!selectedAddress}
          isLoading={isPlacing}
          style={styles.placeOrderBtn}
        />
      </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  addressBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  addressLeft: {
    flex: 1,
    marginRight: 16,
  },
  addressType: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    marginBottom: 4,
  },
  addressText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    lineHeight: 18,
  },
  changeText: {
    fontFamily: 'Inter-ExtraBold',
    fontSize: 12,
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1.5,
    borderRadius: 12,
  },
  addAddressText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  instructionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  paymentOption: {
    padding: 16,
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  paymentTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    marginBottom: 4,
  },
  paymentSub: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 36, // Safe area
    borderTopWidth: 1,
    gap: 24,
  },
  toPayBox: {
    flex: 1,
  },
  toPaySub: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginBottom: 2,
  },
  toPayAmount: {
    fontFamily: 'Inter-Black',
    fontSize: 20,
  },
  placeOrderBtn: {
    flex: 2,
  },
});

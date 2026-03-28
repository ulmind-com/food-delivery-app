import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Tag, BadgePercent, X } from 'lucide-react-native';
import { useTheme } from '../constants/ThemeContext';
import { useCartStore } from '../store/useCartStore';

export function TicketCoupon() {
  const { colors, isDark } = useTheme();
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { appliedCoupon, applyCoupon, removeCoupon } = useCartStore();

  const handleApply = async () => {
    if (!couponCode.trim()) return;
    try {
      setLoading(true);
      setError('');
      await applyCoupon(couponCode.toUpperCase().trim());
      setCouponCode('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid coupon code');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    try {
      setLoading(true);
      await removeCoupon();
    } catch (err) {
      console.log('Error removing coupon', err);
    } finally {
      setLoading(false);
    }
  };

  if (appliedCoupon) {
    return (
      <View style={[styles.appliedContainer, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#ecfdf5', borderColor: colors.success }]}>
        <View style={styles.appliedLeft}>
          <View style={[styles.iconBox, { backgroundColor: colors.success }]}>
            <BadgePercent size={18} color="#fff" />
          </View>
          <View>
            <Text style={[styles.codeText, { color: colors.success }]}>
              {appliedCoupon.code} <Text style={styles.appliedText}>applied</Text>
            </Text>
            <Text style={[styles.discountText, { color: colors.success }]}>
              You saved ₹{Math.round(appliedCoupon.discountAmount)}!
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleRemove} disabled={loading} style={styles.removeBtn}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.success} />
          ) : (
            <X size={18} color={colors.success} />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.border }]}>
        <Tag size={18} color={colors.mutedForeground} style={styles.tagIcon} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder="Enter Coupon Code"
          placeholderTextColor={colors.mutedForeground}
          value={couponCode}
          onChangeText={(text) => {
            setCouponCode(text);
            if (error) setError('');
          }}
          autoCapitalize="characters"
        />
        <TouchableOpacity 
          onPress={handleApply} 
          disabled={!couponCode.trim() || loading}
          style={[styles.applyBtn, { opacity: !couponCode.trim() || loading ? 0.5 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.applyText, { color: colors.primary }]}>APPLY</Text>
          )}
        </TouchableOpacity>
      </View>
      {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 12,
  },
  tagIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    height: '100%',
  },
  applyBtn: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
  },
  applyText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  appliedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  appliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontFamily: 'Inter-Black',
    fontSize: 14,
  },
  appliedText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  discountText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
  removeBtn: {
    padding: 8,
  },
});

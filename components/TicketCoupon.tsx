import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Percent, CheckCircle2, Ticket, X, Copy, Sparkles } from 'lucide-react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useTheme } from '../constants/ThemeContext';
import { useCartStore } from '../store/useCartStore';
import { couponApi } from '../services/api';

const PRIMARY = '#FC8019';

export function TicketCoupon() {
  const { colors, isDark } = useTheme();
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [fetchingCoupons, setFetchingCoupons] = useState(true);
  
  const { appliedCoupon, applyCoupon, removeCoupon, totalPrice } = useCartStore();

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await couponApi.getAll();
      setAvailableCoupons(res.data);
      if (res.data.length === 0) {
        setShowManualInput(true);
      }
    } catch (e) {
      console.log('Failed to fetch coupons', e);
      setShowManualInput(true);
    } finally {
      setFetchingCoupons(false);
    }
  };

  const handleApply = async (codeToApply = couponCode) => {
    if (!codeToApply.trim()) return;
    try {
      setLoading(true);
      setError('');
      await applyCoupon(codeToApply.toUpperCase().trim());
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

  const isExpired = (c: any) => {
    if (!c.isActive) return true;
    if (c.validUntil && new Date(c.validUntil) < new Date()) return true;
    return false;
  };

  const isEligible = (c: any) => {
    if (isExpired(c)) return false;
    if (c.minOrderValue && totalPrice < c.minOrderValue) return false;
    return true;
  };

  const getShortfall = (c: any) => {
    if (c.minOrderValue && totalPrice < c.minOrderValue) {
      return c.minOrderValue - totalPrice;
    }
    return 0;
  };

  const bestCoupon = useMemo(() => {
    if (!availableCoupons || availableCoupons.length === 0) return null;
    const valid = availableCoupons.filter((c: any) => !isExpired(c));
    if (valid.length === 0) return null;
    return valid.reduce((best: any, c: any) => {
      const bestVal = best.discountType === "PERCENTAGE" ? best.discountPercent : best.discountAmount;
      const cVal = c.discountType === "PERCENTAGE" ? c.discountPercent : c.discountAmount;
      return cVal > (bestVal || 0) ? c : best;
    }, valid[0]);
  }, [availableCoupons]);

  // APPLIED STATE
  if (appliedCoupon) {
    return (
      <Animated.View entering={FadeInDown.springify()} style={[styles.appliedWrapper, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#ecfdf5', borderColor: '#86efac' }]}>
        <View style={styles.appliedContent}>
          <View style={styles.appliedLeft}>
            <Sparkles size={16} color="#16a34a" />
            <View>
              <Text style={[styles.codeText, { color: '#16a34a' }]}>
                "{appliedCoupon.code}" <Text style={styles.appliedText}>applied!</Text>
              </Text>
              <Text style={[styles.discountText, { color: '#15803d' }]}>
                You save ₹{Math.round(appliedCoupon.discountAmount)}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleRemove} disabled={loading} style={styles.removeBtn}>
            {loading ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : (
             <View style={styles.removeIconBg}>
                <X size={16} color="#15803d" />
             </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // Determine colors based on eligibility
  const eligible = bestCoupon && isEligible(bestCoupon);
  const bgColor = eligible ? '#FBBF24' : (isDark ? '#1F2937' : '#F3F4F6'); // Amber for eligible, grey for muted
  const textColor = eligible ? '#451A03' : '#6B7280'; // Dark amber vs muted foreground
  const lightTextColor = eligible ? '#78350F' : '#9CA3AF'; // Amber/80 vs lighter grey
  const minOrderTextColor = eligible ? '#78350F99' : '#9CA3AF'; // Amber/60
  
  return (
    <View style={styles.container}>
      {/* ─── BEST OFFER TICKET (Matches web OP design perfectly) ─── */}
      {!fetchingCoupons && bestCoupon && !showManualInput && (
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={[styles.bestOfferCard, { backgroundColor: bgColor }]}>
            {/* Notches logic to blend with background (usually white) */}
            <View style={[styles.notch, styles.notchLeft, { backgroundColor: colors.background }]} />
            <View style={[styles.notch, styles.notchRight, { backgroundColor: colors.background }]} />

            <View style={styles.bestOfferInner}>
              <View style={styles.bestOfferLeft}>
                <View style={styles.bestOfferHeader}>
                  <Ticket size={14} color={lightTextColor} />
                  <Text style={[styles.bestOfferTag, { color: lightTextColor }]}>BEST OFFER</Text>
                </View>
                <Text style={[styles.bestOfferTitle, { color: textColor }]}>
                  {bestCoupon.discountType === 'PERCENTAGE' 
                    ? `${bestCoupon.discountPercent}% OFF` 
                    : `₹${bestCoupon.discountAmount} OFF`}
                </Text>
                {bestCoupon.name && (
                  <Text style={[styles.bestOfferSub, { color: lightTextColor }]}>{bestCoupon.name}</Text>
                )}
                {bestCoupon.minOrderValue > 0 && (
                  <Text style={[styles.bestOfferMinOrder, { color: minOrderTextColor }]}>
                    On orders above ₹{bestCoupon.minOrderValue}
                  </Text>
                )}
              </View>

              {/* Vertical Dashed Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.dashedDivider, { borderColor: eligible ? 'rgba(120, 53, 15, 0.25)' : (isDark ? '#374151' : '#D1D5DB') }]} />
              </View>

              <View style={styles.bestOfferRight}>
                <View style={styles.rightContentWrap}>
                  <View 
                    style={[styles.codeRow, { backgroundColor: eligible ? 'rgba(254, 243, 199, 0.5)' : (isDark ? '#374151' : '#E5E7EB') }]}
                  >
                    <Text style={[styles.bestOfferCode, { color: textColor }]}>{bestCoupon.code}</Text>
                    <Copy size={12} color={textColor} style={{ opacity: 0.6 }} />
                  </View>
                  
                  {eligible ? (
                    <TouchableOpacity 
                      onPress={() => handleApply(bestCoupon.code)}
                      disabled={loading}
                      style={styles.applyActionBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.applyActionText}>APPLY</Text>
                    </TouchableOpacity>
                  ) : isExpired(bestCoupon) ? (
                    <Text style={styles.expiredText}>EXPIRED</Text>
                  ) : (
                    <Text style={styles.shortfallText}>
                      +₹{getShortfall(bestCoupon).toFixed(0)} more
                    </Text>
                  )}
                </View>
              </View>
            </View>
            
            {/* Loading overlay during apply */}
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={textColor} />
              </View>
            )}
          </View>
          
          <TouchableOpacity onPress={() => setShowManualInput(true)} style={styles.haveDifferentCodeWrap}>
            <Text style={styles.haveDifferentCodeText}>Have a different code?</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ─── MANUAL INPUT ─── */}
      {(showManualInput || (!fetchingCoupons && !bestCoupon)) && (
        <Animated.View entering={SlideInDown.duration(300)}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: error ? '#EF4444' : colors.border }]}>
            <View style={styles.inputLeft}>
              <Percent size={20} color={PRIMARY} style={styles.tagIcon} />
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
            </View>
            <TouchableOpacity 
              onPress={() => handleApply()} 
              disabled={!couponCode.trim() || loading}
              style={[styles.applyBtn, { opacity: !couponCode.trim() || loading ? 0.5 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={PRIMARY} />
              ) : (
                <Text style={[styles.applyText, { color: PRIMARY }]}>APPLY</Text>
              )}
            </TouchableOpacity>
          </View>
          {error ? (
            <Animated.Text entering={FadeInDown.duration(200)} style={styles.errorText}>{error}</Animated.Text>
          ) : null}
          
          {bestCoupon && (
            <TouchableOpacity onPress={() => setShowManualInput(false)} style={styles.haveDifferentCodeWrap} activeOpacity={0.6}>
              <Text style={styles.haveDifferentCodeText}>Hide code</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  
  // BEST OFFER CARD
  bestOfferCard: {
    position: 'relative',
    borderRadius: 16,
    borderWidth: 0,
  },
  bestOfferInner: {
    flexDirection: 'row',
  },
  bestOfferLeft: {
    flex: 1,
    paddingLeft: 24,
    paddingRight: 10,
    paddingVertical: 18,
    justifyContent: 'center',
  },
  bestOfferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bestOfferTag: {
    fontFamily: 'Inter-Black',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  bestOfferTitle: {
    fontFamily: 'Inter-Black',
    fontSize: 24,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  bestOfferSub: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    marginBottom: 2,
  },
  bestOfferMinOrder: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },
  dividerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dashedDivider: {
    width: 1,
    height: '100%',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  bestOfferRight: {
    width: 110,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  rightContentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bestOfferCode: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  applyActionBtn: {
    backgroundColor: '#451A03',
    width: '100%',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyActionText: {
    fontFamily: 'Inter-Black',
    fontSize: 11,
    color: '#FEF3C7',
  },
  shortfallText: {
    fontFamily: 'Inter-Black',
    fontSize: 11,
    color: PRIMARY,
  },
  expiredText: {
    fontFamily: 'Inter-Black',
    fontSize: 10,
    color: '#78350F',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    borderRadius: 16,
  },
  haveDifferentCodeWrap: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  haveDifferentCodeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: PRIMARY,
    textDecorationLine: 'underline',
  },

  // MANUAL INPUT
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingLeft: 12,
    paddingRight: 6,
  },
  inputLeft: {
    flexDirection: 'row', alignItems: 'center', flex: 1, height: '100%'
  },
  tagIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    height: '100%',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  applyBtn: {
    paddingHorizontal: 16,
    height: 36,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: PRIMARY,
  },
  applyText: {
    fontFamily: 'Inter-Black',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 12,
  },
  
  // Applied State
  appliedWrapper: {
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    padding: 16,
  },
  appliedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontFamily: 'Inter-Black', fontSize: 13,
  },
  appliedText: {
    fontFamily: 'Inter-Bold', fontSize: 13,
  },
  discountText: {
    fontFamily: 'Inter-Medium', fontSize: 11, marginTop: 1,
  },
  removeBtn: {
    padding: 6,
  },
  removeIconBg: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    padding: 4,
    borderRadius: 6,
  },
  notch: {
    position: 'absolute', top: '50%', marginTop: -12,
    width: 24, height: 24, borderRadius: 12,
    zIndex: 10,
  },
  notchLeft: { left: -12 },
  notchRight: { right: -12 },
});

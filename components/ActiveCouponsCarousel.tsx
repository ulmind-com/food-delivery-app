import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Dimensions, Clipboard, Platform,
} from 'react-native';
import { Tag, Copy, CheckCircle, Percent, Gift, Zap, Clock } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { couponApi } from '../services/api';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const COUPON_WIDTH = width * 0.78;

interface Coupon {
  _id: string;
  code: string;
  name?: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountAmount: number;
  discountPercent?: number;
  maxDiscountAmount?: number;
  minOrderValue?: number;
  validUntil?: string;
  isActive: boolean;
}

// Color schemes for coupon cards
const COUPON_THEMES = [
  { bg: '#FC8019', bgLight: '#FFF3E0', accent: '#E85D00', icon: <Zap size={24} color="#FFF" /> },
  { bg: '#16a34a', bgLight: '#F0FDF4', accent: '#15803d', icon: <Gift size={24} color="#FFF" /> },
  { bg: '#7C3AED', bgLight: '#F3E8FF', accent: '#6D28D9', icon: <Percent size={24} color="#FFF" /> },
  { bg: '#0EA5E9', bgLight: '#E0F2FE', accent: '#0284C7', icon: <Tag size={24} color="#FFF" /> },
  { bg: '#DC2626', bgLight: '#FEF2F2', accent: '#B91C1C', icon: <Zap size={24} color="#FFF" /> },
];

function CouponCard({ coupon, index }: { coupon: Coupon; index: number }) {
  const [copied, setCopied] = useState(false);
  const theme = COUPON_THEMES[index % COUPON_THEMES.length];

  const handleCopy = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(coupon.code);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const discountText = coupon.discountType === 'PERCENTAGE'
    ? `${coupon.discountPercent || coupon.discountAmount}% OFF`
    : `₹${coupon.discountAmount} OFF`;

  const validDate = coupon.validUntil
    ? new Date(coupon.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null;

  return (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(400)}>
      <Pressable style={[styles.couponCard, { width: COUPON_WIDTH }]}>
        {/* Left colored strip */}
        <View style={[styles.couponStrip, { backgroundColor: theme.bg }]}>
          <View style={styles.couponIconWrap}>
            {theme.icon}
          </View>
          <Text style={styles.couponDiscount}>{discountText}</Text>
        </View>

        {/* Dashed separator line */}
        <View style={styles.dashedLine}>
          {[...Array(12)].map((_, i) => (
            <View key={i} style={[styles.dash, { backgroundColor: theme.bg + '40' }]} />
          ))}
        </View>

        {/* Right content */}
        <View style={styles.couponContent}>
          <Text style={styles.couponName} numberOfLines={1}>
            {coupon.name || discountText}
          </Text>
          <Text style={styles.couponDesc} numberOfLines={1}>
            {coupon.description || (coupon.minOrderValue ? `Min order ₹${coupon.minOrderValue}` : 'No minimum order')}
          </Text>

          {/* Code + Copy Row */}
          <View style={styles.codeRow}>
            <View style={[styles.codePill, { backgroundColor: theme.bgLight, borderColor: theme.bg + '30' }]}>
              <Text style={[styles.codeText, { color: theme.accent }]}>{coupon.code}</Text>
            </View>
            <Pressable
              onPress={handleCopy}
              style={[styles.copyBtn, copied && { backgroundColor: '#DCFCE7' }]}
            >
              {copied ? (
                <CheckCircle size={14} color="#16a34a" />
              ) : (
                <Copy size={14} color={theme.accent} />
              )}
              <Text style={[styles.copyText, { color: copied ? '#16a34a' : theme.accent }]}>
                {copied ? 'Copied!' : 'COPY'}
              </Text>
            </Pressable>
          </View>

          {/* Validity */}
          {validDate && (
            <View style={styles.validRow}>
              <Clock size={11} color="#93959F" />
              <Text style={styles.validText}>Valid till {validDate}</Text>
            </View>
          )}
        </View>

        {/* Decorative notches */}
        <View style={[styles.notchTop, { backgroundColor: '#FFFCF7' }]} />
        <View style={[styles.notchBottom, { backgroundColor: '#FFFCF7' }]} />
      </Pressable>
    </Animated.View>
  );
}

export function ActiveCouponsCarousel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await couponApi.getAll();
        const data = res.data?.coupons || res.data || [];
        // Filter only active coupons
        const active = Array.isArray(data)
          ? data.filter((c: Coupon) => c.isActive !== false)
          : [];
        setCoupons(active);
      } catch (e) {
        console.log('No coupons available (user may not be logged in)');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Don't render anything if no active coupons
  if (loading || coupons.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionBullet} />
        <Text style={styles.sectionTitle}>Offers for you 🎁</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{coupons.length}</Text>
        </View>
      </View>

      {/* Horizontal Carousel */}
      <FlatList
        data={coupons}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => (
          <CouponCard coupon={item} index={index} />
        )}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12, gap: 8,
  },
  sectionBullet: {
    width: 4, height: 18, borderRadius: 2, backgroundColor: PRIMARY,
  },
  sectionTitle: {
    fontFamily: 'Inter-ExtraBold', fontSize: 19, color: '#3D4152', letterSpacing: -0.3,
  },
  countPill: {
    backgroundColor: PRIMARY + '15', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  countText: {
    fontFamily: 'Inter-Bold', fontSize: 12, color: PRIMARY,
  },
  carouselContent: { paddingHorizontal: 16, gap: 12 },
  // Card
  couponCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    minHeight: 110, position: 'relative',
  },
  couponStrip: {
    width: 70, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12,
  },
  couponIconWrap: { marginBottom: 6 },
  couponDiscount: {
    fontFamily: 'Inter-Black', fontSize: 12, color: '#FFF',
    textAlign: 'center', letterSpacing: 0.5,
  },
  dashedLine: {
    width: 1, justifyContent: 'center', alignItems: 'center',
    gap: 3, paddingVertical: 8,
  },
  dash: { width: 1, height: 4, borderRadius: 1 },
  couponContent: {
    flex: 1, padding: 12, justifyContent: 'center',
  },
  couponName: {
    fontFamily: 'Inter-Bold', fontSize: 14, color: '#3D4152', marginBottom: 2,
  },
  couponDesc: {
    fontFamily: 'Inter-Medium', fontSize: 11, color: '#93959F', marginBottom: 8,
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codePill: {
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  codeText: { fontFamily: 'Inter-Black', fontSize: 12, letterSpacing: 1 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#F7F7F7',
  },
  copyText: { fontFamily: 'Inter-Bold', fontSize: 10 },
  validRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
  },
  validText: { fontFamily: 'Inter-Medium', fontSize: 10, color: '#93959F' },
  // Notches (ticket effect)
  notchTop: {
    position: 'absolute', top: -8, left: 62,
    width: 16, height: 16, borderRadius: 8,
  },
  notchBottom: {
    position: 'absolute', bottom: -8, left: 62,
    width: 16, height: 16, borderRadius: 8,
  },
});

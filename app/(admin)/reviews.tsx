import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reviewApi } from '../../services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Star, MessageSquare, TrendingUp, Users } from 'lucide-react-native';
import { Image } from 'expo-image';
import { resolveImageURL } from '../../lib/image-utils';
import { SkeletonCard } from '../../components/Skeleton';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const ACCENT = '#F59E0B'; // Amber for Reviews

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

const Stars = ({ rating, size = 13 }: { rating: number; size?: number }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={size}
        color={i < rating ? ACCENT : '#E2E8F0'}
        fill={i < rating ? ACCENT : 'transparent'}
      />
    ))}
  </View>
);

export default function AdminReviewsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const LIMIT = 20;
  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  const fetchStats = async () => {
    try {
      const res = await reviewApi.getStats();
      setStats(res.data);
    } catch (e) { /* stats optional */ }
  };

  const loadReviews = async (pageNum: number, replace: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (pageNum > 1) setLoadingMore(true);
    try {
      const res = await reviewApi.getAdminReviews({ page: pageNum, limit: LIMIT });
      const d: any = res.data || {};
      const list = d.data || (Array.isArray(d) ? d : []);
      setReviews(prev => (replace ? list : [...prev, ...list]));
      pageRef.current = d.page || pageNum;
      setHasMore(!!d.hasMore);
    } catch (e) {
      console.log('Error fetching reviews:', e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchStats();
    loadReviews(1, true);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
    loadReviews(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loadingRef.current) loadReviews(pageRef.current + 1, false);
  };

  const totalReviews = stats?.totalReviews || reviews.length || 0;
  const averageRating = stats?.averageRating ? Number(stats.averageRating) : 0;
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length || 0;

  const STAT_CARDS = [
    { label: 'Total Reviews', value: String(totalReviews), icon: MessageSquare, color: '#3B82F6' },
    { label: 'Avg Rating', value: averageRating.toFixed(1), icon: Star, color: ACCENT },
    { label: '5 Star', value: String(fiveStarCount), icon: TrendingUp, color: '#22C55E' },
    { label: 'Reviewers', value: String(totalReviews), icon: Users, color: '#8B5CF6' },
  ];

  const orderLabel = (order: any) => {
    if (order && typeof order === 'object') {
      return order.customId || `#${(order._id || '').slice(-6).toUpperCase()}`;
    }
    return `#${(typeof order === 'string' ? order : '').slice(-6).toUpperCase() || 'N/A'}`;
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const order = item.order;
    const items =
      order && typeof order === 'object' && order.items?.length
        ? order.items.map((i: any) => `${i.product?.name || 'Item'} x${i.quantity}`).join(', ')
        : null;
    return (
      <Animated.View entering={FadeInDown.delay(index * 20).duration(400)} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            {item.user?.profileImage ? (
              <Image source={{ uri: resolveImageURL(item.user.profileImage) }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{item.user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>{item.user?.name || 'Anonymous'}</Text>
            {!!item.user?.email && <Text style={styles.userEmail} numberOfLines={1}>{item.user.email}</Text>}
          </View>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.ratingRow}>
          <Stars rating={item.rating} />
          <Text style={styles.orderTag}>{orderLabel(order)}</Text>
        </View>

        {!!item.comment && <Text style={styles.comment}>{item.comment}</Text>}
        {!!items && <Text style={styles.itemsText} numberOfLines={2}>🍽️ {items}</Text>}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
        <Text style={styles.headerTitle}>Reviews</Text>
        <Text style={styles.headerSubtitle}>Customer feedback & satisfaction</Text>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.statsGrid}>
              {STAT_CARDS.map((s) => {
                const Icon = s.icon;
                return (
                  <View key={s.label} style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: `${s.color}15` }]}>
                      <Icon size={18} color={s.color} />
                    </View>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                );
              })}
            </View>
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <View style={{ paddingVertical: 20 }}><ActivityIndicator color={ACCENT} /></View> : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MessageSquare size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No reviews found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: CARD_BG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4, zIndex: 10 },
  headerTitle: { fontFamily: 'Jakarta-ExtraBold', fontSize: 28, color: TEXT_DARK, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: ACCENT, marginTop: 2 },

  listContent: { padding: 16, paddingBottom: 40 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  statCard: { width: '47%', flexGrow: 1, backgroundColor: CARD_BG, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontFamily: 'Inter-Black', fontSize: 24, color: TEXT_DARK },
  statLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

  card: { backgroundColor: CARD_BG, borderRadius: 20, padding: 16, marginTop: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: 'Inter-Black', fontSize: 16, color: ACCENT },
  userName: { fontFamily: 'Inter-Bold', fontSize: 15, color: TEXT_DARK },
  userEmail: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  dateText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: TEXT_MUTED },

  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  orderTag: { fontFamily: 'Inter-Bold', fontSize: 11, color: TEXT_MUTED, backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  comment: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_DARK, marginTop: 12, lineHeight: 19 },
  itemsText: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 8 },

  emptyState: { paddingTop: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_MUTED },
});

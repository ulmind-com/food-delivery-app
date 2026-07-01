import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { adminApi } from '../../services/api';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { useAuthStore } from '../../store/useAuthStore';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { IndianRupee, ShoppingBag, Users, TrendingUp, Eye, X, Calendar, ArrowUpRight, Flame, Receipt, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { resolveImageURL } from '../../lib/image-utils';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';
const ACCENT = '#F96C00';

type Preset = 'today' | '7d' | '30d' | 'month';
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const getRange = (preset: Preset) => {
  const now = new Date();
  let start = new Date();
  if (preset === 'today') start = now;
  else if (preset === '7d') start = new Date(now.getTime() - 6 * 86400000);
  else if (preset === '30d') start = new Date(now.getTime() - 29 * 86400000);
  else if (preset === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: ymd(start) + 'T00:00', endDate: ymd(now) + 'T23:59' };
};
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'month', label: 'Month' },
];

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: '#22C55E', CANCELLED: '#EF4444', PENDING: '#F59E0B', PLACED: '#F59E0B',
  ACCEPTED: '#3B82F6', PREPARING: '#6366F1', OUT_FOR_DELIVERY: '#8B5CF6', READY: '#06B6D4', REJECTED: '#EF4444',
};
const statusColor = (s: string) => STATUS_COLORS[s] || '#94A3B8';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const inr = (n: number) => {
  const v = Number(n || 0);
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${v.toFixed(0)}`;
};

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [preset, setPreset] = useState<Preset>('30d');
  const [showUsersModal, setShowUsersModal] = useState(false);

  const fetchAll = async (p: Preset = preset) => {
    try {
      const [aRes, dRes] = await Promise.all([
        adminApi.getAnalytics(getRange(p)),
        adminApi.getDashboard().catch(() => ({ data: null })),
      ]);
      setAnalytics(aRes.data);
      if (dRes.data) setDash(dRes.data);
    } catch (e) {
      console.log('Error fetching dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll(preset);
  }, [preset]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const statusEntries = analytics?.statusBreakdown
    ? Object.entries(analytics.statusBreakdown).map(([name, value]) => ({ name, value: Number(value) })).filter((e) => e.value > 0)
    : [];
  const statusTotal = statusEntries.reduce((a, c) => a + c.value, 0) || 1;

  const KPI = [
    { label: 'Revenue', value: inr(analytics?.revenue), icon: IndianRupee, g: ['#34D399', '#059669'] as const },
    { label: 'Orders', value: String(analytics?.totalOrders || 0), icon: ShoppingBag, g: ['#38BDF8', '#0284C7'] as const },
    { label: 'New Users', value: String(analytics?.newUsersCount || 0), icon: Users, g: ['#A78BFA', '#6D28D9'] as const, action: true },
    { label: 'Paid Orders', value: String(analytics?.paidOrdersCount || 0), icon: TrendingUp, g: ['#FB923C', '#EA580C'] as const },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} progressViewOffset={insets.top + 40} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Gradient Hero ─── */}
        <LinearGradient colors={['#FF9A3D', '#F96C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 18 }]}>
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />

          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGreeting}>{greeting()} 👋</Text>
              <Text style={styles.heroName} numberOfLines={1}>{restaurant?.name || user?.name || 'Admin'}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: restaurant?.isOpen ? '#16A34A' : '#94A3B8' }]}>
              <View style={styles.statusDotInner} />
              <Text style={styles.statusDotText}>{restaurant?.isOpen ? 'OPEN' : 'CLOSED'}</Text>
            </View>
          </View>

          {/* Today snapshot */}
          <View style={styles.todayRow}>
            <View style={styles.todayCard}>
              <View style={styles.todayIconWrap}><IndianRupee size={16} color="#FFF" /></View>
              <View>
                <Text style={styles.todayLabel}>Today's Revenue</Text>
                <Text style={styles.todayValue}>{loading ? '—' : `₹${Number(dash?.todaysRevenue || 0).toFixed(0)}`}</Text>
              </View>
            </View>
            <View style={styles.todayCard}>
              <View style={styles.todayIconWrap}><ShoppingBag size={16} color="#FFF" /></View>
              <View>
                <Text style={styles.todayLabel}>Today's Orders</Text>
                <Text style={styles.todayValue}>{loading ? '—' : dash?.todaysOrders || 0}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ─── Period chips ─── */}
        <View style={styles.periodRow}>
          <Calendar size={15} color={TEXT_MUTED} />
          {PRESETS.map((p) => (
            <TouchableOpacity key={p.key} style={[styles.periodChip, preset === p.key && styles.periodChipActive]} onPress={() => setPreset(p.key)}>
              <Text style={[styles.periodText, preset === p.key && styles.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── KPI grid ─── */}
        <View style={styles.kpiGrid}>
          {KPI.map((k, i) => {
            const Icon = k.icon;
            const Wrapper: any = k.action ? TouchableOpacity : View;
            return (
              <Animated.View key={k.label} entering={FadeInDown.delay(i * 60).duration(420)} style={styles.kpiCardWrap}>
                <Wrapper style={styles.kpiCard} {...(k.action ? { onPress: () => setShowUsersModal(true), activeOpacity: 0.85 } : {})}>
                  <View style={styles.kpiTop}>
                    <LinearGradient colors={k.g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.kpiIcon}>
                      <Icon size={20} color="#FFF" strokeWidth={2.5} />
                    </LinearGradient>
                    {k.action ? <Eye size={15} color={TEXT_MUTED} /> : <ArrowUpRight size={15} color="#CBD5E1" />}
                  </View>
                  <Text style={styles.kpiValue}>{loading ? '—' : k.value}</Text>
                  <Text style={styles.kpiLabel}>{k.label}</Text>
                </Wrapper>
              </Animated.View>
            );
          })}
        </View>

        {/* ─── Order Status Breakdown ─── */}
        {statusEntries.length > 0 && (
          <Animated.View entering={FadeInDown.delay(280).duration(420)} style={styles.section}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            <View style={styles.card}>
              <View style={styles.stackedBar}>
                {statusEntries.map((e) => (
                  <View key={e.name} style={{ width: `${(e.value / statusTotal) * 100}%`, backgroundColor: statusColor(e.name) }} />
                ))}
              </View>
              <View style={styles.legendWrap}>
                {statusEntries.map((e) => (
                  <View key={e.name} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: statusColor(e.name) }]} />
                    <Text style={styles.legendText}>{e.name.replace(/_/g, ' ')}</Text>
                    <Text style={styles.legendVal}>{e.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* ─── Top Selling Items ─── */}
        {analytics?.topItems?.length > 0 && (
          <Animated.View entering={FadeInDown.delay(340).duration(420)}>
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>Top Selling</Text>
              <Flame size={18} color={ACCENT} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 14 }}>
              {analytics.topItems.map((item: any, idx: number) => (
                <View key={item._id || idx} style={styles.topCard}>
                  <View>
                    <Image source={{ uri: resolveImageURL(item.imageURL) }} style={styles.topImg} contentFit="cover" />
                    <View style={styles.rankBadge}><Text style={styles.rankText}>#{idx + 1}</Text></View>
                  </View>
                  <View style={{ padding: 12 }}>
                    <Text style={styles.topName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.topMetaRow}>
                      <Text style={styles.topSold}>{item.totalSold} sold</Text>
                      <Text style={styles.topRev}>₹{item.revenue}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ─── Recent Orders ─── */}
        <Animated.View entering={FadeInDown.delay(400).duration(420)} style={styles.section}>
          <View style={styles.sectionHeadRowInline}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity style={styles.seeAll} onPress={() => router.push('/(admin)/orders')}>
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight size={14} color={ACCENT} />
            </TouchableOpacity>
          </View>

          {(dash?.recentOrders?.length ? dash.recentOrders : []).map((o: any) => (
            <View key={o._id} style={styles.orderRow}>
              <View style={[styles.orderIcon, { backgroundColor: `${statusColor(o.orderStatus)}18` }]}>
                <Receipt size={18} color={statusColor(o.orderStatus)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderId}>#{o.customId || o._id?.slice(-6).toUpperCase()}</Text>
                <Text style={styles.orderCust} numberOfLines={1}>{o.customer?.name || 'Walk-in'} · {o.paymentMethod || '—'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.orderAmt}>₹{Number(o.finalAmount || 0).toFixed(0)}</Text>
                <View style={[styles.statusPill, { backgroundColor: `${statusColor(o.orderStatus)}18` }]}>
                  <Text style={[styles.statusPillText, { color: statusColor(o.orderStatus) }]}>{(o.orderStatus || '').replace(/_/g, ' ')}</Text>
                </View>
              </View>
            </View>
          ))}
          {!loading && !dash?.recentOrders?.length && (
            <View style={styles.emptyBox}><Text style={styles.emptyText}>No recent orders.</Text></View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Users Modal */}
      <Modal visible={showUsersModal} presentationStyle="pageSheet" animationType="slide">
        <View style={{ flex: 1, backgroundColor: BG_COLOR }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitleText}>New Users ({analytics?.newUsersCount || 0})</Text>
            <TouchableOpacity onPress={() => setShowUsersModal(false)} style={styles.closeBtn}>
              <X size={20} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
            {analytics?.newUsers?.map((u: any, i: number) => (
              <View key={i} style={styles.userCard}>
                <View style={styles.userAvatar}>
                  {u.profileImage ? (
                    <Image source={{ uri: resolveImageURL(u.profileImage) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Text style={{ fontFamily: 'Inter-Black', color: '#FFF' }}>{u.name?.charAt(0)?.toUpperCase()}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{u.email}</Text>
                </View>
                <Text style={styles.userDate}>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
              </View>
            ))}
            {!analytics?.newUsers?.length && <Text style={{ textAlign: 'center', color: TEXT_MUTED, marginTop: 30, fontFamily: 'Inter-Medium' }}>No new users found.</Text>}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },

  /* Hero */
  hero: { paddingHorizontal: 20, paddingBottom: 26, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' },
  heroCircle1: { position: 'absolute', top: -50, right: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroCircle2: { position: 'absolute', bottom: -60, left: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center' },
  heroGreeting: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  heroName: { fontFamily: 'Jakarta-ExtraBold', fontSize: 26, color: '#FFF', letterSpacing: -0.5, marginTop: 2 },
  statusDot: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)' },
  statusDotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF' },
  statusDotText: { fontFamily: 'Inter-Black', fontSize: 10, color: '#FFF', letterSpacing: 0.5 },

  todayRow: { flexDirection: 'row', gap: 12, marginTop: 22 },
  todayCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  todayIconWrap: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  todayLabel: { fontFamily: 'Inter-SemiBold', fontSize: 10.5, color: 'rgba(255,255,255,0.85)' },
  todayValue: { fontFamily: 'Jakarta-ExtraBold', fontSize: 18, color: '#FFF', marginTop: 1 },

  /* Period chips */
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 18, marginBottom: 4, flexWrap: 'wrap' },
  periodChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_COLOR },
  periodChipActive: { backgroundColor: TEXT_DARK, borderColor: TEXT_DARK },
  periodText: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_MUTED },
  periodTextActive: { color: '#FFF' },

  /* KPI */
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginTop: 14 },
  kpiCardWrap: { width: '47%', flexGrow: 1 },
  kpiCard: { backgroundColor: CARD_BG, borderRadius: 20, padding: 16, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontFamily: 'Jakarta-ExtraBold', fontSize: 24, color: TEXT_DARK, marginTop: 14, letterSpacing: -0.5 },
  kpiLabel: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

  /* Sections */
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontFamily: 'Jakarta-Bold', fontSize: 18, color: TEXT_DARK },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 24, marginBottom: 12 },
  sectionHeadRowInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontFamily: 'Inter-Bold', fontSize: 12, color: ACCENT },

  card: { backgroundColor: CARD_BG, borderRadius: 20, padding: 16, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3, marginTop: 12 },

  stackedBar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  legendWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: TEXT_MUTED, textTransform: 'capitalize' },
  legendVal: { fontFamily: 'Inter-Black', fontSize: 12, color: TEXT_DARK },

  /* Top items */
  topCard: { width: 150, backgroundColor: CARD_BG, borderRadius: 18, overflow: 'hidden', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  topImg: { width: '100%', height: 100, backgroundColor: '#F1F5F9' },
  rankBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(15,23,42,0.8)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  rankText: { fontFamily: 'Inter-Black', fontSize: 11, color: '#FFF' },
  topName: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_DARK },
  topMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  topSold: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED },
  topRev: { fontFamily: 'Inter-Black', fontSize: 13, color: '#16A34A' },

  /* Recent orders */
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD_BG, borderRadius: 16, padding: 12, marginBottom: 10, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  orderIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  orderId: { fontFamily: 'Inter-Black', fontSize: 14, color: TEXT_DARK },
  orderCust: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  orderAmt: { fontFamily: 'Jakarta-Bold', fontSize: 15, color: TEXT_DARK },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  statusPillText: { fontFamily: 'Inter-Bold', fontSize: 9, letterSpacing: 0.3 },

  emptyBox: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED },

  /* Modal */
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: CARD_BG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowOpacity: 0.03, shadowRadius: 8, elevation: 4 },
  modalTitleText: { fontFamily: 'Jakarta-ExtraBold', fontSize: 20, color: TEXT_DARK },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD_BG, padding: 14, borderRadius: 16, marginBottom: 10 },
  userAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  userName: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_DARK },
  userEmail: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  userDate: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: TEXT_MUTED },
});

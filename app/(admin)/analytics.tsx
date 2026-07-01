import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminApi } from '../../services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TrendingUp, Users, IndianRupee, ShoppingBag, Eye, X, Calendar } from 'lucide-react-native';
import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';
import { resolveImageURL } from '../../lib/image-utils';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const ACCENT = '#6366F1'; // Indigo for Analytics
const PIE_COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#FF8042', '#8B5CF6', '#EC4899', '#06B6D4'];

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
  { key: 'month', label: 'This Month' },
];

/* Donut chart */
const Donut = ({ data }: { data: { name: string; value: number }[] }) => {
  const size = 160;
  const stroke = 26;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const total = data.reduce((a, c) => a + c.value, 0) || 1;
  let offset = 0;

  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#F1F5F9" strokeWidth={stroke} fill="none" />
      {data.map((seg, i) => {
        const frac = seg.value / total;
        const dash = frac * circ;
        const el = (
          <Circle
            key={seg.name}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={PIE_COLORS[i % PIE_COLORS.length]}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        );
        offset += dash;
        return el;
      })}
    </Svg>
  );
};

export default function AdminAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [preset, setPreset] = useState<Preset>('30d');
  const [showUsers, setShowUsers] = useState(false);

  const fetchData = async (p: Preset = preset) => {
    try {
      const res = await adminApi.getAnalytics(getRange(p));
      setAnalytics(res.data);
    } catch (e) {
      console.log('Error fetching analytics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(preset);
  }, [preset]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const statusData = analytics?.statusBreakdown
    ? Object.entries(analytics.statusBreakdown).map(([name, value]) => ({ name, value: Number(value) }))
    : [];
  const topItems = analytics?.topItems || [];
  const maxSold = Math.max(1, ...topItems.map((t: any) => t.totalSold || 0));
  const statusTotal = statusData.reduce((a, c) => a + c.value, 0) || 1;

  const KPI = [
    { label: 'Revenue', value: `₹${Number(analytics?.revenue || 0).toFixed(0)}`, icon: IndianRupee, color: '#22C55E' },
    { label: 'Total Orders', value: String(analytics?.totalOrders || 0), icon: ShoppingBag, color: '#3B82F6' },
    { label: 'New Users', value: String(analytics?.newUsersCount || 0), icon: Users, color: '#8B5CF6', action: true },
    { label: 'Paid Orders', value: String(analytics?.paidOrdersCount || 0), icon: TrendingUp, color: '#F59E0B' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>Deep dive into business metrics</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Date presets */}
        <View style={styles.presetRow}>
          <Calendar size={16} color={TEXT_MUTED} />
          {PRESETS.map((p) => (
            <TouchableOpacity key={p.key} style={[styles.presetChip, preset === p.key && styles.presetChipActive]} onPress={() => setPreset(p.key)}>
              <Text style={[styles.presetText, preset === p.key && styles.presetTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <ActivityIndicator color={ACCENT} size="large" />
          </View>
        ) : (
          <>
            {/* KPI cards */}
            <View style={styles.kpiGrid}>
              {KPI.map((k, i) => {
                const Icon = k.icon;
                const Wrapper: any = k.action ? TouchableOpacity : View;
                return (
                  <Animated.View key={k.label} entering={FadeInDown.delay(i * 40).duration(400)} style={styles.kpiCardWrap}>
                    <Wrapper style={styles.kpiCard} {...(k.action ? { onPress: () => setShowUsers(true), activeOpacity: 0.8 } : {})}>
                      <View style={[styles.kpiIcon, { backgroundColor: `${k.color}15` }]}>
                        <Icon size={20} color={k.color} />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                        <Text style={styles.kpiValue}>{k.value}</Text>
                        {k.action && <Eye size={14} color={TEXT_MUTED} />}
                      </View>
                      <Text style={styles.kpiLabel}>{k.label}</Text>
                    </Wrapper>
                  </Animated.View>
                );
              })}
            </View>

            {/* Top Selling Items */}
            <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.card}>
              <Text style={styles.cardTitle}>Top Selling Items</Text>
              {topItems.length === 0 ? (
                <Text style={styles.emptyInline}>No sales in this period.</Text>
              ) : (
                <View style={{ marginTop: 12, gap: 14 }}>
                  {topItems.map((item: any, i: number) => (
                    <View key={item._id || i}>
                      <View style={styles.barTop}>
                        <Text style={styles.barName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.barRevenue}>₹{item.revenue}</Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${Math.max(6, ((item.totalSold || 0) / maxSold) * 100)}%` }]} />
                      </View>
                      <Text style={styles.barSold}>{item.totalSold} units sold</Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>

            {/* Order Status Distribution */}
            <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.card}>
              <Text style={styles.cardTitle}>Order Status Distribution</Text>
              {statusData.length === 0 ? (
                <Text style={styles.emptyInline}>No orders in this period.</Text>
              ) : (
                <View style={styles.donutWrap}>
                  <Donut data={statusData} />
                  <View style={{ flex: 1, gap: 8 }}>
                    {statusData.map((entry, i) => {
                      const percent = ((entry.value / statusTotal) * 100).toFixed(1);
                      return (
                        <View key={entry.name} style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }]} />
                          <Text style={styles.legendName} numberOfLines={1}>{entry.name.replace(/_/g, ' ')}</Text>
                          <Text style={styles.legendValue}>{entry.value}</Text>
                          <Text style={styles.legendPct}>{percent}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </Animated.View>
          </>
        )}
      </ScrollView>

      {/* New Users Modal */}
      <Modal visible={showUsers} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: BG_COLOR }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitleText}>New Users ({analytics?.newUsersCount || 0})</Text>
            <TouchableOpacity onPress={() => setShowUsers(false)} style={styles.closeBtn}>
              <X size={20} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {(!analytics?.newUsers || analytics.newUsers.length === 0) ? (
              <Text style={styles.emptyInline}>No new users in this period.</Text>
            ) : (
              analytics.newUsers.map((u: any) => (
                <View key={u._id} style={styles.userRow}>
                  <View style={styles.userAvatar}>
                    {u.profileImage ? (
                      <Image source={{ uri: resolveImageURL(u.profileImage) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <Text style={styles.userAvatarText}>{u.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{u.name}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{u.email}</Text>
                  </View>
                  <Text style={styles.userDate}>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: CARD_BG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4, zIndex: 10 },
  headerTitle: { fontFamily: 'Jakarta-ExtraBold', fontSize: 28, color: TEXT_DARK, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: ACCENT, marginTop: 2 },
  scrollContent: { padding: 16, paddingBottom: 60 },

  presetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD_BG, borderWidth: 1, borderColor: '#E2E8F0' },
  presetChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  presetText: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_MUTED },
  presetTextActive: { color: '#FFF' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCardWrap: { width: '47%', flexGrow: 1 },
  kpiCard: { backgroundColor: CARD_BG, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  kpiIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontFamily: 'Inter-Black', fontSize: 22, color: TEXT_DARK },
  kpiLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

  card: { backgroundColor: CARD_BG, borderRadius: 20, padding: 16, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_DARK },
  emptyInline: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED, paddingVertical: 16, textAlign: 'center' },

  barTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  barName: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_DARK, flex: 1, marginRight: 8 },
  barRevenue: { fontFamily: 'Inter-Black', fontSize: 13, color: '#22C55E' },
  barTrack: { height: 10, borderRadius: 6, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6, backgroundColor: ACCENT },
  barSold: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: TEXT_MUTED, marginTop: 4 },

  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 12, color: TEXT_DARK, textTransform: 'capitalize' },
  legendValue: { fontFamily: 'Inter-Black', fontSize: 12, color: TEXT_DARK },
  legendPct: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED, width: 42, textAlign: 'right' },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: CARD_BG, borderBottomColor: '#E2E8F0', borderBottomWidth: 1 },
  modalTitleText: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_DARK },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD_BG, borderRadius: 14, padding: 12, marginBottom: 10 },
  userAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  userAvatarText: { fontFamily: 'Inter-Black', fontSize: 16, color: '#8B5CF6' },
  userName: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_DARK },
  userEmail: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  userDate: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: TEXT_MUTED },
});

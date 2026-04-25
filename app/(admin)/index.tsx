import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminApi } from '../../services/api';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { IndianRupee, ShoppingBag, Users, TrendingUp, Calendar, Eye, X, PieChart as PieChartIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { resolveImageURL } from '../../lib/image-utils';
import { SkeletonGrid } from '../../components/Skeleton';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  // Modern Default Dates
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [showUsersModal, setShowUsersModal] = useState(false);

  const fetchStats = async () => {
    try {
      // Assuming GET /api/admin/analytics accepts startDate and endDate as query params
      const res = await adminApi.getAnalytics({ startDate: startDate + 'T00:00', endDate: endDate + 'T23:59' });
      setAnalytics(res.data);
    } catch (e) {
      console.log('Error fetching stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const ModernMetricCard = ({ title, value, sub, Icon, colors, onAction, delay }: any) => (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.metricCardBox}>
      <View style={styles.metricCardInner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.metricLabel}>{title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
             <Text style={styles.metricValue}>{value}</Text>
             {onAction && (
                <TouchableOpacity onPress={onAction} style={styles.eyeBtn}>
                   <Eye size={14} color={TEXT_MUTED} />
                </TouchableOpacity>
             )}
          </View>
          <Text style={styles.metricSub}>{sub}</Text>
        </View>
        <LinearGradient colors={colors} style={styles.iconGlossBox}>
          <Icon size={24} color="#FFF" strokeWidth={2.5} />
        </LinearGradient>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Sleek Header */}
      <View style={[styles.headerContainer, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
         <Text style={styles.screenTitle}>Analytics</Text>
         <Text style={styles.screenSub}>Performance Overview</Text>

         <View style={styles.datePillGroup}>
            <Calendar size={14} color={TEXT_MUTED} />
            <TextInput style={styles.dateMicroInput} placeholder="YYYY-MM-DD" placeholderTextColor={TEXT_MUTED} value={startDate} onChangeText={setStartDate} />
            <View style={styles.dateDivider} />
            <TextInput style={styles.dateMicroInput} placeholder="YYYY-MM-DD" placeholderTextColor={TEXT_MUTED} value={endDate} onChangeText={setEndDate} />
         </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={'#F96C00'} />} showsVerticalScrollIndicator={false}>
        
        {/* KPI Grid */}
        {loading ? (
           <View style={{ padding: 20, gap: 14 }}>
              <SkeletonGrid />
              <SkeletonGrid />
           </View>
        ) : (
          <View style={styles.statsGrid}>
            <ModernMetricCard 
              title="Total Revenue" 
              value={`₹${Number(analytics?.revenue || 0).toFixed(2)}`} 
              sub="In selected period"
              Icon={IndianRupee} 
              colors={['#10B981', '#059669']} 
              delay={100} 
            />
            <ModernMetricCard 
              title="Total Orders" 
              value={analytics?.totalOrders || 0} 
              sub="Completed & pending"
              Icon={ShoppingBag} 
              colors={['#0EA5E9', '#0284C7']} 
              delay={200} 
            />
            <ModernMetricCard 
              title="New Users" 
              value={analytics?.newUsersCount || 0} 
              sub="Registered recently"
              Icon={Users} 
              colors={['#8B5CF6', '#6D28D9']} 
              delay={300} 
              onAction={() => setShowUsersModal(true)}
            />
            <ModernMetricCard 
              title="Paid Orders" 
              value={analytics?.paidOrdersCount || 0} 
              sub="Online transactions"
              Icon={TrendingUp} 
              colors={['#F97316', '#EA580C']} 
              delay={400} 
            />
          </View>
        )}

        {/* Top Selling Items (Horizontal Scroll) */}
        {analytics?.topItems && analytics?.topItems.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
             <Text style={styles.sectionHeader}>Top Selling Items</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                {analytics.topItems.map((item: any, idx: number) => (
                  <View key={idx} style={styles.topItemCard}>
                     <Image source={{ uri: resolveImageURL(item.imageURL) }} style={styles.topItemImg} />
                     <View style={styles.topItemBar}>
                        <Text style={styles.topItemName} numberOfLines={1}>{item.name}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                           <Text style={styles.topItemCount}>{item.totalSold} sold</Text>
                           <Text style={styles.topItemRev}>₹{item.revenue}</Text>
                        </View>
                     </View>
                  </View>
                ))}
             </ScrollView>
          </Animated.View>
        )}

        {/* Status Distribution */}
        {analytics?.statusBreakdown && Object.keys(analytics.statusBreakdown).length > 0 && (
          <Animated.View entering={FadeInDown.delay(600).duration(400)} style={{ paddingHorizontal: 20 }}>
             <Text style={styles.sectionHeader}>Activity Breakdown</Text>
             <View style={styles.breakdownCard}>
                {Object.entries(analytics.statusBreakdown).map(([status, count]: [string, any], idx) => (
                   <View key={status} style={styles.breakdownRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                         <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: idx===0?'#10B981':idx===1?'#8B5CF6':idx===2?'#0EA5E9':'#F43F5E' }} />
                         <Text style={styles.breakdownLabel}>{status.replace(/_/g, ' ')}</Text>
                      </View>
                      <Text style={styles.breakdownValue}>{count}</Text>
                   </View>
                ))}
             </View>
          </Animated.View>
        )}
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
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
               {analytics?.newUsers?.map((u: any, i: number) => (
                 <View key={i} style={styles.userCard}>
                    <View style={styles.userAvatar}>
                       <Text style={{ fontFamily: 'Inter-Black', color: '#FFF' }}>{u.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                       <Text style={styles.userName}>{u.name}</Text>
                       <Text style={styles.userEmail}>{u.email}</Text>
                    </View>
                    <Text style={styles.userDate}>{new Date(u.createdAt).toLocaleDateString()}</Text>
                 </View>
               ))}
               {!analytics?.newUsers?.length && <Text style={{ textAlign: 'center', color: TEXT_MUTED }}>No new users found.</Text>}
            </ScrollView>
         </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },

  headerContainer: { backgroundColor: CARD_BG, paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: '#0F172A', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 5, zIndex: 10 },
  screenTitle: { fontFamily: 'Inter-Black', fontSize: 32, color: TEXT_DARK, letterSpacing: -1 },
  screenSub: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#F96C00', marginTop: 2 },
  
  datePillGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG_COLOR, borderRadius: 14, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: BORDER_COLOR, marginTop: 16 },
  dateMicroInput: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: TEXT_DARK, flex: 1, textAlign: 'center' },
  dateDivider: { width: 1, height: 16, backgroundColor: BORDER_COLOR, marginHorizontal: 8 },

  scrollContent: { paddingBottom: 100, paddingTop: 20 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingHorizontal: 20, marginBottom: 24 },
  metricCardBox: { width: '47%' },
  metricCardInner: { backgroundColor: CARD_BG, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width:0, height:6 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4, height: 140, justifyContent: 'space-between' },
  metricLabel: { fontFamily: 'Inter-Bold', fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_DARK },
  metricSub: { fontFamily: 'Inter-Medium', fontSize: 10, color: TEXT_MUTED, marginTop: 4 },
  iconGlossBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eyeBtn: { marginLeft: 6, backgroundColor: BG_COLOR, padding: 4, borderRadius: 6 },

  sectionHeader: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_DARK, marginLeft: 20, marginBottom: 12 },
  topItemCard: { width: 160, backgroundColor: CARD_BG, borderRadius: 16, marginRight: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3 },
  topItemImg: { width: '100%', height: 120, backgroundColor: BORDER_COLOR },
  topItemBar: { padding: 12 },
  topItemName: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_DARK },
  topItemCount: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED },
  topItemRev: { fontFamily: 'Inter-Black', fontSize: 12, color: '#10B981' },

  breakdownCard: { backgroundColor: CARD_BG, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  breakdownLabel: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_DARK, textTransform: 'capitalize' },
  breakdownValue: { fontFamily: 'Inter-Black', fontSize: 14, color: TEXT_DARK },

  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, backgroundColor: CARD_BG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowOpacity: 0.03, shadowRadius: 8, elevation: 4 },
  modalTitleText: { fontFamily: 'Inter-Black', fontSize: 22, color: TEXT_DARK },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },
  
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD_BG, padding: 16, borderRadius: 16, marginBottom: 12, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  userName: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_DARK },
  userEmail: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED },
  userDate: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: TEXT_MUTED },
});

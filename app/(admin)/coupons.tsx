import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, Switch, TextInput, Alert, Modal, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { couponApi } from '../../services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Tag, Trash2, Plus, Calendar, Settings, Percent, IndianRupee, X } from 'lucide-react-native';
import { SkeletonCard } from '../../components/Skeleton';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';
const ACCENT = '#F59E0B'; // Amber matching the More tab icon

export default function AdminCouponsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  
  // Create Modal
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState('PERCENTAGE'); // or FLAT
  const [newAmount, setNewAmount] = useState('');
  const [newMinOrder, setNewMinOrder] = useState('');
  const [newUsageLimit, setNewUsageLimit] = useState('');

  const fetchCoupons = async () => {
    try {
      const res = await couponApi.getAll();
      setCoupons(res.data);
    } catch (e) {
      console.log('Error fetching coupons:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCoupons();
  };

  const toggleCoupon = async (id: string, current: boolean) => {
    setCoupons(prev => prev.map(c => c._id === id ? { ...c, isActive: !current } : c));
    try {
      await couponApi.update(id, { isActive: !current });
    } catch { fetchCoupons(); }
  };

  const deleteCoupon = (id: string, code: string) => {
    Alert.alert('Delete Promotion', `Permanently delete coupon code ${code}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await couponApi.delete(id);
            setCoupons(prev => prev.filter(c => c._id !== id));
          } catch (e) {}
      }}
    ]);
  };

  const handleCreate = async () => {
    if (!newCode || !newAmount) return Alert.alert('Error', 'Code and Amount are required.');
    try {
      const payload = {
        code: newCode.toUpperCase(),
        discountType: newType,
        discountAmount: Number(newAmount), // For FLAT it's amount, for PERCENTAGE it's used natively by backend as discountPercent usually, but web payload is standard:
        discountPercent: newType === 'PERCENTAGE' ? Number(newAmount) : 0,
        minOrderValue: newMinOrder ? Number(newMinOrder) : 0,
        usageLimit: newUsageLimit ? Number(newUsageLimit) : 1000,
      };
      await couponApi.create(payload);
      setShowCreate(false);
      setNewCode(''); setNewAmount(''); setNewMinOrder(''); setNewUsageLimit('');
      fetchCoupons();
    } catch (e) {
      Alert.alert('Error', 'Failed to create coupon format');
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    return (
      <Animated.View entering={FadeInDown.delay(index * 20).springify().damping(16)} style={styles.card}>
        <View style={styles.cardHeader}>
           <View style={styles.iconBox}>
              <Tag size={20} color={ACCENT} />
           </View>
           <View style={{ flex: 1 }}>
              <Text style={styles.codeText}>{item.code}</Text>
              <Text style={styles.descText}>
                 {item.discountType === 'PERCENTAGE' ? `${item.discountPercent || item.discountAmount}% OFF` : `₹${item.discountAmount} FLAT OFF`}
                 {item.minOrderValue > 0 ? ` on orders above ₹${item.minOrderValue}` : ''}
              </Text>
           </View>
           <TouchableOpacity onPress={() => deleteCoupon(item._id, item.code)} style={styles.deleteBtn}>
              <Trash2 size={16} color="#EF4444" />
           </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
           <View style={styles.statBox}>
              <Text style={styles.statLabel}>Usage</Text>
              <Text style={styles.statValue}>{item.usedCount || 0} / {item.usageLimit || '∞'}</Text>
           </View>
           <View style={styles.statBox}>
              <Text style={styles.statLabel}>Status</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                 <Switch
                    value={item.isActive !== false}
                    onValueChange={(val) => toggleCoupon(item._id, !val)}
                    trackColor={{ false: '#E2E8F0', true: '#FDE68A' }}
                    thumbColor={Platform.OS === 'ios' ? '#FFF' : item.isActive !== false ? ACCENT : '#94A3B8'}
                    style={{ transform: [{ scale: 0.8 }] }}
                 />
                 <Text style={[styles.statusText, { color: item.isActive !== false ? ACCENT : TEXT_MUTED }]}>{item.isActive !== false ? 'Active' : 'Off'}</Text>
              </View>
           </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.headerTitle}>Promotions</Text>
              <Text style={styles.headerSubtitle}>Active Coupon Codes</Text>
            </View>
            <TouchableOpacity style={styles.fabBtn} onPress={() => setShowCreate(true)}>
               <Plus size={20} color="#FFF" />
            </TouchableOpacity>
         </View>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
           {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
             <View style={styles.emptyState}>
                <Tag size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No coupons active.</Text>
             </View>
          }
        />
      )}

      {/* Creation Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: BG_COLOR }}>
            <View style={styles.modalHeader}>
               <Text style={styles.modalTitleText}>Create New Promo</Text>
               <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.closeBtn}>
                  <X size={20} color={TEXT_DARK} />
               </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
               <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Coupon Code</Text>
                  <TextInput style={styles.textInput} placeholder="e.g. SUMMERDEAL" value={newCode} onChangeText={setNewCode} autoCapitalize="characters" />
               </View>

               <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Discount Type</Text>
                  <View style={styles.typeSelectorRow}>
                     <TouchableOpacity style={[styles.typeOption, newType === 'PERCENTAGE' && styles.typeOptionActive]} onPress={() => setNewType('PERCENTAGE')}>
                        <Percent size={16} color={newType === 'PERCENTAGE' ? ACCENT : TEXT_MUTED} />
                        <Text style={[styles.typeOptionText, newType === 'PERCENTAGE' && styles.typeOptionTextActive]}>Percentage</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[styles.typeOption, newType === 'FLAT' && styles.typeOptionActive]} onPress={() => setNewType('FLAT')}>
                        <IndianRupee size={16} color={newType === 'FLAT' ? ACCENT : TEXT_MUTED} />
                        <Text style={[styles.typeOptionText, newType === 'FLAT' && styles.typeOptionTextActive]}>Flat Amount</Text>
                     </TouchableOpacity>
                  </View>
               </View>

               <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                     <Text style={styles.inputLabel}>Discount Value</Text>
                     <TextInput style={styles.textInput} placeholder="Amount or %" keyboardType="numeric" value={newAmount} onChangeText={setNewAmount} />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                     <Text style={styles.inputLabel}>Min Order (₹)</Text>
                     <TextInput style={styles.textInput} placeholder="e.g. 500" keyboardType="numeric" value={newMinOrder} onChangeText={setNewMinOrder} />
                  </View>
               </View>

               <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Usage Limit (Global)</Text>
                  <TextInput style={styles.textInput} placeholder="How many times can it be used total" keyboardType="numeric" value={newUsageLimit} onChangeText={setNewUsageLimit} />
               </View>

               <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                  <Text style={styles.submitBtnText}>PUBLISH PROMOTION</Text>
               </TouchableOpacity>
            </ScrollView>
         </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: CARD_BG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4, zIndex: 10 },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 28, color: TEXT_DARK, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: ACCENT, marginTop: 2 },
  fabBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', shadowColor: ACCENT, shadowOffset: {width:0, height:4}, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },

  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: CARD_BG, borderRadius: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', padding: 16, alignItems: 'flex-start' },
  iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  codeText: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_DARK, letterSpacing: 0.5 },
  descText: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED, marginTop: 4 },
  deleteBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 10 },
  
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  
  cardFooter: { flexDirection: 'row', padding: 16 },
  statBox: { flex: 1 },
  statLabel: { fontFamily: 'Inter-Bold', fontSize: 10, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_DARK, marginTop: 6 },
  statusText: { fontFamily: 'Inter-Bold', fontSize: 12 },

  emptyState: { paddingTop: 80, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_MUTED },

  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: CARD_BG, borderBottomColor: BORDER_COLOR, borderBottomWidth: 1 },
  modalTitleText: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_DARK },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },
  
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  textInput: { height: 50, backgroundColor: CARD_BG, borderRadius: 12, paddingHorizontal: 16, fontFamily: 'Inter-SemiBold', fontSize: 15, color: TEXT_DARK, borderWidth: 1, borderColor: BORDER_COLOR },
  
  rowInputs: { flexDirection: 'row', gap: 16 },
  typeSelectorRow: { flexDirection: 'row', gap: 12 },
  typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 12, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_COLOR },
  typeOptionActive: { borderColor: ACCENT, backgroundColor: '#FFFBEB' },
  typeOptionText: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_MUTED },
  typeOptionTextActive: { color: ACCENT },

  submitBtn: { height: 56, backgroundColor: ACCENT, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: ACCENT, shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { fontFamily: 'Inter-Black', fontSize: 15, color: '#FFF', letterSpacing: 1 },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, Switch, Modal, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { menuApi, adminApi } from '../../services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { UtensilsCrossed, Edit2, Trash2, Tag, ChevronRight, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveImageURL } from '../../lib/image-utils';
import { SkeletonCard } from '../../components/Skeleton';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';
const ACCENT = '#10B981';

export default function AdminMenu() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Form states
  const [discountPercent, setDiscountPercent] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editName, setEditName] = useState('');

  const fetchMenu = async () => {
    try {
      const res = await menuApi.getAdminMenu();
      setProducts(res.data);
    } catch (e) {
      console.log('Error fetching menu in admin:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenu();
  };

  const toggleStock = async (id: string, currentStock: boolean) => {
    setProducts(prev => prev.map(p => p._id === id ? { ...p, isAvailable: !currentStock, inStock: !currentStock } : p));
    try {
      await adminApi.updateMenuItem(id, { isAvailable: !currentStock });
    } catch (e) {
      fetchMenu();
    }
  };

  const getCategoryName = (cat: any) => {
    if (!cat) return "—";
    return typeof cat === "object" ? cat.name : cat;
  };

  const openActions = (item: any) => {
    setSelectedItem(item);
    setActionModalVisible(true);
  };

  const handleDelete = () => {
    Alert.alert('Delete Item', `Remove ${selectedItem.name} entirely?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await adminApi.deleteMenuItem(selectedItem._id);
            setProducts(prev => prev.filter(p => p._id !== selectedItem._id));
            setActionModalVisible(false);
          } catch (e) {}
      }}
    ]);
  };

  const submitDiscount = async () => {
    try {
      // Very basic discount expiry in 2 hours for mobile equivalence, or just simple discount
      const payload = { discountPercentage: Number(discountPercent), discountExpiresAt: discountPercent ? new Date(Date.now() + 86400000).toISOString() : null };
      await adminApi.updateMenuItem(selectedItem._id, payload);
      setDiscountModalVisible(false);
      setActionModalVisible(false);
      fetchMenu();
    } catch (e) {}
  };

  const submitEdit = async () => {
    try {
      const payload = { name: editName, price: Number(editPrice) };
      await adminApi.updateMenuItem(selectedItem._id, payload);
      setEditModalVisible(false);
      setActionModalVisible(false);
      fetchMenu();
    } catch (e) {}
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const isAvailable = item.isAvailable !== false && item.inStock !== false;
    
    return (
      <Animated.View entering={FadeInDown.delay(index * 20).springify().damping(16)} style={[styles.card, !isAvailable && styles.cardInactive]}>
        <View style={styles.cardHeader}>
           <Image source={{ uri: resolveImageURL(item.image || item.imageURL) }} style={styles.image} contentFit="cover" />
           <View style={styles.cardInfoBox}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                 <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                       <View style={[styles.typeIcon, { backgroundColor: item.type === 'Veg' ? '#16A34A' : '#DC2626' }]} />
                       <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    </View>
                    <Text style={styles.categoryBadge}>{getCategoryName(item.category)}</Text>
                 </View>
                 <TouchableOpacity onPress={() => openActions(item)} style={styles.optionsBtn}>
                    <ChevronRight size={18} color={TEXT_MUTED} />
                 </TouchableOpacity>
              </View>
              {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
           </View>
        </View>

        <View style={styles.cardFooter}>
           <View>
              <Text style={styles.price}>₹{item.price || item.variants?.[0]?.price || 0}</Text>
              {item.discountPercentage > 0 && (
                <View style={styles.discountPill}>
                  <Text style={styles.discountText}>{item.discountPercentage}% OFF</Text>
                </View>
              )}
           </View>
           <View style={styles.toggleWrap}>
              <Text style={[styles.stockText, { color: isAvailable ? ACCENT : '#EF4444' }]}>{isAvailable ? 'Active' : 'Off'}</Text>
              <Switch
                value={isAvailable}
                onValueChange={() => toggleStock(item._id, isAvailable)}
                trackColor={{ false: '#E5E7EB', true: '#34D399' }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isAvailable ? '#10B981' : '#F3F4F6'}
              />
           </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
        <Text style={styles.headerTitle}>Menu Catalog</Text>
        <Text style={styles.headerSubtitle}>Total {products.length} Items</Text>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
           {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={'#0F172A'} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <UtensilsCrossed size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No menu items found.</Text>
            </View>
          }
        />
      )}

      {/* Modern Bottom Action Sheet */}
      <Modal visible={actionModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
           <View style={styles.bottomSheet}>
              <View style={styles.bsHeader}>
                 <Text style={styles.bsTitle}>{selectedItem?.name}</Text>
                 <TouchableOpacity onPress={() => setActionModalVisible(false)}><X size={24} color={TEXT_MUTED} /></TouchableOpacity>
              </View>
              
              <TouchableOpacity style={styles.bsOption} onPress={() => { setEditName(selectedItem.name); setEditPrice(String(selectedItem.price)); setEditModalVisible(true); }}>
                 <View style={[styles.bsIcon, { backgroundColor: '#EFF6FF' }]}><Edit2 size={18} color="#2563EB" /></View>
                 <Text style={styles.bsOptionText}>Edit Core Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bsOption} onPress={() => { setDiscountPercent(String(selectedItem.discountPercentage||'')); setDiscountModalVisible(true); }}>
                 <View style={[styles.bsIcon, { backgroundColor: '#FFF7ED' }]}><Tag size={18} color="#EA580C" /></View>
                 <Text style={styles.bsOptionText}>Manage Discounts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bsOption} onPress={handleDelete}>
                 <View style={[styles.bsIcon, { backgroundColor: '#FEF2F2' }]}><Trash2 size={18} color="#DC2626" /></View>
                 <Text style={[styles.bsOptionText, { color: '#DC2626' }]}>Delete Product</Text>
              </TouchableOpacity>
           </View>
        </View>
      </Modal>

      {/* Edit Details Input Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.centerModalOverlay}>
           <View style={styles.centerModalBox}>
              <Text style={styles.cmTitle}>Edit Detail</Text>
              <TextInput style={styles.cmInput} value={editName} onChangeText={setEditName} placeholder="Product Name" />
              <TextInput style={styles.cmInput} value={editPrice} onChangeText={setEditPrice} placeholder="Price (₹)" keyboardType="numeric" />
              <View style={styles.cmControls}>
                 <TouchableOpacity style={styles.cmBtnCancel} onPress={() => setEditModalVisible(false)}><Text style={styles.cmBtnTextMuted}>Cancel</Text></TouchableOpacity>
                 <TouchableOpacity style={styles.cmBtnSave} onPress={submitEdit}><Text style={styles.cmBtnTextWhite}>Save Changes</Text></TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>

      {/* Discount Input Modal */}
      <Modal visible={discountModalVisible} transparent animationType="fade">
        <View style={styles.centerModalOverlay}>
           <View style={styles.centerModalBox}>
              <Text style={styles.cmTitle}>Set Discount</Text>
              <TextInput style={styles.cmInput} value={discountPercent} onChangeText={setDiscountPercent} placeholder="Percentage % (e.g. 15)" keyboardType="numeric" />
              <View style={styles.cmControls}>
                 <TouchableOpacity style={styles.cmBtnCancel} onPress={() => setDiscountModalVisible(false)}><Text style={styles.cmBtnTextMuted}>Cancel</Text></TouchableOpacity>
                 <TouchableOpacity style={[styles.cmBtnSave, { backgroundColor: '#EA580C' }]} onPress={submitDiscount}><Text style={styles.cmBtnTextWhite}>Apply Discount</Text></TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: CARD_BG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4 },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 32, color: TEXT_DARK, letterSpacing: -1 },
  headerSubtitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#10B981', marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 100 },
  
  card: { backgroundColor: CARD_BG, borderRadius: 20, marginBottom: 14, padding: 16, shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardInactive: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'stretch' },
  image: { width: 70, height: 70, borderRadius: 14, backgroundColor: BORDER_COLOR },
  cardInfoBox: { flex: 1, marginLeft: 14 },
  typeIcon: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  name: { flex: 1, fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_DARK },
  categoryBadge: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#6366F1', marginTop: 2, textTransform: 'uppercase' },
  desc: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED, marginTop: 4, lineHeight: 16 },
  optionsBtn: { padding: 4, backgroundColor: BG_COLOR, borderRadius: 8 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  price: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_DARK },
  discountPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  discountText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#D97706' },
  
  toggleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stockText: { fontFamily: 'Inter-Bold', fontSize: 12 },

  emptyState: { paddingTop: 100, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_MUTED },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: CARD_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  bsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  bsTitle: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_DARK },
  bsOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  bsIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bsOptionText: { fontFamily: 'Inter-Bold', fontSize: 15, color: TEXT_DARK },

  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 20 },
  centerModalBox: { backgroundColor: CARD_BG, borderRadius: 24, padding: 24 },
  cmTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_DARK, marginBottom: 16 },
  cmInput: { backgroundColor: BG_COLOR, borderRadius: 12, paddingHorizontal: 16, height: 48, fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_DARK, marginBottom: 12, borderWidth: 1, borderColor: BORDER_COLOR },
  cmControls: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cmBtnCancel: { flex: 1, height: 44, borderRadius: 12, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },
  cmBtnSave: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  cmBtnTextMuted: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_MUTED },
  cmBtnTextWhite: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#FFF' },
});

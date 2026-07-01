import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, Switch, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { userApi } from '../../services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Search, Trash2, Users, ChevronDown, CheckCircle, SearchX } from 'lucide-react-native';
import { Image } from 'expo-image';
import { resolveImageURL } from '../../lib/image-utils';
import { SkeletonCard } from '../../components/Skeleton';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';
const ACCENT = '#8B5CF6'; // Purple representing users

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const LIMIT = 20;
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const mountedRef = useRef(false);

  // Role Action Sheet
  const [selectedUserForRole, setSelectedUserForRole] = useState<any>(null);

  const fetchUsers = async (pageNum = 1, replace = true) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (pageNum > 1) setLoadingMore(true);
    try {
      const res = await userApi.getAll({ page: pageNum, limit: LIMIT, search: search.trim() || undefined });
      const d: any = res.data || {};
      const list = d.data || (Array.isArray(d) ? d : []);
      setUsers(prev => (replace ? list : [...prev, ...list]));
      pageRef.current = d.page || pageNum;
      setHasMore(!!d.hasMore);
    } catch (e) {
      console.log('Error fetching users:', e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, true);
  }, []);

  // Debounced server-side search (skip initial mount)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    const t = setTimeout(() => { setLoading(users.length === 0); fetchUsers(1, true); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loadingRef.current) fetchUsers(pageRef.current + 1, false);
  };

  const updateUser = async (id: string, data: any) => {
    setUsers(prev => prev.map(u => u._id === id ? { ...u, ...data } : u));
    try {
      await userApi.updateUser(id, data);
    } catch {
      fetchUsers(1, true); // Revert
    }
  };

  const deleteUser = (id: string, name: string) => {
    Alert.alert('Delete User', `Permanently delete account for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await userApi.deleteUser(id);
            setUsers(prev => prev.filter(u => u._id !== id));
          } catch (e) {}
      }}
    ]);
  };

  // Search is applied server-side (see debounced effect above)
  const filteredUsers = users;

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const initials = (item.name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
    
    return (
      <Animated.View entering={FadeInDown.delay(index * 20).duration(400)} style={styles.card}>
        <View style={styles.cardHeader}>
           {item.profileImage ? (
             <Image source={{ uri: resolveImageURL(item.profileImage) }} style={styles.avatar} contentFit="cover" />
           ) : (
             <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{initials}</Text>
             </View>
           )}
           <View style={{ flex: 1 }}>
              <Text style={styles.nameText}>{item.name}</Text>
              <Text style={styles.emailText}>{item.email || 'No email provided'}</Text>
              <Text style={styles.mobileText}>{item.mobile || 'No mobile'}</Text>
           </View>
           <TouchableOpacity onPress={() => deleteUser(item._id, item.name)} style={styles.deleteBtn}>
              <Trash2 size={16} color="#EF4444" />
           </TouchableOpacity>
        </View>

        <View style={styles.cardFooter}>
           {/* Role Selection Dropdown Trigger */}
           <View style={styles.footerBlock}>
              <Text style={styles.footerLabel}>Role</Text>
              <TouchableOpacity style={styles.rolePicker} onPress={() => setSelectedUserForRole(item)}>
                 <Text style={styles.roleText}>{item.role || 'Customer'}</Text>
                 <ChevronDown size={14} color={TEXT_MUTED} />
              </TouchableOpacity>
           </View>

           {/* Active Status */}
           <View style={styles.footerBlockCenter}>
              <Text style={styles.footerLabel}>Status</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Switch
                  value={item.isActive !== false}
                  onValueChange={(val) => updateUser(item._id, { isActive: val })}
                  trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
                  thumbColor={Platform.OS === 'ios' ? '#FFF' : item.isActive !== false ? ACCENT : '#94A3B8'}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
                <Text style={[styles.statusText, { color: item.isActive !== false ? ACCENT : TEXT_MUTED }]}>{item.isActive !== false ? 'Active' : 'Banned'}</Text>
              </View>
           </View>

           {/* COD Status */}
           <View style={[styles.footerBlockCenter, { borderRightWidth: 0 }]}>
              <Text style={styles.footerLabel}>COD Access</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Switch
                  value={!item.isCodDisabled}
                  onValueChange={(val) => updateUser(item._id, { isCodDisabled: !val })}
                  trackColor={{ false: '#FECACA', true: '#D1FAE5' }}
                  thumbColor={Platform.OS === 'ios' ? '#FFF' : !item.isCodDisabled ? '#10B981' : '#EF4444'}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
                <Text style={[styles.statusText, { color: !item.isCodDisabled ? '#10B981' : '#EF4444' }]}>{!item.isCodDisabled ? 'Allowed' : 'Revoked'}</Text>
              </View>
           </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
        <Text style={styles.headerTitle}>User Grid</Text>
        <Text style={styles.headerSubtitle}>Manage accounts & access controls</Text>

        <View style={styles.searchBar}>
           <Search size={16} color={TEXT_MUTED} />
           <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email or mobile..."
              placeholderTextColor={TEXT_MUTED}
              value={search}
              onChangeText={setSearch}
           />
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
           {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <View style={{ paddingVertical: 20 }}><ActivityIndicator color={ACCENT} /></View> : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <SearchX size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No users match your criteria.</Text>
            </View>
          }
        />
      )}

      {/* Role Picker Modal */}
      <Modal visible={!!selectedUserForRole} transparent animationType="fade">
         <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
               <Text style={styles.modalTitle}>Set Account Role</Text>
               <Text style={styles.modalSub}>{selectedUserForRole?.name}</Text>
               
               <View style={{ marginTop: 20, gap: 12 }}>
                 {['Customer', 'Admin', 'Delivery'].map(role => {
                    const isActive = selectedUserForRole?.role === role || (!selectedUserForRole?.role && role === 'Customer');
                    return (
                      <TouchableOpacity 
                        key={role} 
                        style={[styles.roleOption, isActive && styles.roleOptionActive]}
                        onPress={() => {
                          updateUser(selectedUserForRole._id, { role });
                          setSelectedUserForRole(null);
                        }}
                      >
                         <Text style={[styles.roleOptionText, isActive && styles.roleOptionTextActive]}>{role}</Text>
                         {isActive && <CheckCircle size={20} color={ACCENT} />}
                      </TouchableOpacity>
                    );
                 })}
               </View>

               <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedUserForRole(null)}>
                  <Text style={styles.closeModalText}>Cancel</Text>
               </TouchableOpacity>
            </View>
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
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG_COLOR, borderRadius: 14, paddingHorizontal: 16, height: 46, marginTop: 20, borderWidth: 1, borderColor: BORDER_COLOR },
  searchInput: { flex: 1, marginLeft: 10, fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_DARK },

  listContent: { padding: 16, paddingBottom: 40 },
  
  card: { backgroundColor: CARD_BG, borderRadius: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 14 },
  avatarFallback: { width: 50, height: 50, borderRadius: 25, marginRight: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: 'Inter-Black', fontSize: 18, color: '#3B82F6' },
  nameText: { fontFamily: 'Inter-Bold', fontSize: 15, color: TEXT_DARK },
  emailText: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  mobileText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#94A3B8', marginTop: 2 },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },

  cardFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FAFAFA', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  footerBlock: { flex: 1, padding: 12, borderRightWidth: 1, borderRightColor: BORDER_COLOR },
  footerBlockCenter: { flex: 1, padding: 12, borderRightWidth: 1, borderRightColor: BORDER_COLOR, alignItems: 'center' },
  footerLabel: { fontFamily: 'Inter-Bold', fontSize: 10, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  rolePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 },
  roleText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: TEXT_DARK },
  statusText: { fontFamily: 'Inter-Bold', fontSize: 11 },

  emptyState: { paddingTop: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_MUTED },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: CARD_BG, borderRadius: 24, padding: 24 },
  modalTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_DARK },
  modalSub: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_MUTED, marginTop: 4 },
  roleOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, backgroundColor: BG_COLOR, borderWidth: 1, borderColor: 'transparent' },
  roleOptionActive: { backgroundColor: '#F5F3FF', borderColor: ACCENT },
  roleOptionText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: TEXT_DARK },
  roleOptionTextActive: { fontFamily: 'Inter-Bold', color: ACCENT },
  closeModalBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 14 },
  closeModalText: { fontFamily: 'Inter-Bold', fontSize: 15, color: TEXT_MUTED },
});

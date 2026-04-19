import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Platform, Pressable, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Clock, ChevronRight, Package, Bike, CheckCircle2,
  XCircle, ShoppingBag, MessageSquare, ChefHat, ArrowLeft, Star
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { resolveImageURL } from '../../lib/image-utils';
import { useAuthStore } from '../../store/useAuthStore';
import { orderApi, reviewApi } from '../../services/api';

const PRIMARY = '#FC8019';
const TEXT_COLOR = '#1A1A1A';
const MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';
const BG = '#F9FAFB';

// Exact parity with web's STATUS_CONFIG
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  PLACED: { color: '#16A34A', bg: '#DCFCE7', icon: ShoppingBag, label: 'Order Placed' },
  ACCEPTED: { color: '#0891B2', bg: '#CFFAFE', icon: CheckCircle2, label: 'Accepted' },
  PREPARING: { color: '#EA580C', bg: '#FFEDD5', icon: ChefHat, label: 'Preparing' },
  OUT_FOR_DELIVERY: { color: '#9333EA', bg: '#F3E8FF', icon: Bike, label: 'Out for Delivery' },
  DELIVERED: { color: '#16A34A', bg: '#DCFCE7', icon: CheckCircle2, label: 'Delivered' },
  CANCELLED: { color: '#DC2626', bg: '#FEE2E2', icon: XCircle, label: 'Cancelled' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Review System State
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedOrders, setReviewedOrders] = useState<Record<string, boolean>>({});

  const isLoggedIn = !!token && !!user;

  const fetchOrders = async () => {
    if (!isLoggedIn) { setLoading(false); setRefreshing(false); return; }
    try {
      const res = await orderApi.getMyOrders();
      setOrders(res.data.orders || res.data || []);
    } catch (e) {
      console.log('Error fetching orders:', e);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchOrders(); }, [isLoggedIn]));

  const onRefresh = useCallback(() => { setRefreshing(true); fetchOrders(); }, []);

  const onSubmitReview = async () => {
    if (!reviewOrderId || rating === 0 || !comment.trim()) {
      alert("Please provide a rating and a comment.");
      return;
    }
    setSubmittingReview(true);
    try {
      await reviewApi.submitReview({ orderId: reviewOrderId, rating, comment });
      setReviewedOrders(prev => ({ ...prev, [reviewOrderId]: true }));
      setReviewModalVisible(false);
      // Reset Modal State
      setReviewOrderId(null);
      setRating(0);
      setComment('');
    } catch (error: any) {
      alert(error?.response?.data?.message || "Failed to submit review. Try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const getItemsSummary = (items: any[]) => {
    if (!items?.length) return "No items";
    const names = items.map((i: any) => `${i.name || i.product?.name || i.menuItem?.name || "Item"} × ${i.quantity}`);
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const status = (item.status || item.orderStatus || 'PLACED').toUpperCase();
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PLACED;
    const StatusIcon = cfg.icon;

    const date = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    const isDelivered = status === 'DELIVERED';
    
    // Fallbacks
    const billTotal = item.finalTotal || item.finalAmount || item.totalPrice || item.totalAmount || 0;
    const orderRefId = item.customId || `#${(item._id || '').slice(-6).toUpperCase()}`;

    const itemsList = Array.isArray(item.items) && item.items.length > 0 ? item.items : [{}];
    const visibleItems = itemsList.slice(0, 3);
    const hiddenCount = itemsList.length > 3 ? itemsList.length - 3 : 0;

    const firstItemPic = itemsList[0].image || itemsList[0].product?.image || itemsList[0].product?.imageURL || itemsList[0].menuItem?.image || null;
    const imageUri = typeof firstItemPic === 'string' ? firstItemPic : firstItemPic?.url;

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 200)).duration(400)}>
        <Pressable
          style={styles.orderCard}
          onPress={() => router.push(`/orders/${item._id || item.id}`)}
        >
          {/* Top Info Row */}
          <View style={styles.cardTopRow}>
            {/* Left Image Thumbnail */}
            <View style={styles.imageContainer}>
              {imageUri ? (
                <Image source={{ uri: resolveImageURL(imageUri) }} style={styles.itemImage} contentFit="cover" />
              ) : (
                <Image source={require('../../assets/logo/restaurantLOGO.png')} style={styles.itemImage} contentFit="cover" />
              )}
            </View>

            {/* Right Details */}
            <View style={styles.detailsContainer}>
              <View style={styles.restaurantRow}>
                <View style={styles.itemListContainer}>
                  {visibleItems.map((cartItem: any, idx: number) => {
                     const name = cartItem.name || cartItem.product?.name || cartItem.menuItem?.name || cartItem.foodName || "Delicious Meal";
                     const qty = cartItem.quantity || 1;
                     return (
                        <Text 
                           key={idx} 
                           style={idx === 0 ? styles.primaryItemText : styles.secondaryItemText} 
                           numberOfLines={1}
                        >
                          {qty} × {name}
                        </Text>
                     );
                  })}
                </View>

                <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                  <Text style={styles.orderTotal}>₹{Number(billTotal).toFixed(0)}</Text>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
                 {hiddenCount > 0 ? (
                    <View style={styles.extraItemsBadge}>
                       <Text style={styles.extraItemsText}>+ {hiddenCount} more item{hiddenCount > 1 ? 's' : ''}</Text>
                    </View>
                 ) : null}
              </View>

              <Text style={styles.dateText}>{date} • ID: {orderRefId}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Bottom Action Row */}
          <View style={styles.cardBottomRow}>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <StatusIcon size={12} color={cfg.color} strokeWidth={2.5} />
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>

            <View style={styles.bottomRightActions}>
              <TouchableOpacity 
                  onPress={(e) => { e.stopPropagation(); router.push(`/orders/${item._id || item.id}`); }}
                  style={styles.actionBtn}
              >
                  <Text style={styles.actionBtnText}>{isDelivered ? 'View Details' : 'Track Order'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rate Order Section Inline */}
          {isDelivered && !reviewedOrders[item._id || item.id] && (
            <View style={styles.ratingPromptContainer}>
               <Text style={styles.ratingPromptText}>Rate your food experience</Text>
               <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(starVal => (
                     <TouchableOpacity 
                        key={starVal}
                        onPress={(e) => {
                           e.stopPropagation();
                           setReviewOrderId(item._id || item.id);
                           setRating(starVal);
                           setReviewModalVisible(true);
                        }}
                     >
                        <Star size={26} color="#CBD5E1" strokeWidth={1.5} />
                     </TouchableOpacity>
                  ))}
               </View>
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  // ─── Guest State ────────────────────────────────
  if (!isLoggedIn) {
    return (
      <View style={[styles.container, styles.centerWrap]}>
        <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: 'center' }}>
          <View style={styles.emptyIconBox}>
            <Package size={48} color={MUTED} opacity={0.5} />
          </View>
          <Text style={styles.emptyTitle}>Login to view orders</Text>
          <Text style={styles.emptySub}>Track your orders and reorder your favourites</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={22} color={TEXT_COLOR} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>My Orders</Text>
            <Text style={styles.headerSub}>View your past history</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.orderCountBadge}>
            <ShoppingBag size={14} color={PRIMARY} style={{ marginRight: 4 }} />
            <Text style={styles.orderCountText}>{orders.length}</Text>
          </View>
        </View>
      </Animated.View>

      {loading ? (
        <View style={styles.skeletonWrap}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <View style={{ height: 16, width: 90, backgroundColor: BORDER, borderRadius: 4, marginBottom: 12 }} />
              <View style={{ height: 12, width: '60%', backgroundColor: BORDER, borderRadius: 4, marginBottom: 16 }} />
              <View style={{ height: 24, width: '100%', backgroundColor: BORDER, borderRadius: 12 }} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />}
          ListEmptyComponent={
            <View style={[styles.centerWrap, { paddingTop: 80 }]}>
              <View style={styles.emptyIconBox}>
                <Package size={48} color={MUTED} opacity={0.3} />
              </View>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySub}>Your order history will appear here</Text>
              <TouchableOpacity style={styles.browseBtn} onPress={() => router.replace('/(tabs)')}>
                <Text style={styles.browseBtnText}>Browse Menu</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* --- REVIEW MODAL --- */}
      <Modal
         visible={reviewModalVisible}
         transparent
         animationType="slide"
         onRequestClose={() => setReviewModalVisible(false)}
      >
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Rate Order</Text>
                  <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                     <XCircle size={24} color="#64748B" />
                  </TouchableOpacity>
               </View>
               
               <View style={styles.modalStarsRow}>
                  {[1, 2, 3, 4, 5].map(starVal => (
                     <TouchableOpacity key={starVal} onPress={() => setRating(starVal)}>
                        <Star 
                           size={36} 
                           color={starVal <= rating ? '#F59E0B' : '#E2E8F0'} 
                           fill={starVal <= rating ? '#F59E0B' : 'transparent'} 
                           strokeWidth={1.5} 
                        />
                     </TouchableOpacity>
                  ))}
               </View>

               <TextInput
                  style={styles.commentInput}
                  placeholder="Write a detailed review..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  value={comment}
                  onChangeText={setComment}
               />

               <TouchableOpacity 
                  style={[styles.submitReviewBtn, (!rating || !comment.trim().length) && styles.submitReviewBtnDisabled]}
                  disabled={!rating || !comment.trim().length || submittingReview}
                  onPress={onSubmitReview}
               >
                  {submittingReview ? (
                     <ActivityIndicator color="#fff" />
                  ) : (
                     <Text style={styles.submitReviewBtnText}>Submit Review</Text>
                  )}
               </TouchableOpacity>
            </View>
         </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    zIndex: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { justifyContent: 'center' },
  backBtn: {
    padding: 8, marginLeft: -4, borderRadius: 12, backgroundColor: BG,
    borderWidth: 1, borderColor: '#F3F4F6'
  },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_COLOR, letterSpacing: -0.5 },
  headerSub: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED, marginTop: 2 },

  orderCountBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1, borderColor: '#FED7AA'
  },
  orderCountText: { fontFamily: 'Inter-Bold', fontSize: 13, color: PRIMARY },
  listContent: { padding: 16, paddingBottom: 120 },
  orderCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  imageContainer: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: '#F8FAFC',
    overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9',
  },
  itemImage: { width: '100%', height: '100%' },
  fallbackImage: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  detailsContainer: { flex: 1, justifyContent: 'center' },
  
  restaurantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  restaurantName: { fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_COLOR, flex: 1, marginRight: 8, letterSpacing: -0.3 },
  orderTotal: { fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_COLOR },
  
  itemListContainer: { flex: 1, paddingRight: 4, justifyContent: 'center' },
  primaryItemText: { fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_COLOR, marginBottom: 2, letterSpacing: -0.3 },
  secondaryItemText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748B', marginBottom: 2 },

  extraItemsBadge: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  extraItemsText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#475569' },
  
  itemSummary: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748B', lineHeight: 18 },
  dateText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14, borderStyle: 'dashed', borderWidth: 1, borderColor: 'transparent' }, // Dashed effect could be achieved with border variants or image later, standard fine line here.
  
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  statusText: { fontFamily: 'Inter-Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  bottomRightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: PRIMARY, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4
  },
  actionBtnText: { fontFamily: 'Inter-Bold', fontSize: 12, color: '#FFFFFF' },
  rateBtnSecondary: {
    backgroundColor: '#F1F5F9', shadowOpacity: 0, elevation: 0, paddingHorizontal: 12
  },

  // Empty / Skeleton
  skeletonWrap: { padding: 16 },
  skeletonCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: BORDER, opacity: 0.5 },
  emptyIconBox: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: BORDER },
  emptyTitle: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_COLOR, marginBottom: 4 },
  emptySub: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: '80%', lineHeight: 20 },
  loginBtn: { marginTop: 24, backgroundColor: PRIMARY, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14 },
  loginBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: '#FFFFFF' },
  browseBtn: { marginTop: 24, backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 },
  browseBtnText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#FFFFFF' },

  // --- Inline Rate & Modal Styles ---
  ratingPromptContainer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9', alignItems: 'center' },
  ratingPromptText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#475569', marginBottom: 8 },
  starsRow: { flexDirection: 'row', gap: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_COLOR },
  modalStarsRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 24 },
  commentInput: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, height: 120, textAlignVertical: 'top', fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_COLOR, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 },
  submitReviewBtn: { backgroundColor: PRIMARY, paddingVertical: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
  submitReviewBtnDisabled: { backgroundColor: '#CBD5E1', elevation: 0 },
  submitReviewBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#FFF' },
});

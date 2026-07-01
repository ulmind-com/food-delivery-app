import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, RefreshControl, Platform, TextInput, Alert, Modal, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { menuApi, adminApi, restaurantApi } from '../../services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Search, Plus, Minus, Trash2, Receipt, X, Tag, Percent, IndianRupee, Printer } from 'lucide-react-native';
import { Image } from 'expo-image';
import { resolveImageURL } from '../../lib/image-utils';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';
const ACCENT = '#16A34A'; // Green for POS

const formatDateTime = (d?: string) => {
  try {
    return new Date(d || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
};

export default function AdminPOSScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'TERMINAL' | 'HISTORY'>('TERMINAL');

  const [menu, setMenu] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENTAGE'>('FLAT');
  const [discountValue, setDiscountValue] = useState('');
  const [generating, setGenerating] = useState(false);

  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const HIST_LIMIT = 20;
  const histPageRef = useRef(1);
  const histLoadingRef = useRef(false);

  const fetchMenu = async () => {
    try {
      const [menuRes, restRes] = await Promise.all([menuApi.getMenu(), restaurantApi.get().catch(() => ({ data: null }))]);
      setMenu(menuRes.data || []);
      setRestaurant(restRes.data);
    } catch (e) {
      console.log('Error fetching POS menu:', e);
    } finally {
      setLoadingMenu(false);
    }
  };

  const fetchHistory = async (pageNum = 1, replace = true) => {
    if (histLoadingRef.current) return;
    histLoadingRef.current = true;
    if (pageNum === 1) setLoadingHistory(true); else setLoadingMoreHistory(true);
    try {
      const res = await adminApi.getPOSOrders({ page: pageNum, limit: HIST_LIMIT });
      const d: any = res.data || {};
      const list = d.data || (Array.isArray(d) ? d : []);
      setHistory(prev => (replace ? list : [...prev, ...list]));
      histPageRef.current = d.page || pageNum;
      setHistoryHasMore(!!d.hasMore);
    } catch (e) {
      console.log('Error fetching POS history:', e);
    } finally {
      histLoadingRef.current = false;
      setLoadingHistory(false);
      setLoadingMoreHistory(false);
    }
  };

  const loadMoreHistory = () => {
    if (historyHasMore && !histLoadingRef.current) fetchHistory(histPageRef.current + 1, false);
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  useEffect(() => {
    if (mode === 'HISTORY') fetchHistory();
  }, [mode]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    menu.forEach((m) => { if (m.category?.name) set.add(m.category.name); });
    return Array.from(set);
  }, [menu]);

  const filteredMenu = useMemo(() => {
    return menu.filter((m) => {
      const matchSearch = m.name?.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'All' || m.category?.name === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [menu, search, selectedCategory]);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id);
      if (existing) return prev.map((i) => (i._id === product._id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i));
      const basePrice = product.variants?.length ? product.variants[0].price : product.price;
      return [...prev, { ...product, cartQuantity: 1, selectedPrice: basePrice }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((i) => {
      if (i._id === id) {
        const q = i.cartQuantity + delta;
        return q > 0 ? { ...i, cartQuantity: q } : i;
      }
      return i;
    }));
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i._id !== id));

  const cartTotal = useMemo(() => cart.reduce((t, i) => t + i.selectedPrice * i.cartQuantity, 0), [cart]);
  const taxTotal = useMemo(() => cart.reduce((t, i) => {
    const base = i.selectedPrice * i.cartQuantity;
    return t + (base * (i.cgst || 0)) / 100 + (base * (i.sgst || 0)) / 100 + (base * (i.igst || 0)) / 100;
  }, 0), [cart]);
  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (val <= 0) return 0;
    const sub = cartTotal + taxTotal;
    return discountType === 'FLAT' ? Math.min(val, sub) : Math.min((sub * val) / 100, sub);
  }, [cartTotal, taxTotal, discountType, discountValue]);
  const grandTotal = Math.ceil(cartTotal + taxTotal - discountAmount);
  const cartCount = cart.reduce((s, i) => s + i.cartQuantity, 0);

  const handleGenerateBill = async () => {
    if (cart.length === 0) return Alert.alert('Empty', 'Cart is empty');
    setGenerating(true);
    const snap: Record<string, string> = {};
    cart.forEach((i) => { snap[i._id] = i.name; });
    try {
      const res = await adminApi.createPOSOrder({
        customerName,
        customerMobile,
        paymentMethod,
        discountType: parseFloat(discountValue) > 0 ? discountType : 'NONE',
        discountValue: parseFloat(discountValue) || 0,
        items: cart.map((i) => ({ product: i._id, variant: 'Standard', quantity: i.cartQuantity })),
      } as any);
      setNameMap(snap);
      setLastOrder(res.data);
      setShowCart(false);
      setShowReceipt(true);
      setCart([]);
      setCustomerName('');
      setCustomerMobile('');
      setPaymentMethod('CASH');
      setDiscountType('FLAT');
      setDiscountValue('');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to generate bill');
    } finally {
      setGenerating(false);
    }
  };

  const openReceipt = (order: any) => {
    setLastOrder(order);
    const snap: Record<string, string> = {};
    (order.items || []).forEach((it: any) => {
      const id = typeof it.product === 'object' ? it.product?._id : it.product;
      const nm = typeof it.product === 'object' ? it.product?.name : it.name;
      if (id) snap[id] = nm || it.name || 'Item';
    });
    setNameMap(snap);
    setShowReceipt(true);
  };

  const renderProduct = ({ item, index }: { item: any; index: number }) => {
    const price = item.variants?.[0]?.price || item.price || 0;
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 25).duration(350)} style={styles.productCardWrap}>
        <TouchableOpacity style={styles.productCard} activeOpacity={0.85} onPress={() => addToCart(item)}>
          <View style={styles.productImgWrap}>
            <Image source={{ uri: resolveImageURL(item.imageURL) }} style={styles.productImg} contentFit="cover" />
            <View style={styles.addBadge}><Plus size={14} color="#FFF" /></View>
          </View>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>₹{price}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.headerTitle}>Point of Sale</Text>
            <Text style={styles.headerSubtitle}>Offline billing terminal</Text>
          </View>
          <View style={styles.modeToggle}>
            <TouchableOpacity style={[styles.modeBtn, mode === 'TERMINAL' && styles.modeBtnActive]} onPress={() => setMode('TERMINAL')}>
              <Text style={[styles.modeText, mode === 'TERMINAL' && styles.modeTextActive]}>Terminal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, mode === 'HISTORY' && styles.modeBtnActive]} onPress={() => setMode('HISTORY')}>
              <Text style={[styles.modeText, mode === 'HISTORY' && styles.modeTextActive]}>History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {mode === 'TERMINAL' ? (
        <>
          {/* Search + categories */}
          <View style={styles.searchSection}>
            <View style={styles.searchBox}>
              <Search size={18} color={TEXT_MUTED} />
              <TextInput style={styles.searchInput} placeholder="Search products..." value={search} onChangeText={setSearch} placeholderTextColor="#94A3B8" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
              {categories.map((cat) => (
                <TouchableOpacity key={cat} style={[styles.catChip, selectedCategory === cat && styles.catChipActive]} onPress={() => setSelectedCategory(cat)}>
                  <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {loadingMenu ? (
            <View style={{ paddingTop: 40 }}><ActivityIndicator color={ACCENT} size="large" /></View>
          ) : (
            <FlatList
              data={filteredMenu}
              keyExtractor={(item) => item._id}
              renderItem={renderProduct}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={styles.menuList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<Text style={styles.emptyInline}>No products found.</Text>}
            />
          )}

          {/* Cart FAB */}
          {cartCount > 0 && (
            <TouchableOpacity style={[styles.cartFab, { bottom: insets.bottom + 16 }]} onPress={() => setShowCart(true)} activeOpacity={0.9}>
              <Receipt size={22} color="#FFF" />
              <Text style={styles.cartFabText}>{cartCount} Items</Text>
              <Text style={styles.cartFabTotal}>₹{grandTotal}</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        /* HISTORY */
        loadingHistory ? (
          <View style={{ paddingTop: 40 }}><ActivityIndicator color={ACCENT} size="large" /></View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={loadingHistory} onRefresh={() => fetchHistory(1, true)} tintColor={ACCENT} />}
            onEndReached={loadMoreHistory}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loadingMoreHistory ? <View style={{ paddingVertical: 20 }}><ActivityIndicator color={ACCENT} /></View> : null}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 25).duration(350)} style={styles.histCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histId}>{item.customId || item._id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.histDate}>{formatDateTime(item.createdAt)}</Text>
                  <Text style={styles.histCust}>{item.customerName || 'Walk-in'} {item.customerMobile ? `· ${item.customerMobile}` : ''}</Text>
                  <Text style={styles.histMeta}>{item.items?.length || 0} items · {item.paymentMethod}{item.discountApplied > 0 ? ` · Disc ₹${item.discountApplied?.toFixed(0)}` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <Text style={styles.histAmount}>₹{(item.finalAmount || 0).toFixed(0)}</Text>
                  <TouchableOpacity style={styles.reprintBtn} onPress={() => openReceipt(item)}>
                    <Printer size={16} color={ACCENT} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Receipt size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No offline bills generated yet.</Text>
              </View>
            }
          />
        )
      )}

      {/* Cart Drawer */}
      <Modal visible={showCart} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: BG_COLOR }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitleText}>Current Bill</Text>
            <TouchableOpacity onPress={() => setShowCart(false)} style={styles.closeBtn}>
              <X size={20} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {cart.length === 0 ? (
              <View style={styles.emptyState}><Receipt size={40} color="#CBD5E1" /><Text style={styles.emptyText}>No items added yet</Text></View>
            ) : (
              cart.map((item) => (
                <View key={item._id} style={styles.cartItem}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>₹{item.selectedPrice}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <TouchableOpacity onPress={() => updateQty(item._id, -1)} style={styles.qtyBtn}><Minus size={14} color={TEXT_DARK} /></TouchableOpacity>
                    <Text style={styles.qtyText}>{item.cartQuantity}</Text>
                    <TouchableOpacity onPress={() => updateQty(item._id, 1)} style={styles.qtyBtn}><Plus size={14} color={TEXT_DARK} /></TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeFromCart(item._id)} style={styles.cartDelBtn}><Trash2 size={16} color="#EF4444" /></TouchableOpacity>
                </View>
              ))
            )}

            {cart.length > 0 && (
              <View style={styles.checkoutSection}>
                <View style={styles.rowInputs}>
                  <TextInput style={[styles.smallInput, { flex: 1 }]} placeholder="Customer Name" value={customerName} onChangeText={setCustomerName} placeholderTextColor="#94A3B8" />
                  <TextInput style={[styles.smallInput, { flex: 1 }]} placeholder="Phone" value={customerMobile} onChangeText={setCustomerMobile} keyboardType="phone-pad" placeholderTextColor="#94A3B8" />
                </View>

                {/* Payment */}
                <View style={styles.segment}>
                  {['CASH', 'UPI', 'CARD'].map((m) => (
                    <TouchableOpacity key={m} style={[styles.segmentBtn, paymentMethod === m && styles.segmentBtnActive]} onPress={() => setPaymentMethod(m)}>
                      <Text style={[styles.segmentText, paymentMethod === m && { color: ACCENT }]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Discount */}
                <View style={styles.discountRow}>
                  <View style={styles.discTypeBox}>
                    <TouchableOpacity style={[styles.discTypeBtn, discountType === 'FLAT' && styles.discTypeActive]} onPress={() => setDiscountType('FLAT')}>
                      <IndianRupee size={13} color={discountType === 'FLAT' ? ACCENT : TEXT_MUTED} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.discTypeBtn, discountType === 'PERCENTAGE' && styles.discTypeActive]} onPress={() => setDiscountType('PERCENTAGE')}>
                      <Percent size={13} color={discountType === 'PERCENTAGE' ? ACCENT : TEXT_MUTED} />
                    </TouchableOpacity>
                  </View>
                  <TextInput style={[styles.smallInput, { flex: 1 }]} placeholder={discountType === 'FLAT' ? 'Discount Amount (₹)' : 'Discount Percent (%)'} value={discountValue} onChangeText={setDiscountValue} keyboardType="numeric" placeholderTextColor="#94A3B8" />
                </View>

                {/* Totals */}
                <View style={styles.totalsBox}>
                  <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalVal}>₹{cartTotal.toFixed(2)}</Text></View>
                  <View style={styles.totalRow}><Text style={styles.totalLabel}>Taxes (GST)</Text><Text style={styles.totalVal}>₹{taxTotal.toFixed(2)}</Text></View>
                  {discountAmount > 0 && (
                    <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: ACCENT }]}>Discount</Text><Text style={[styles.totalVal, { color: ACCENT }]}>-₹{discountAmount.toFixed(2)}</Text></View>
                  )}
                  <View style={[styles.totalRow, styles.grandRow]}><Text style={styles.grandLabel}>Total</Text><Text style={styles.grandVal}>₹{grandTotal.toFixed(2)}</Text></View>
                </View>

                <TouchableOpacity style={[styles.generateBtn, generating && { opacity: 0.7 }]} onPress={handleGenerateBill} disabled={generating}>
                  {generating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.generateBtnText}>GENERATE BILL</Text>}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={showReceipt} animationType="fade" transparent>
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.rcName}>{restaurant?.name || 'FOODIE DELIGHT'}</Text>
              <Text style={styles.rcLine}>{restaurant?.address || ''}</Text>
              {!!restaurant?.mobile && <Text style={styles.rcLine}>Ph: {restaurant.mobile}</Text>}
              {!!restaurant?.gstIn && <Text style={styles.rcLine}>GSTIN: {restaurant.gstIn}</Text>}

              <View style={styles.rcDivider} />
              <Text style={styles.rcMeta}>Date: {formatDateTime(lastOrder?.createdAt)}</Text>
              <Text style={styles.rcMeta}>Order #: {lastOrder?.customId}</Text>
              <Text style={styles.rcMeta}>Customer: {lastOrder?.customerName || 'Walk-in'}</Text>

              <View style={styles.rcDivider} />
              <View style={styles.rcItemHead}>
                <Text style={[styles.rcItemHeadText, { flex: 1 }]}>Item</Text>
                <Text style={[styles.rcItemHeadText, { width: 30, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.rcItemHeadText, { width: 70, textAlign: 'right' }]}>Price</Text>
              </View>
              {(lastOrder?.items || []).map((it: any, idx: number) => {
                const id = typeof it.product === 'object' ? it.product?._id : it.product;
                return (
                  <View key={idx} style={styles.rcItemRow}>
                    <Text style={[styles.rcItemText, { flex: 1 }]} numberOfLines={2}>{nameMap[id] || it.name || 'Item'}</Text>
                    <Text style={[styles.rcItemText, { width: 30, textAlign: 'center' }]}>{it.quantity}</Text>
                    <Text style={[styles.rcItemText, { width: 70, textAlign: 'right' }]}>₹{((it.price || 0) * it.quantity).toFixed(2)}</Text>
                  </View>
                );
              })}

              <View style={styles.rcDivider} />
              <View style={styles.totalRow}><Text style={styles.rcMeta}>Sub Total</Text><Text style={styles.rcMeta}>₹{(lastOrder?.totalAmount || 0).toFixed(2)}</Text></View>
              <View style={styles.totalRow}><Text style={styles.rcMeta}>Taxes (GST)</Text><Text style={styles.rcMeta}>₹{(lastOrder?.taxAmount || 0).toFixed(2)}</Text></View>
              {lastOrder?.discountApplied > 0 && (
                <View style={styles.totalRow}><Text style={[styles.rcMeta, { color: ACCENT }]}>Discount</Text><Text style={[styles.rcMeta, { color: ACCENT }]}>-₹{(lastOrder.discountApplied || 0).toFixed(2)}</Text></View>
              )}
              <View style={[styles.totalRow, { marginTop: 6 }]}><Text style={styles.rcTotal}>TOTAL</Text><Text style={styles.rcTotal}>₹{(lastOrder?.finalAmount || 0).toFixed(2)}</Text></View>

              <View style={styles.rcDivider} />
              <Text style={styles.rcMeta}>Paid By: {lastOrder?.paymentMethod}</Text>
              <Text style={styles.rcThanks}>THANK YOU!</Text>
              <Text style={[styles.rcLine, { textAlign: 'center' }]}>Please Visit Again</Text>
            </ScrollView>

            <TouchableOpacity style={styles.receiptCloseBtn} onPress={() => setShowReceipt(false)}>
              <Text style={styles.receiptCloseText}>DONE</Text>
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
  headerTitle: { fontFamily: 'Jakarta-ExtraBold', fontSize: 24, color: TEXT_DARK, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'Inter-Bold', fontSize: 12, color: ACCENT, marginTop: 2 },
  modeToggle: { flexDirection: 'row', backgroundColor: BG_COLOR, borderRadius: 12, padding: 3 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 },
  modeBtnActive: { backgroundColor: CARD_BG, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  modeText: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_MUTED },
  modeTextActive: { color: TEXT_DARK },

  searchSection: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: BG_COLOR },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CARD_BG, borderRadius: 12, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: BORDER_COLOR },
  searchInput: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 14, color: TEXT_DARK },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_COLOR },
  catChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  catChipText: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_MUTED },
  catChipTextActive: { color: '#FFF' },

  menuList: { padding: 16, paddingBottom: 120, gap: 12 },
  productCardWrap: { flex: 1 },
  productCard: { flex: 1, backgroundColor: CARD_BG, borderRadius: 16, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  productImgWrap: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F1F5F9', marginBottom: 8 },
  productImg: { width: '100%', height: '100%' },
  addBadge: { position: 'absolute', bottom: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  productName: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_DARK, minHeight: 34 },
  productPrice: { fontFamily: 'Inter-Black', fontSize: 15, color: ACCENT, marginTop: 4 },

  emptyInline: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED, textAlign: 'center', paddingVertical: 30 },

  cartFab: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 58, backgroundColor: ACCENT, borderRadius: 18, shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  cartFabText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#FFF' },
  cartFabTotal: { fontFamily: 'Inter-Black', fontSize: 16, color: '#FFF', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.3)', paddingLeft: 12 },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: CARD_BG, borderBottomColor: BORDER_COLOR, borderBottomWidth: 1 },
  modalTitleText: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_DARK },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },

  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: BORDER_COLOR },
  cartItemName: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_DARK },
  cartItemPrice: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: ACCENT, marginTop: 2 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG_COLOR, borderRadius: 10 },
  qtyBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontFamily: 'Inter-Black', fontSize: 14, color: TEXT_DARK, width: 26, textAlign: 'center' },
  cartDelBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  checkoutSection: { marginTop: 8, gap: 12 },
  rowInputs: { flexDirection: 'row', gap: 10 },
  smallInput: { height: 46, backgroundColor: CARD_BG, borderRadius: 10, paddingHorizontal: 12, fontFamily: 'Inter-SemiBold', fontSize: 14, color: TEXT_DARK, borderWidth: 1, borderColor: BORDER_COLOR },
  segment: { flexDirection: 'row', gap: 8, backgroundColor: BG_COLOR, borderRadius: 12, padding: 4 },
  segmentBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 9 },
  segmentBtnActive: { backgroundColor: CARD_BG, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  segmentText: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_MUTED },

  discountRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  discTypeBox: { flexDirection: 'row', backgroundColor: BG_COLOR, borderRadius: 10, padding: 3 },
  discTypeBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  discTypeActive: { backgroundColor: CARD_BG, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },

  totalsBox: { backgroundColor: CARD_BG, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER_COLOR, gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED },
  totalVal: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: TEXT_DARK },
  grandRow: { borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingTop: 8, marginTop: 4 },
  grandLabel: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_DARK },
  grandVal: { fontFamily: 'Inter-Black', fontSize: 20, color: ACCENT },

  generateBtn: { height: 56, backgroundColor: ACCENT, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  generateBtnText: { fontFamily: 'Inter-Black', fontSize: 15, color: '#FFF', letterSpacing: 1 },

  emptyState: { paddingTop: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_MUTED, marginTop: 12 },

  histCard: { flexDirection: 'row', backgroundColor: CARD_BG, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  histId: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_DARK },
  histDate: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  histCust: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: TEXT_DARK, marginTop: 6 },
  histMeta: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED, marginTop: 3 },
  histAmount: { fontFamily: 'Inter-Black', fontSize: 20, color: ACCENT },
  reprintBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },

  receiptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  receiptCard: { width: '100%', maxWidth: 360, maxHeight: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 24 },
  rcName: { fontFamily: 'Inter-Black', fontSize: 22, color: '#000', textAlign: 'center' },
  rcLine: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#444', textAlign: 'center', marginTop: 2 },
  rcDivider: { borderBottomWidth: 1, borderBottomColor: '#E2E8F0', borderStyle: 'dashed', marginVertical: 10 },
  rcMeta: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#333' },
  rcItemHead: { flexDirection: 'row', marginBottom: 6 },
  rcItemHeadText: { fontFamily: 'Inter-Black', fontSize: 11, color: '#000' },
  rcItemRow: { flexDirection: 'row', marginBottom: 4 },
  rcItemText: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#333' },
  rcTotal: { fontFamily: 'Inter-Black', fontSize: 16, color: '#000' },
  rcThanks: { fontFamily: 'Inter-Black', fontSize: 14, color: '#000', textAlign: 'center', marginTop: 10, letterSpacing: 2 },
  receiptCloseBtn: { height: 50, backgroundColor: '#000', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  receiptCloseText: { fontFamily: 'Inter-Black', fontSize: 14, color: '#FFF', letterSpacing: 1 },
});

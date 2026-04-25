import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Platform, UIManager, Modal, ScrollView, TextInput,
  Alert, ActivityIndicator, Linking, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminApi } from '../../services/api';
import { socket } from '../../services/socket';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SkeletonCard } from '../../components/Skeleton';
import { SwipeButton } from '../../components/SwipeButton';
import {
  ClipboardList, CheckCircle, Clock, Package, Truck, XCircle,
  Eye, X, MapPin, Phone, Mail, Search, Tag, ChefHat, 
  ArrowLeftRight, ShoppingBag, Download, Calendar, ArrowRight,
  TrendingUp, CreditCard, ChevronDown, FileText
} from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

// ─── Super Modern Palette ───
const BG_COLOR = '#F5F7FA'; // Ultra clean soft gray-blue
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';

const PRIMARY_GRADIENT = ['#FF4122', '#F96C00']; // Zomato/Swiggy premium feel
const ACCEPTED_GRADIENT = ['#0EA5E9', '#0284C7'];
const PREPARING_GRADIENT = ['#8B5CF6', '#6D28D9'];
const DELIVERY_GRADIENT = ['#EC4899', '#BE185D'];
const SUCCESS_GRADIENT = ['#10B981', '#059669'];
const DANGER_GRADIENT = ['#F43F5E', '#E11D48'];

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]}, ${hours}:${minutes}${ampm}`;
};

// ─── Sexy Modern Button ───
const ModernGradientButton = ({ label, colors, onPress, icon: Icon, disabled }: any) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={disabled} style={{ flex: 1, minHeight: 44, opacity: disabled ? 0.7 : 1 }}>
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modernBtnGradient}>
      {Icon && <Icon size={16} color="#FFF" style={{ marginRight: 6 }} />}
      <Text style={styles.modernBtnText}>{label}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

export default function AdminOrders() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mode, setMode] = useState<'ORDERS' | 'REFUNDS'>('ORDERS');
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [prepTimeInput, setPrepTimeInput] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = filterStatus === 'ALL' ? await adminApi.getOrders() : await adminApi.getOrdersByStatus(filterStatus);
      setOrders(res.data.orders || res.data || []);
    } catch (e) { console.log(e); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchOrders(); }, [filterStatus]);

  useEffect(() => {
    const handleUpdate = () => fetchOrders();
    socket.on('adminOrderUpdated', handleUpdate);
    socket.on('adminRefundUpdated', handleUpdate);
    socket.on('newOrder', handleUpdate);
    return () => { socket.off('adminOrderUpdated', handleUpdate); socket.off('adminRefundUpdated', handleUpdate); socket.off('newOrder', handleUpdate); };
  }, []);

  const onRefresh = () => { setRefreshing(true); fetchOrders(); };

  // ─── Actions ───
  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    setOrders(prev => prev.map(o => o._id === id ? { ...o, status: newStatus, orderStatus: newStatus } : o));
    if (selectedOrder?._id === id) setSelectedOrder({ ...selectedOrder, status: newStatus, orderStatus: newStatus });
    try { await adminApi.updateOrderStatus(id, { status: newStatus }); } catch (e) {} finally { setUpdatingId(null); }
  };

  const cancelOrder = (id: string, customId: string) => {
    const doCancel = () => updateStatus(id, 'CANCELLED');
    if (Platform.OS === 'web') { if (window.confirm(`Cancel order ${customId}?`)) doCancel(); } 
    else Alert.alert('Cancel Order', `Cancel ${customId}?`, [{ text: 'Keep', style: 'cancel' }, { text: 'Cancel', style: 'destructive', onPress: doCancel }]);
  };

  const updatePaymentStatus = async (id: string, paymentStatus: string) => {
    setOrders(prev => prev.map(o => o._id === id ? { ...o, paymentStatus } : o));
    if (selectedOrder?._id === id) setSelectedOrder({ ...selectedOrder, paymentStatus });
    try { await adminApi.updatePaymentStatus(id, { paymentStatus }); } catch (e) {}
  };

  const setPrepTime = async (id: string, time: number) => {
    setUpdatingId(id);
    setOrders(prev => prev.map(o => {
      if (o._id === id) {
        const newStatus = ['ACCEPTED'].includes((o.orderStatus || o.status || '').toUpperCase()) ? 'PREPARING' : (o.orderStatus || o.status);
        return { ...o, preparationTime: time, status: newStatus, orderStatus: newStatus };
      }
      return o;
    }));
    if (selectedOrder?._id === id) {
      const newStatus = ['ACCEPTED'].includes((selectedOrder.orderStatus || selectedOrder.status || '').toUpperCase()) ? 'PREPARING' : (selectedOrder.orderStatus || selectedOrder.status);
      setSelectedOrder({ ...selectedOrder, preparationTime: time, status: newStatus, orderStatus: newStatus });
    }
    try { await adminApi.updatePreparationTime(id, { preparationTime: time }); } catch (e) {} finally { setUpdatingId(null); }
  };

  const processRefund = async (id: string) => {
    setOrders(prev => prev.map(o => o._id === id ? { ...o, refundStatus: 'PROCESSED', refundProcessedAt: new Date().toISOString() } : o));
    if (selectedOrder?._id === id) setSelectedOrder({ ...selectedOrder, refundStatus: 'PROCESSED', refundProcessedAt: new Date().toISOString() });
    try { await adminApi.processRefund(id); } catch (e) {}
  };

  // ─── Export CSV ───
  const exportCSV = async () => {
    if (!filtered.length) return Platform.OS === 'web' ? alert('No data') : Alert.alert('Error', 'No data');
    const headers = ["ID", "Customer", "Mobile", "Items", "Total", "Status", "Pay Method", "Pay Status", "Date"];
    const rows = filtered.map(o => [
      o.customId || o._id, o.customer?.name || o.user?.name || "Guest", o.customer?.mobile || o.deliveryAddress?.mobile || "",
      o.items?.map((i:any) => `${i.name || i.product?.name} x${i.quantity}`).join("; "), o.finalAmount || o.totalAmount,
      o.status || o.orderStatus, o.paymentMethod || "COD", o.paymentStatus || "PENDING", new Date(o.createdAt).toLocaleDateString(),
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `orders_export.csv`; link.click();
    } else {
      const fileUri = FileSystem.documentDirectory + `orders_export.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri);
    }
  };

  // ─── Filtering ───
  const filtered = (mode === 'REFUNDS' ? orders.filter((o: any) => ['CANCELLED'].includes((o.orderStatus || o.status || '').toUpperCase()) && o.paymentMethod === 'ONLINE' && o.paymentStatus === 'PAID') : orders)
  .filter((o: any) => {
    if (mode === 'ORDERS' && filterStatus !== 'ALL' && (o.status || o.orderStatus || '').toUpperCase() !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!(o._id?.toLowerCase().includes(q) || o.customId?.toLowerCase().includes(q) || o.customer?.name?.toLowerCase().includes(q) || o.customer?.mobile?.includes(q) || o.deliveryAddress?.mobile?.includes(q))) return false;
    }
    const d = new Date(o.createdAt);
    if (startDate) { const s = new Date(startDate); s.setHours(0,0,0,0); if (d < s) return false; }
    if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); if (d > e) return false; }
    return true;
  }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const statusCounts: Record<string, number> = {};
  ['PLACED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].forEach(s => { statusCounts[s] = orders.filter((o: any) => (o.status || o.orderStatus || '').toUpperCase() === s).length; });
  const pendingRefunds = orders.filter((o: any) => ['CANCELLED'].includes((o.orderStatus || o.status || '').toUpperCase()) && o.paymentMethod === 'ONLINE' && o.paymentStatus === 'PAID' && o.refundStatus === 'PENDING').length;

  // ─── Renders ───
  const renderOrderCard = ({ item: order, index }: { item: any; index: number }) => {
    const statusKey = (order.status || order.orderStatus || 'PLACED').toUpperCase();
    const isPlaced = statusKey === 'PLACED';
    
    // Status color mapping for pills
    const statusColorTheme = isPlaced ? PRIMARY_GRADIENT :
                             statusKey === 'ACCEPTED' ? ACCEPTED_GRADIENT :
                             statusKey === 'PREPARING' ? PREPARING_GRADIENT :
                             statusKey === 'OUT_FOR_DELIVERY' ? DELIVERY_GRADIENT :
                             statusKey === 'DELIVERED' ? SUCCESS_GRADIENT : DANGER_GRADIENT;

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 30, 300)).duration(400)} style={styles.modernCard}>
        {/* Top Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.iconBox}>
               {statusKey === 'DELIVERED' ? <CheckCircle size={16} color="#10B981" /> :
                statusKey === 'CANCELLED' ? <XCircle size={16} color="#F43F5E" /> : 
                <Clock size={16} color={PRIMARY_GRADIENT[0]} />}
            </View>
            <View>
              <Text style={styles.orderIdText}>{order.customId || `#${order._id?.slice(-6).toUpperCase()}`}</Text>
              <Text style={styles.timeText}>{formatDate(order.createdAt)}</Text>
            </View>
          </View>
          <LinearGradient colors={statusColorTheme} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ultraPill}>
            <Text style={styles.ultraPillText}>{statusKey.replace(/_/g, ' ')}</Text>
          </LinearGradient>
        </View>

        {/* Customer & Price */}
        <View style={styles.cardMain}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerNameText}>{order.customer?.name || order.user?.name || 'Guest'}</Text>
            <Text style={styles.customerDetailText}>{order.customer?.mobile || order.deliveryAddress?.mobile || ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.hugePriceText}>₹{Number(order.finalAmount || order.totalAmount || 0).toFixed(2)}</Text>
            <View style={styles.paymentMethodPill}>
              <CreditCard size={10} color={TEXT_MUTED} />
              <Text style={styles.paymentMethodText}>{order.paymentMethod || 'COD'} • {order.paymentStatus || 'PENDING'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.modernDivider} />
        
        {/* Basic Items Summary */}
        <Text style={styles.itemsMutedText} numberOfLines={1}>
           {order.items?.map((i: any) => `${i.quantity}x ${i.name || i.product?.name}`).join(', ') || 'No item details'}
        </Text>

        {/* Action Dock */}
        <View style={styles.actionDock}>
           {statusKey === 'PLACED' && (
             <View style={styles.actionGrid}>
                <ModernGradientButton label="ACCEPT ORDER" colors={ACCEPTED_GRADIENT} onPress={() => updateStatus(order._id, 'ACCEPTED')} icon={CheckCircle} />
                <TouchableOpacity style={styles.minimalRejectBtn} onPress={() => cancelOrder(order._id, order.customId || `#${order._id?.slice(-6)}`)}>
                   <Text style={styles.minimalRejectText}>REJECT</Text>
                </TouchableOpacity>
             </View>
           )}
           {statusKey === 'ACCEPTED' && <ModernGradientButton label="START PREPARING" colors={PREPARING_GRADIENT} onPress={() => updateStatus(order._id, 'PREPARING')} icon={ChefHat} />}
           {statusKey === 'PREPARING' && <ModernGradientButton label="DISPATCH DELIVERY" colors={DELIVERY_GRADIENT} onPress={() => updateStatus(order._id, 'OUT_FOR_DELIVERY')} icon={Truck} />}
           {statusKey === 'OUT_FOR_DELIVERY' && <ModernGradientButton label="MARK DELIVERED" colors={SUCCESS_GRADIENT} onPress={() => updateStatus(order._id, 'DELIVERED')} icon={CheckCircle} />}
           
           <TouchableOpacity style={styles.inspectBtn} onPress={() => setSelectedOrder(order)}>
             <ArrowRight size={18} color="#0F172A" />
           </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderRefundCard = ({ item: order, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(400)} style={styles.modernCard}>
      <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#FFE4E6' }]}><ArrowLeftRight size={16} color="#E11D48" /></View>
            <View>
              <Text style={styles.orderIdText}>{order.customId || `#${order._id?.slice(-6).toUpperCase()}`}</Text>
              <Text style={styles.timeText}>{formatDate(order.createdAt)}</Text>
            </View>
          </View>
          <LinearGradient colors={order.refundStatus === 'PROCESSED' ? SUCCESS_GRADIENT : DANGER_GRADIENT} style={styles.ultraPill}>
            <Text style={styles.ultraPillText}>{order.refundStatus === 'PROCESSED' ? 'PROCESSED' : 'PENDING'}</Text>
          </LinearGradient>
      </View>
      <View style={styles.cardMain}>
        <View style={{ flex: 1 }}>
            <Text style={styles.customerNameText}>{order.customer?.name || order.user?.name || 'Guest'}</Text>
            <Text style={styles.customerDetailText}>{order.customer?.mobile || ''}</Text>
        </View>
        <Text style={[styles.hugePriceText, { color: '#E11D48' }]}>₹{Number(order.finalAmount || order.totalAmount || 0).toFixed(2)}</Text>
      </View>
      <View style={styles.actionDock}>
          {order.refundStatus !== 'PROCESSED' ? (
             <ModernGradientButton label="PROCESS REFUND NOW" colors={SUCCESS_GRADIENT} onPress={() => processRefund(order._id)} />
          ) : <View style={{flex: 1}} />}
          <TouchableOpacity style={styles.inspectBtn} onPress={() => setSelectedOrder(order)}>
             <ArrowRight size={18} color="#0F172A" />
          </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const OrderDetailModal = () => {
    if (!selectedOrder) return null;
    const addr = selectedOrder.deliveryAddress;
    const addressStr = typeof addr === 'object' && addr
      ? [addr.addressLine1 || addr.houseNo, addr.addressLine2 || addr.street, addr.city, addr.postalCode].filter(Boolean).join(', ')
      : (selectedOrder.address || addr || 'N/A');
    const modalStatus = (selectedOrder.status || selectedOrder.orderStatus || 'PLACED').toUpperCase();

    return (
      <Modal visible={!!selectedOrder} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedOrder(null)}>
        <View style={[styles.modalContainer, { paddingTop: Platform.OS === 'ios' ? insets.top : 10 }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
             <View>
               <Text style={styles.modalTitleText}>Order {selectedOrder.customId || selectedOrder._id?.slice(-6).toUpperCase()}</Text>
               <Text style={styles.modalDateText}>{formatDate(selectedOrder.createdAt)}</Text>
             </View>
             <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedOrder(null)}>
               <X size={20} color={TEXT_DARK} />
             </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            
            {modalStatus === 'CANCELLED' && (
               <View style={[styles.modernCardLight, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, marginBottom: 16 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                     <XCircle size={16} color="#EF4444" />
                     <Text style={[styles.cardTitleLight, { color: '#B91C1C' }]}>Cancellation Reason</Text>
                  </View>
                  <Text style={[styles.secondaryText, { color: '#991B1B', marginTop: 4 }]}>{selectedOrder.cancellationReason || "No reason provided."}</Text>
               </View>
            )}

            {/* Quick Stats Grid */}
            <View style={styles.quickStatsRow}>
               <View style={styles.quickStatBox}>
                  <Text style={styles.statLabel}>PAYMENT</Text>
                  {selectedOrder.paymentDetails && Object.keys(selectedOrder.paymentDetails).length > 1 ? (
                    <View style={{ marginTop: 2 }}>
                       {selectedOrder.paymentDetails.method === 'upi' && <Text style={styles.statValue}>UPI: {selectedOrder.paymentDetails.upiId}</Text>}
                       {selectedOrder.paymentDetails.method === 'card' && <Text style={styles.statValue}>{selectedOrder.paymentDetails.cardNetwork} ****{selectedOrder.paymentDetails.cardLast4}</Text>}
                       {selectedOrder.paymentDetails.method === 'wallet' && <Text style={styles.statValue}>Wallet: {selectedOrder.paymentDetails.wallet}</Text>}
                       {selectedOrder.paymentDetails.method === 'netbanking' && <Text style={styles.statValue}>Bank: {selectedOrder.paymentDetails.bank}</Text>}
                    </View>
                  ) : (
                    <Text style={styles.statValue}>{selectedOrder.paymentMethod || 'COD'}</Text>
                  )}
                  {selectedOrder.razorpayPaymentId && <Text style={[styles.statSub, { fontSize: 9, color: TEXT_MUTED }]} numberOfLines={1}>Txn: {selectedOrder.razorpayPaymentId}</Text>}
                  
                  {/* Payment Status Switcher */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                     {['PENDING', 'PAID', 'FAILED'].map(ps => (
                        <TouchableOpacity key={ps} onPress={() => updatePaymentStatus(selectedOrder._id, ps)} style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: selectedOrder.paymentStatus === ps ? (ps==='PAID'?'#D1FAE5':ps==='FAILED'?'#FFE4E6':'#FEF3C7') : BG_COLOR }}>
                           <Text style={{ fontFamily: 'Inter-Bold', fontSize: 9, color: selectedOrder.paymentStatus === ps ? (ps==='PAID'?'#059669':ps==='FAILED'?'#E11D48':'#D97706') : TEXT_MUTED }}>{ps}</Text>
                        </TouchableOpacity>
                     ))}
                  </View>
               </View>
               <View style={styles.quickStatBox}>
                  <Text style={styles.statLabel}>STATUS</Text>
                  <Text style={styles.statValue}>{modalStatus.replace(/_/g, ' ')}</Text>
               </View>
            </View>

            {/* Preparation Glass Card */}
            {['ACCEPTED', 'PREPARING'].includes(modalStatus) && (
              <View style={styles.modernCardLight}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                   <ChefHat size={18} color="#8B5CF6" />
                   <Text style={styles.cardTitleLight}>Preparation Time</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput
                    style={styles.cleanInputCard}
                    placeholder="e.g. 30" placeholderTextColor="#94A3B8" keyboardType="numeric"
                    defaultValue={selectedOrder.preparationTime ? String(selectedOrder.preparationTime) : ''}
                    onChangeText={setPrepTimeInput}
                  />
                  <View style={{ flex: 1.5 }}>
                     <ModernGradientButton label="UPDATE TIME" colors={PREPARING_GRADIENT} onPress={() => setPrepTime(selectedOrder._id, Number(prepTimeInput))} />
                  </View>
                </View>
              </View>
            )}

            {/* Address */}
            <View style={styles.modernCardLight}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MapPin size={16} color={TEXT_MUTED} />
                    <Text style={[styles.cardTitleLight, { color: TEXT_MUTED, marginLeft: 6 }]}>Delivery Info</Text>
                 </View>
                 <TouchableOpacity 
                   onPress={() => {
                     const coords = selectedOrder.deliveryCoordinates || selectedOrder.deliveryAddress?.coordinates || { lat: selectedOrder.deliveryAddress?.lat, lng: selectedOrder.deliveryAddress?.lng };
                     const addressString = typeof selectedOrder.deliveryAddress === 'object' ? [selectedOrder.deliveryAddress?.addressLine1, selectedOrder.deliveryAddress?.city].filter(Boolean).join(', ') : addressStr;
                     const mapUrl = coords?.lat ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`;
                     Linking.openURL(mapUrl);
                   }}
                   style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                   <Text style={{ fontFamily: 'Inter-Bold', fontSize: 10, color: '#2563EB' }}>OPEN MAP</Text>
                 </TouchableOpacity>
              </View>
              <Text style={styles.primaryTextDark}>{selectedOrder.customer?.name || 'Guest'}</Text>
              <Text style={styles.secondaryText}>{selectedOrder.customer?.mobile || '-'}</Text>
              {selectedOrder.customerOrderCount !== undefined && (
                 <View style={{ backgroundColor: '#DBEAFE', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4 }}>
                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 10, color: '#1D4ED8' }}>🏆 Placed {selectedOrder.customerOrderCount} orders in total</Text>
                 </View>
              )}
              <Text style={[styles.secondaryText, { marginTop: 8 }]}>{addressStr}</Text>
              
              {selectedOrder.deliveryInstruction && (
                <View style={styles.alertBox}>
                   <Text style={styles.alertLabel}>Note from customer:</Text>
                   <Text style={styles.alertValue}>"{selectedOrder.deliveryInstruction}"</Text>
                </View>
              )}
            </View>

            {/* Modern Invoice Section */}
            <Text style={styles.sectionHeader}>Order Summation</Text>
            <View style={styles.invoiceCard}>
               {selectedOrder.items?.map((item: any, idx: number) => (
                 <View key={idx} style={styles.invoiceItemRow}>
                    <View style={styles.qtyBadge}><Text style={styles.qtyText}>{item.quantity}x</Text></View>
                    <View style={{ flex: 1 }}>
                       <Text style={styles.invoiceItemName}>{item.name || item.product?.name}</Text>
                       {item.variant && <Text style={{ fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED }}>({item.variant})</Text>}
                    </View>
                    <Text style={styles.invoiceItemPrice}>₹{Number((item.price || 0) * item.quantity).toFixed(2)}</Text>
                 </View>
               ))}
               <View style={styles.modernDivider} />
               <View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>Subtotal</Text><Text style={styles.invoiceValue}>₹{Number(selectedOrder.totalAmount || 0).toFixed(2)}</Text></View>
               {selectedOrder.deliveryFee > 0 && <View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>Delivery</Text><Text style={styles.invoiceValue}>₹{selectedOrder.deliveryFee}</Text></View>}
               {selectedOrder.discountApplied > 0 && <View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>Discount</Text><Text style={[styles.invoiceValue, { color: '#10B981'}]}>-₹{selectedOrder.discountApplied}</Text></View>}
               
               {/* Detailed Tax Breakdown */}
               {(selectedOrder.taxAmount > 0 || selectedOrder.cgstTotal > 0 || selectedOrder.igstTotal > 0) && (
                 <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>Tax</Text><Text style={styles.invoiceValue}>₹{Number(selectedOrder.taxAmount || ((selectedOrder.cgstTotal||0)+(selectedOrder.sgstTotal||0)+(selectedOrder.igstTotal||0))).toFixed(2)}</Text></View>
                    {(selectedOrder.cgstTotal > 0 || selectedOrder.sgstTotal > 0) && (
                       <View style={{ marginLeft: 12, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#E2E8F0', marginTop: 4 }}>
                          {selectedOrder.cgstTotal > 0 && <View style={[styles.invoiceRow, { marginBottom: 2 }]}><Text style={[styles.invoiceLabel, { fontSize: 11 }]}>CGST</Text><Text style={[styles.invoiceValue, { fontSize: 11 }]}>₹{selectedOrder.cgstTotal}</Text></View>}
                          {selectedOrder.sgstTotal > 0 && <View style={[styles.invoiceRow, { marginBottom: 2 }]}><Text style={[styles.invoiceLabel, { fontSize: 11 }]}>SGST</Text><Text style={[styles.invoiceValue, { fontSize: 11 }]}>₹{selectedOrder.sgstTotal}</Text></View>}
                       </View>
                    )}
                    {selectedOrder.igstTotal > 0 && (
                       <View style={{ marginLeft: 12, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#E2E8F0', marginTop: 4 }}>
                          <View style={[styles.invoiceRow, { marginBottom: 2 }]}><Text style={[styles.invoiceLabel, { fontSize: 11 }]}>IGST</Text><Text style={[styles.invoiceValue, { fontSize: 11 }]}>₹{selectedOrder.igstTotal}</Text></View>
                       </View>
                    )}
                 </View>
               )}
               
               <View style={styles.invoiceTotalBox}>
                  <Text style={styles.invoiceTotalLabel}>Total Pay</Text>
                  <Text style={styles.invoiceTotalValue}>₹{Number(selectedOrder.finalAmount || selectedOrder.totalAmount || 0).toFixed(2)}</Text>
               </View>

               {selectedOrder.couponCode && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'center' }}>
                     <Tag size={12} color={TEXT_MUTED} />
                     <Text style={{ fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED }}>Coupon applied: <Text style={{ fontFamily: 'Inter-Bold', color: TEXT_DARK }}>{selectedOrder.couponCode}</Text></Text>
                  </View>
               )}
            </View>

            {/* 🔥 Modern Swipe Action Dock 🔥 */}
            <View style={{ marginTop: 24, paddingHorizontal: 4, paddingBottom: 40 }}>
               {modalStatus === 'PLACED' && (
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                       <SwipeButton onComplete={() => updateStatus(selectedOrder._id, 'ACCEPTED')} title="SWIPE TO ACCEPT" colors={['#0EA5E9', '#0369A1']} />
                    </View>
                    <TouchableOpacity onPress={() => cancelOrder(selectedOrder._id, selectedOrder.customId || '')} style={{ height: 56, backgroundColor: '#FEF2F2', paddingHorizontal: 20, borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FECACA' }}>
                       <Text style={{ fontFamily: 'Inter-Black', fontSize: 13, color: '#EF4444', letterSpacing: 1 }}>REJECT</Text>
                    </TouchableOpacity>
                 </View>
               )}

               {['ACCEPTED', 'PREPARING'].includes(modalStatus) && (
                  <SwipeButton onComplete={() => updateStatus(selectedOrder._id, 'OUT_FOR_DELIVERY')} title="SWIPE FOR DELIVERY" colors={['#F59E0B', '#D97706']} />
               )}

               {modalStatus === 'OUT_FOR_DELIVERY' && (
                  <SwipeButton onComplete={() => updateStatus(selectedOrder._id, 'DELIVERED')} title="SWIPE TO COMPLETE" colors={['#10B981', '#059669']} />
               )}

               {['DELIVERED', 'CANCELLED'].includes(modalStatus) && (
                  <View style={{ height: 56, backgroundColor: modalStatus === 'DELIVERED' ? '#ECFDF5' : '#FEF2F2', borderRadius: 28, justifyContent: 'center', alignItems: 'center' }}>
                     <Text style={{ fontFamily: 'Inter-Black', fontSize: 14, color: modalStatus === 'DELIVERED' ? '#10B981' : '#EF4444', letterSpacing: 1 }}>
                        {modalStatus === 'DELIVERED' ? 'ORDER COMPLETED ✓' : 'ORDER REJECTED ✗'}
                     </Text>
                  </View>
               )}
            </View>

          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sleek Gradient Header */}
      <View style={[styles.headerContainer, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
         <View style={styles.headerTop}>
            <View>
              <Text style={styles.screenTitle}>Orders Central</Text>
              <Text style={styles.screenSub}>{filtered.length} active sessions</Text>
            </View>
            <TouchableOpacity style={styles.iconCircleBtn} onPress={exportCSV}>
               <Download size={18} color={TEXT_DARK} />
            </TouchableOpacity>
         </View>

         {/* Fluid Segmented Tabs */}
         <View style={styles.fluidSegmentWrapper}>
            <TouchableOpacity style={[styles.fluidSegment, mode === 'ORDERS' && styles.fluidSegmentActive]} onPress={() => setMode('ORDERS')}>
               <ShoppingBag size={14} color={mode === 'ORDERS' ? '#FFF' : TEXT_MUTED} />
               <Text style={[styles.fluidSegmentText, mode === 'ORDERS' && styles.fluidSegmentTextActive]}>Live Hub</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fluidSegment, mode === 'REFUNDS' && styles.fluidSegmentActive]} onPress={() => setMode('REFUNDS')}>
               <ArrowLeftRight size={14} color={mode === 'REFUNDS' ? '#FFF' : TEXT_MUTED} />
               <Text style={[styles.fluidSegmentText, mode === 'REFUNDS' && styles.fluidSegmentTextActive]}>Refunds</Text>
               {pendingRefunds > 0 && <View style={styles.notificationDot} />}
            </TouchableOpacity>
         </View>

         {/* Modern Utility Bar (Search & Dates) */}
         <View style={styles.utilityBar}>
            <View style={styles.searchPill}>
               <Search size={16} color={TEXT_MUTED} />
               <TextInput style={styles.searchInput} placeholder="Search anything..." placeholderTextColor={TEXT_MUTED} value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            <View style={styles.datePillGroup}>
               <TextInput style={styles.dateMicroInput} placeholder="From" placeholderTextColor={TEXT_MUTED} value={startDate} onChangeText={setStartDate} />
               <View style={styles.dateDivider} />
               <TextInput style={styles.dateMicroInput} placeholder="To" placeholderTextColor={TEXT_MUTED} value={endDate} onChangeText={setEndDate} />
            </View>
         </View>
      </View>

      {/* Pill Selectors */}
      {mode === 'ORDERS' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusPillsScroll}>
          <TouchableOpacity style={[styles.modernStatusPill, filterStatus === 'ALL' && styles.modernStatusPillActive]} onPress={() => setFilterStatus('ALL')}>
            <Text style={[styles.modernStatusPillText, filterStatus === 'ALL' && styles.modernStatusPillTextActive]}>All Operations</Text>
          </TouchableOpacity>
          {['PLACED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].map(s => (
            <TouchableOpacity key={s} style={[styles.modernStatusPill, filterStatus === s && styles.modernStatusPillActive]} onPress={() => setFilterStatus(filterStatus === s ? 'ALL' : s)}>
               <View style={[styles.statusDot, { backgroundColor: filterStatus === s ? '#FFF' : PRIMARY_GRADIENT[0] }]} />
               <Text style={[styles.modernStatusPillText, filterStatus === s && styles.modernStatusPillTextActive]}>
                 {s.replace(/_/g, ' ')} <Text style={{opacity: 0.6}}>({statusCounts[s] || 0})</Text>
               </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Main List */}
      {loading ? (
        <View style={{ padding: 16 }}>
           {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={mode === 'REFUNDS' ? renderRefundCard : renderOrderCard}
          contentContainerStyle={styles.listArea}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_GRADIENT[0]} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ paddingTop: 80, alignItems: 'center' }}>
               <FileText size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
               <Text style={{ fontFamily: 'Inter-Medium', color: TEXT_MUTED }}>No orders actived.</Text>
            </View>
          }
        />
      )}
      <OrderDetailModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },

  // Brand New Sleek Header
  headerContainer: { backgroundColor: CARD_BG, paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 5, zIndex: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontFamily: 'Inter-Black', fontSize: 32, color: TEXT_DARK, letterSpacing: -1 },
  screenSub: { fontFamily: 'Inter-Bold', fontSize: 13, color: PRIMARY_GRADIENT[0], marginTop: 2 },
  iconCircleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER_COLOR },

  // Fluid Segment
  fluidSegmentWrapper: { flexDirection: 'row', backgroundColor: BG_COLOR, borderRadius: 16, padding: 4, marginTop: 24 },
  fluidSegment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  fluidSegmentActive: { backgroundColor: TEXT_DARK, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  fluidSegmentText: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_MUTED },
  fluidSegmentTextActive: { color: '#FFF' },
  notificationDot: { position: 'absolute', top: 10, right: 30, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1, borderColor: CARD_BG },

  // Utilities
  utilityBar: { flexDirection: 'row', gap: 12, marginTop: 16 },
  searchPill: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: BG_COLOR, borderRadius: 14, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: BORDER_COLOR },
  searchInput: { flex: 1, paddingLeft: 8, fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_DARK },
  datePillGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG_COLOR, borderRadius: 14, paddingHorizontal: 10, height: 44, borderWidth: 1, borderColor: BORDER_COLOR },
  dateMicroInput: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: TEXT_DARK, width: 44, textAlign: 'center' },
  dateDivider: { width: 1, height: 16, backgroundColor: BORDER_COLOR, marginHorizontal: 4 },

  // Dynamic Status Pills
  statusPillsScroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  modernStatusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: 'transparent' },
  modernStatusPillActive: { backgroundColor: TEXT_DARK },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  modernStatusPillText: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_MUTED },
  modernStatusPillTextActive: { color: '#FFF' },

  // Glass/Modern Card
  listArea: { padding: 20, paddingBottom: 120 },
  modernCard: { backgroundColor: CARD_BG, borderRadius: 24, padding: 18, marginBottom: 16, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF0ED', alignItems: 'center', justifyContent: 'center' },
  orderIdText: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_DARK },
  timeText: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  
  ultraPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ultraPillText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#FFF' },

  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerNameText: { fontFamily: 'Inter-Bold', fontSize: 15, color: TEXT_DARK },
  customerDetailText: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 4 },
  hugePriceText: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_DARK },
  paymentMethodPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: BG_COLOR, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  paymentMethodText: { fontFamily: 'Inter-SemiBold', fontSize: 9, color: TEXT_MUTED },

  modernDivider: { height: 1, backgroundColor: BORDER_COLOR, marginVertical: 14 },
  itemsMutedText: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED, fontStyle: 'italic' },

  actionDock: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  actionGrid: { flex: 1, flexDirection: 'row', gap: 10 },
  inspectBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },
  modernBtnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  modernBtnText: { fontFamily: 'Inter-Black', fontSize: 12, color: '#FFF', letterSpacing: 0.5 },
  minimalRejectBtn: { flex: 1, backgroundColor: '#FFF1F2', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  minimalRejectText: { fontFamily: 'Inter-Black', fontSize: 12, color: '#E11D48' },

  // Modal (Modern Bottomsheet Style)
  modalContainer: { flex: 1, backgroundColor: BG_COLOR },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, backgroundColor: CARD_BG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 4, zIndex: 10 },
  modalTitleText: { fontFamily: 'Inter-Black', fontSize: 22, color: TEXT_DARK },
  modalDateText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: TEXT_MUTED, marginTop: 4 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },
  
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 20, paddingBottom: 60, gap: 16 },

  quickStatsRow: { flexDirection: 'row', gap: 16 },
  quickStatBox: { flex: 1, backgroundColor: CARD_BG, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 2 },
  statLabel: { fontFamily: 'Inter-Bold', fontSize: 10, color: TEXT_MUTED, letterSpacing: 1, marginBottom: 8 },
  statValue: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_DARK },
  statSub: { fontFamily: 'Inter-Bold', fontSize: 11, marginTop: 4 },

  modernCardLight: { backgroundColor: CARD_BG, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 2 },
  cardTitleLight: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_DARK },
  primaryTextDark: { fontFamily: 'Inter-Bold', fontSize: 15, color: TEXT_DARK, marginTop: 4 },
  secondaryText: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED },
  alertBox: { backgroundColor: '#FFFBEB', padding: 12, borderRadius: 12, marginTop: 12 },
  alertLabel: { fontFamily: 'Inter-Bold', fontSize: 11, color: '#D97706' },
  alertValue: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#B45309', marginTop: 4, fontStyle: 'italic' },
  
  cleanInputCard: { flex: 1, backgroundColor: BG_COLOR, borderRadius: 14, paddingHorizontal: 16, fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_DARK, textAlign: 'center' },

  sectionHeader: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_DARK, marginTop: 8, paddingHorizontal: 4 },
  invoiceCard: { backgroundColor: CARD_BG, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 3 },
  invoiceItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  qtyBadge: { backgroundColor: BG_COLOR, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 12 },
  qtyText: { fontFamily: 'Inter-Black', fontSize: 12, color: TEXT_DARK },
  invoiceItemName: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 14, color: TEXT_DARK },
  invoiceItemPrice: { fontFamily: 'Inter-Black', fontSize: 14, color: TEXT_DARK },
  
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  invoiceLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_MUTED },
  invoiceValue: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_DARK },
  invoiceTotalBox: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceTotalLabel: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_DARK },
  invoiceTotalValue: { fontFamily: 'Inter-Black', fontSize: 24, color: PRIMARY_GRADIENT[0] },
});

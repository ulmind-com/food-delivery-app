import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { adminApi } from '../../services/api';
import { MapPin, Calendar, IndianRupee, ShoppingBag } from 'lucide-react-native';
import { Image } from 'expo-image';
import { resolveImageURL } from '../../lib/image-utils';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const ACCENT = '#EF4444'; // Red for Map

type Preset = 'all' | 'today' | '7d' | '30d';
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const getRange = (preset: Preset) => {
  if (preset === 'all') return {};
  const now = new Date();
  let start = now;
  if (preset === '7d') start = new Date(now.getTime() - 6 * 86400000);
  else if (preset === '30d') start = new Date(now.getTime() - 29 * 86400000);
  return { startDate: ymd(start), endDate: ymd(now) };
};

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
];

const statusColor = (s: string) => (s === 'DELIVERED' ? '#16A34A' : s === 'CANCELLED' ? '#DC2626' : '#2563EB');

const buildMapHtml = (orders: any[]) => {
  const json = JSON.stringify(orders || []);
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0}html,body,#map{width:100%;height:100%}
.pin{position:relative;width:34px;height:34px}
.pin img{width:34px;height:34px;border-radius:50%;border:2px solid #EF4444;object-fit:cover;background:#fff}
.pin .cnt{position:absolute;top:-6px;right:-6px;background:#DC2626;color:#fff;font:700 10px sans-serif;min-width:16px;text-align:center;padding:1px 4px;border-radius:8px;border:1.5px solid #fff}
.leaflet-popup-content{margin:8px;font-family:sans-serif}
.ord{border-bottom:1px solid #eee;padding:6px 0}.ord:last-child{border:0}
.ord .nm{font:700 12px sans-serif;color:#111}.ord .mb{font:500 10px sans-serif;color:#888}
.ord .rw{display:flex;justify-content:space-between;margin-top:3px;font:600 11px sans-serif}
</style></head><body><div id="map"></div><script>
var orders = ${json};
var map = L.map('map',{ zoomControl:true, touchZoom:true, doubleClickZoom:true, scrollWheelZoom:true, tap:true, bounceAtZoomLimits:true, zoomSnap:0.5 }).setView([20.5937,78.9629],5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);
var groups={};
orders.forEach(function(o){ if(o.lat&&o.lng){var k=o.lat+','+o.lng; (groups[k]=groups[k]||[]).push(o);} });
var pts=[];
Object.keys(groups).forEach(function(k){
  var g=groups[k]; var m=g[0]; pts.push([m.lat,m.lng]);
  var img=m.customerImage||('https://ui-avatars.com/api/?name='+encodeURIComponent(m.customerName||'U')+'&background=random');
  var html='<div class="pin"><img src="'+img+'" onerror="this.src=\\'https://ui-avatars.com/api/?name=U&background=random\\'"/>'+(g.length>1?'<div class="cnt">'+g.length+'</div>':'')+'</div>';
  var icon=L.divIcon({html:html,className:'',iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-17]});
  var pop='<div style="max-height:280px;overflow:auto;min-width:200px"><b style="font:800 13px sans-serif;color:#EF4444">'+g.length+' order(s) here</b>';
  g.forEach(function(o){
    var col=o.status==='DELIVERED'?'#16A34A':(o.status==='CANCELLED'?'#DC2626':'#2563EB');
    pop+='<div class="ord"><div class="nm">'+(o.customerName||'Unknown')+' <span style="color:#888;font-weight:600">#'+o.customId+'</span></div><div class="mb">'+(o.customerMobile||'')+'</div><div class="rw"><span>₹'+(o.amount||0).toFixed(0)+'</span><span style="color:'+col+'">'+o.status+'</span></div></div>';
  });
  pop+='</div>';
  L.marker([m.lat,m.lng],{icon:icon}).addTo(map).bindPopup(pop);
});
if(pts.length>0){ try{ map.fitBounds(pts,{padding:[40,40],maxZoom:15}); }catch(e){} }
</script></body></html>`;
};

export default function AdminMapScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [preset, setPreset] = useState<Preset>('all');
  const [scrollEnabled, setScrollEnabled] = useState(true); // disabled while touching the map

  const fetchData = async (p: Preset = preset) => {
    try {
      const res = await adminApi.getMapAnalytics(getRange(p));
      setOrders(res.data || []);
    } catch (e) {
      console.log('Error fetching map data:', e);
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

  const mapped = orders.filter((o) => o.lat && o.lng);
  const totalRevenue = mapped.reduce((a, o) => a + (o.amount || 0), 0);
  const html = useMemo(() => buildMapHtml(mapped), [mapped]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
        <Text style={styles.headerTitle}>Order Map</Text>
        <Text style={styles.headerSubtitle}>Customer orders geographically</Text>
      </View>

      <ScrollView
        scrollEnabled={scrollEnabled}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Controls (scroll away with the page) */}
        <View style={styles.controls}>
          <View style={styles.presetRow}>
            <Calendar size={16} color={TEXT_MUTED} />
            {PRESETS.map((p) => (
              <TouchableOpacity key={p.key} style={[styles.presetChip, preset === p.key && styles.presetChipActive]} onPress={() => setPreset(p.key)}>
                <Text style={[styles.presetText, preset === p.key && styles.presetTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: '#FEE2E2' }]}><ShoppingBag size={18} color={ACCENT} /></View>
              <Text style={styles.summaryValue}>{mapped.length}</Text>
              <Text style={styles.summaryLabel}>Orders Plotted</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: '#DCFCE7' }]}><IndianRupee size={18} color="#16A34A" /></View>
              <Text style={styles.summaryValue}>₹{totalRevenue.toFixed(0)}</Text>
              <Text style={styles.summaryLabel}>Total Value</Text>
            </View>
          </View>
        </View>

        {/* Map — touching it pauses page scroll so pinch/zoom/pan work; lift finger to scroll again */}
        <View
          style={styles.mapArea}
          onStartShouldSetResponder={() => true}
          onResponderGrant={() => setScrollEnabled(false)}
          onResponderRelease={() => setScrollEnabled(true)}
          onResponderTerminate={() => setScrollEnabled(true)}
          onTouchStart={() => setScrollEnabled(false)}
          onTouchEnd={() => setScrollEnabled(true)}
          onTouchCancel={() => setScrollEnabled(true)}
        >
          {loading ? (
            <View style={styles.mapLoading}><ActivityIndicator color={ACCENT} size="large" /></View>
          ) : Platform.OS === 'web' ? (
            <View style={styles.mapLoading}><Text style={styles.mapWebText}>Interactive map unavailable on Web Preview. See order list below.</Text></View>
          ) : mapped.length === 0 ? (
            <View style={styles.mapLoading}><MapPin size={40} color="#CBD5E1" /><Text style={styles.mapWebText}>No located orders in this period.</Text></View>
          ) : (
            <WebView
              key={`${preset}-${mapped.length}`}
              originWhitelist={['*']}
              source={{ html }}
              style={styles.webview}
              scrollEnabled={false}
              javaScriptEnabled
              domStorageEnabled
              nestedScrollEnabled
              androidLayerType="hardware"
            />
          )}
        </View>
        <Text style={styles.mapHint}>✌️ Two fingers to zoom · drag to move · swipe outside the map to scroll</Text>

        {/* Order list */}
        {!loading && mapped.length > 0 && (
          <View style={styles.listWrap}>
            <Text style={styles.listHeading}>Located Orders ({mapped.length})</Text>
            {mapped.slice(0, 50).map((o, i) => (
              <View key={o.id || i} style={styles.orderCard}>
                <View style={styles.orderAvatar}>
                  {o.customerImage ? (
                    <Image source={{ uri: resolveImageURL(o.customerImage) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Text style={styles.orderAvatarText}>{o.customerName?.charAt(0)?.toUpperCase() || 'U'}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderName} numberOfLines={1}>{o.customerName || 'Unknown'} <Text style={styles.orderId}>#{o.customId}</Text></Text>
                  <Text style={styles.orderMobile}>{o.customerMobile}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderAmount}>₹{(o.amount || 0).toFixed(0)}</Text>
                  <Text style={[styles.orderStatus, { color: statusColor(o.status) }]}>{o.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: CARD_BG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4, zIndex: 10 },
  headerTitle: { fontFamily: 'Jakarta-ExtraBold', fontSize: 28, color: TEXT_DARK, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: ACCENT, marginTop: 2 },
  controls: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, backgroundColor: BG_COLOR },

  presetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD_BG, borderWidth: 1, borderColor: '#E2E8F0' },
  presetChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  presetText: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_MUTED },
  presetTextActive: { color: '#FFF' },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: CARD_BG, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  summaryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  summaryValue: { fontFamily: 'Inter-Black', fontSize: 22, color: TEXT_DARK },
  summaryLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

  mapArea: { height: 440, marginHorizontal: 16, marginTop: 4, borderRadius: 20, overflow: 'hidden', backgroundColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  mapWebText: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED, textAlign: 'center' },
  mapHint: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED, textAlign: 'center', marginTop: 8, paddingHorizontal: 16 },

  listWrap: { paddingHorizontal: 16, paddingTop: 16 },
  listHeading: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_DARK, marginBottom: 12 },
  orderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD_BG, borderRadius: 16, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  orderAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orderAvatarText: { fontFamily: 'Inter-Black', fontSize: 16, color: ACCENT },
  orderName: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_DARK },
  orderId: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: TEXT_MUTED },
  orderMobile: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  orderAmount: { fontFamily: 'Inter-Black', fontSize: 14, color: TEXT_DARK },
  orderStatus: { fontFamily: 'Inter-Bold', fontSize: 10, marginTop: 2 },
});

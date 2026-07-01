import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Switch, Alert, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Region } from 'react-native-maps';
import MapView from '../../components/NativeMap';
import * as ExpoLocation from 'expo-location';
import { restaurantApi, uploadApi } from '../../services/api';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Store, Save, MapPin, Navigation, CheckCircle2, XCircle, ChevronDown, ImagePlus } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { resolveImageURL } from '../../lib/image-utils';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';
const ACCENT = '#64748B'; // Slate for Settings
const GREEN = '#22C55E';
const RED = '#EF4444';

const DEFAULT_REGION: Region = { latitude: 22.5726, longitude: 88.3639, latitudeDelta: 0.01, longitudeDelta: 0.01 };

const Field = ({ label, value, onChangeText, placeholder, keyboardType, flex }: any) => (
  <View style={[styles.inputGroup, flex && { flex: 1 }]}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput style={styles.textInput} value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} placeholderTextColor="#94A3B8" />
  </View>
);

export default function AdminSettingsScreen() {
  const insets = useSafeAreaInsets();
  const setRestaurant = useRestaurantStore((s) => s.setRestaurant);
  const mapRef = useRef<any>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [restaurant, setRestaurantState] = useState<any>(null);

  const [form, setForm] = useState({
    name: '', address: '', freeDeliveryRadius: '', chargePerKm: '', gstIn: '', fssaiLicense: '', mobile: '',
    openingTime: '10:00', closingTime: '22:00', isCodEnabled: true, codStartTime: '00:00', codEndTime: '00:00',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoAsset, setLogoAsset] = useState<any>(null);

  // GPS
  const [showMap, setShowMap] = useState(false);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [savingLoc, setSavingLoc] = useState(false);

  const fetchRestaurant = async () => {
    try {
      const res = await restaurantApi.get();
      const r = res.data;
      setRestaurantState(r);
      setForm({
        name: r.name || '',
        address: r.address || '',
        freeDeliveryRadius: String(r.freeDeliveryRadius ?? 2),
        chargePerKm: String(r.chargePerKm ?? 10),
        gstIn: r.gstIn || '',
        fssaiLicense: r.fssaiLicense || '',
        mobile: r.mobile || '',
        openingTime: r.openingTime || '10:00',
        closingTime: r.closingTime || '22:00',
        isCodEnabled: r.isCodEnabled ?? true,
        codStartTime: r.codStartTime || '00:00',
        codEndTime: r.codEndTime || '00:00',
      });
      if (r.logo) setLogoPreview(r.logo);
      if (r.location?.lat && r.location?.lng) {
        setRegion({ latitude: r.location.lat, longitude: r.location.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      }
    } catch (e) {
      console.log('Error fetching restaurant:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurant();
    return () => { if (geocodeTimer.current) clearTimeout(geocodeTimer.current); };
  }, []);

  const handleToggle = async (isOpen: boolean) => {
    setToggling(true);
    try {
      const res = await restaurantApi.update({ isOpen });
      setRestaurantState(res.data);
      setRestaurant(res.data);
    } catch {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setToggling(false);
    }
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled && result.assets?.length) {
      setLogoAsset(result.assets[0]);
      setLogoPreview(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoURL = restaurant?.logo;
      if (logoAsset) {
        const file = { uri: logoAsset.uri, name: logoAsset.fileName || 'logo.jpg', type: logoAsset.mimeType || 'image/jpeg' };
        const urls = await uploadApi.uploadMultipleImages([file]);
        logoURL = urls[0];
      }
      const res = await restaurantApi.update({
        name: form.name,
        address: form.address,
        freeDeliveryRadius: Number(form.freeDeliveryRadius),
        chargePerKm: Number(form.chargePerKm),
        gstIn: form.gstIn,
        fssaiLicense: form.fssaiLicense,
        mobile: form.mobile || undefined,
        logo: logoURL,
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        isCodEnabled: form.isCodEnabled,
        codStartTime: form.codStartTime,
        codEndTime: form.codEndTime,
      });
      setRestaurantState(res.data);
      setRestaurant(res.data);
      Alert.alert('Saved', 'Settings saved successfully ✅');
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const doReverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
        headers: { 'Accept-Language': 'en-US,en;q=0.9' },
      });
      const data = await r.json();
      const addr = data.address || {};
      const parts = [addr.road, addr.suburb || addr.neighbourhood, addr.city || addr.town || addr.village, addr.state].filter(Boolean);
      setResolvedAddress(parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(', ') || '');
    } catch {
      setResolvedAddress('');
    } finally {
      setGeocoding(false);
    }
  };

  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setRegion(newRegion);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => doReverseGeocode(newRegion.latitude, newRegion.longitude), 800);
  }, []);

  const locateMe = async () => {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission', 'Location permission denied');
    try {
      const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const newRegion = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
      doReverseGeocode(newRegion.latitude, newRegion.longitude);
    } catch {
      Alert.alert('Error', 'Could not get your location');
    }
  };

  const saveLocation = async () => {
    setSavingLoc(true);
    try {
      await restaurantApi.setLocation({ lat: region.latitude, lng: region.longitude, address: resolvedAddress });
      if (resolvedAddress) setForm((f) => ({ ...f, address: resolvedAddress }));
      Alert.alert('Saved', '📍 Restaurant location saved!');
      fetchRestaurant();
    } catch {
      Alert.alert('Error', 'Failed to save location');
    } finally {
      setSavingLoc(false);
    }
  };

  const isOpen = restaurant?.isOpen ?? false;
  const hasLocation = restaurant?.location?.lat && restaurant?.location?.lng;

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Restaurant status, details & location</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Status Toggle */}
          <Animated.View entering={FadeInDown.duration(400)} style={[styles.statusCard, { borderColor: isOpen ? '#BBF7D0' : '#FECACA', backgroundColor: isOpen ? '#F0FDF4' : '#FEF2F2' }]}>
            <View style={[styles.statusIcon, { backgroundColor: isOpen ? '#DCFCE7' : '#FEE2E2' }]}>
              <Store size={26} color={isOpen ? GREEN : RED} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {isOpen ? <CheckCircle2 size={15} color={GREEN} /> : <XCircle size={15} color={RED} />}
                <Text style={[styles.statusTitle, { color: isOpen ? '#15803D' : RED }]}>{isOpen ? 'Restaurant is LIVE' : 'Restaurant OFFLINE'}</Text>
              </View>
              <Text style={styles.statusSub}>{isOpen ? 'Customers can place orders now' : 'Customers cannot place orders'}</Text>
            </View>
            {toggling ? <ActivityIndicator color={ACCENT} /> : (
              <Switch value={isOpen} onValueChange={handleToggle} trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }} thumbColor={Platform.OS === 'ios' ? '#FFF' : isOpen ? GREEN : '#94A3B8'} />
            )}
          </Animated.View>

          {/* Details */}
          <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.card}>
            <Text style={styles.cardHeading}>RESTAURANT DETAILS</Text>

            {/* Logo */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Restaurant Logo</Text>
              <TouchableOpacity style={styles.logoPicker} onPress={pickLogo} activeOpacity={0.8}>
                {logoPreview ? (
                  <Image source={{ uri: resolveImageURL(logoPreview) }} style={styles.logoImg} contentFit="cover" />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <ImagePlus size={24} color={ACCENT} />
                    <Text style={styles.logoHint}>Tap to upload</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Field label="Restaurant Name" value={form.name} onChangeText={(t: string) => setForm({ ...form, name: t })} placeholder="My Restaurant" />
            <Field label="Address" value={form.address} onChangeText={(t: string) => setForm({ ...form, address: t })} placeholder="123 Food Street, City" />
            <Field label="Mobile Number" value={form.mobile} onChangeText={(t: string) => setForm({ ...form, mobile: t })} placeholder="+91 98765 43210" keyboardType="phone-pad" />

            {/* COD toggle */}
            <View style={styles.codRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.codTitle}>Cash on Delivery</Text>
                <Text style={styles.codSub}>Allow COD orders globally</Text>
              </View>
              <Switch value={form.isCodEnabled} onValueChange={(v) => setForm({ ...form, isCodEnabled: v })} trackColor={{ false: '#E2E8F0', true: '#CBD5E1' }} thumbColor={Platform.OS === 'ios' ? '#FFF' : form.isCodEnabled ? ACCENT : '#94A3B8'} />
            </View>

            <View style={styles.rowInputs}>
              <Field label="Opening (HH:MM)" value={form.openingTime} onChangeText={(t: string) => setForm({ ...form, openingTime: t })} placeholder="10:00" flex />
              <Field label="Closing (HH:MM)" value={form.closingTime} onChangeText={(t: string) => setForm({ ...form, closingTime: t })} placeholder="22:00" flex />
            </View>
            <View style={styles.rowInputs}>
              <Field label="COD Off From" value={form.codStartTime} onChangeText={(t: string) => setForm({ ...form, codStartTime: t })} placeholder="00:00" flex />
              <Field label="COD Off To" value={form.codEndTime} onChangeText={(t: string) => setForm({ ...form, codEndTime: t })} placeholder="00:00" flex />
            </View>
            <View style={styles.rowInputs}>
              <Field label="Free Radius (km)" value={form.freeDeliveryRadius} onChangeText={(t: string) => setForm({ ...form, freeDeliveryRadius: t })} placeholder="2" keyboardType="numeric" flex />
              <Field label="Charge / Km (₹)" value={form.chargePerKm} onChangeText={(t: string) => setForm({ ...form, chargePerKm: t })} placeholder="10" keyboardType="numeric" flex />
            </View>
            <View style={styles.rowInputs}>
              <Field label="GSTIN" value={form.gstIn} onChangeText={(t: string) => setForm({ ...form, gstIn: t })} placeholder="29ABCDE1234F1Z5" flex />
              <Field label="FSSAI License" value={form.fssaiLicense} onChangeText={(t: string) => setForm({ ...form, fssaiLicense: t })} placeholder="10012345678901" flex />
            </View>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : (<><Save size={16} color="#FFF" /><Text style={styles.saveBtnText}>SAVE CHANGES</Text></>)}
            </TouchableOpacity>
          </Animated.View>

          {/* GPS Location */}
          <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.card}>
            <TouchableOpacity style={styles.gpsHeader} onPress={() => setShowMap((v) => !v)} activeOpacity={0.7}>
              <View style={[styles.gpsIcon, { backgroundColor: hasLocation ? '#EFF6FF' : '#F1F5F9' }]}>
                <MapPin size={20} color={hasLocation ? '#3B82F6' : TEXT_MUTED} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsTitle}>GPS Location</Text>
                <Text style={styles.gpsSub}>
                  {hasLocation ? `${restaurant.location.lat.toFixed(5)}, ${restaurant.location.lng.toFixed(5)}` : 'No location set — tap to pick'}
                </Text>
              </View>
              {hasLocation && <View style={styles.setBadge}><Text style={styles.setBadgeText}>SET</Text></View>}
              <ChevronDown size={18} color={TEXT_MUTED} style={{ transform: [{ rotate: showMap ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>

            {showMap && (
              <View style={styles.mapSection}>
                <View style={styles.mapContainer}>
                  {Platform.OS !== 'web' ? (
                    <MapView ref={mapRef} style={styles.map} initialRegion={region} onRegionChangeComplete={handleRegionChangeComplete} />
                  ) : (
                    <View style={[styles.map, styles.mapWeb]}><Text style={styles.mapWebText}>Map unavailable on Web Preview</Text></View>
                  )}
                  <View style={styles.centerPin} pointerEvents="none">
                    <MapPin size={32} color={RED} fill={RED} />
                  </View>
                  <TouchableOpacity style={styles.locateBtn} onPress={locateMe}>
                    <Navigation size={15} color={TEXT_DARK} />
                    <Text style={styles.locateBtnText}>My Location</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.addrPreview}>
                  <MapPin size={15} color="#3B82F6" />
                  <Text style={styles.addrText} numberOfLines={2}>
                    {geocoding ? 'Resolving address…' : resolvedAddress || 'Move the map to pick a location'}
                  </Text>
                </View>
                <Text style={styles.coordText}>{region.latitude.toFixed(6)}, {region.longitude.toFixed(6)}</Text>

                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#3B82F6', marginTop: 12 }, savingLoc && { opacity: 0.7 }]} onPress={saveLocation} disabled={savingLoc || geocoding}>
                  {savingLoc ? <ActivityIndicator color="#FFF" /> : (<><CheckCircle2 size={16} color="#FFF" /><Text style={styles.saveBtnText}>SAVE GPS LOCATION</Text></>)}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: CARD_BG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4, zIndex: 10 },
  headerTitle: { fontFamily: 'Jakarta-ExtraBold', fontSize: 28, color: TEXT_DARK, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: ACCENT, marginTop: 2 },
  scrollContent: { padding: 16, paddingBottom: 60 },

  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, borderWidth: 1.5, marginBottom: 16 },
  statusIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontFamily: 'Inter-Black', fontSize: 16 },
  statusSub: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

  card: { backgroundColor: CARD_BG, borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardHeading: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_MUTED, letterSpacing: 1, marginBottom: 16 },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontFamily: 'Inter-Bold', fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  textInput: { height: 48, backgroundColor: BG_COLOR, borderRadius: 12, paddingHorizontal: 14, fontFamily: 'Inter-SemiBold', fontSize: 14, color: TEXT_DARK, borderWidth: 1, borderColor: BORDER_COLOR },
  rowInputs: { flexDirection: 'row', gap: 12 },

  logoPicker: { height: 120, borderRadius: 16, borderWidth: 2, borderColor: BORDER_COLOR, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: BG_COLOR },
  logoImg: { width: 100, height: 100, borderRadius: 50 },
  logoHint: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: TEXT_MUTED, marginTop: 6 },

  codRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: BG_COLOR, marginBottom: 16 },
  codTitle: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_DARK },
  codSub: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

  saveBtn: { flexDirection: 'row', height: 54, backgroundColor: TEXT_DARK, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  saveBtnText: { fontFamily: 'Inter-Black', fontSize: 14, color: '#FFF', letterSpacing: 1 },

  gpsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gpsIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gpsTitle: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_DARK },
  gpsSub: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  setBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  setBadgeText: { fontFamily: 'Inter-Black', fontSize: 9, color: '#15803D', letterSpacing: 0.5 },

  mapSection: { marginTop: 16 },
  mapContainer: { height: 260, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E2E8F0' },
  map: { ...StyleSheet.absoluteFillObject },
  mapWeb: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  mapWebText: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED },
  centerPin: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 24, alignItems: 'center', justifyContent: 'center' },
  locateBtn: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CARD_BG, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  locateBtnText: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_DARK },

  addrPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BG_COLOR, borderRadius: 12, padding: 12, marginTop: 12 },
  addrText: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_DARK },
  coordText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: TEXT_MUTED, marginTop: 6, marginLeft: 4 },
});

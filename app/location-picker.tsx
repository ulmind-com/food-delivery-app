import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform, ScrollView, TextInput, KeyboardAvoidingView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { Region } from 'react-native-maps';
import MapView from '../components/NativeMap';
import * as ExpoLocation from 'expo-location';
import { MapPin, X, CheckCircle, Navigation, Home, Briefcase } from 'lucide-react-native';
import { userApi } from '../services/api';
import { useLocationStore, SavedAddress } from '../store/useLocationStore';
import { useAuthStore } from '../store/useAuthStore';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#FC8019';

const DEFAULT_REGION = {
  latitude: 22.0531,
  longitude: 88.0772,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function LocationPickerScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { setSelectedAddress } = useLocationStore();
  const { user } = useAuthStore();

  const [step, setStep] = useState<'map' | 'form'>('map');
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [resolvedAddress, setResolvedAddress] = useState<any>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Form State
  const [addressType, setAddressType] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');
  const [houseNo, setHouseNo] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [stateForm, setStateForm] = useState('');
  const [postal, setPostal] = useState('');
  const [mobile, setMobile] = useState('');

  // Initialize Location
  useEffect(() => {
    (async () => {
      let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        try {
          let location = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
          const initialRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          };
          setRegion(initialRegion);
          mapRef.current?.animateToRegion(initialRegion, 500);
          doReverseGeocode(initialRegion.latitude, initialRegion.longitude);
        } catch (err) {
          console.log('Error getting initial location', err);
          doReverseGeocode(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
        }
      } else {
        doReverseGeocode(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
      }
    })();
  }, []);

  useEffect(() => {
    if (user?.mobile) setMobile(user.mobile);
  }, [user]);

  const doReverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const res = await userApi.reverseGeocode(lat, lng);
      setResolvedAddress({ ...res.data, coordinates: { lat, lng } });
    } catch {
      try {
        const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const data = await r.json();
        const addr = data.address || {};
        setResolvedAddress({
          addressLine1: [addr.road, addr.suburb].filter(Boolean).join(", ") || data.display_name?.split(",")[0],
          addressLine2: addr.neighbourhood || "",
          city: addr.city || addr.town || addr.village || "",
          state: addr.state || "",
          postalCode: addr.postcode || "",
          displayName: data.display_name?.split(",").slice(0, 3).join(", "),
          coordinates: { lat, lng },
        });
      } catch {
        console.log("Could not resolve address");
        setResolvedAddress(null);
      }
    } finally {
      setGeocoding(false);
    }
  };

  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    doReverseGeocode(newRegion.latitude, newRegion.longitude);
  };

  const locateMe = async () => {
    if (!hasPermission) {
      let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setHasPermission(true);
    }
    setGeocoding(true);
    let location = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
    const newRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    mapRef.current?.animateToRegion(newRegion, 500);
    doReverseGeocode(newRegion.latitude, newRegion.longitude);
  };

  const handleMapConfirm = () => {
    if (!resolvedAddress) return;
    setArea([resolvedAddress.addressLine1, resolvedAddress.addressLine2].filter(Boolean).join(", ") || resolvedAddress.displayName || '');
    setCity(resolvedAddress.city || '');
    setStateForm(resolvedAddress.state || '');
    setPostal(resolvedAddress.postalCode || '');
    setStep('form');
  };

  const handleSaveAddress = async () => {
    if (!houseNo.trim() || !city.trim() || !stateForm.trim()) {
      alert('Please fill House No., City, and State fields.');
      return;
    }
    setConfirming(true);

    try {
      const payload = {
        type: addressType,
        addressLine1: houseNo,
        addressLine2: area,
        city,
        state: stateForm,
        postalCode: postal,
        mobile,
        coordinates: resolvedAddress.coordinates,
      };

      const res = await userApi.addAddress(payload);
      const responseData = res.data;
      
      // Backend returns the full array of addresses, grab the newest one
      const latestAddress = Array.isArray(responseData) ? responseData[responseData.length - 1] : responseData;
      const realId = latestAddress?._id || latestAddress?.id;

      const saved: SavedAddress = {
          ...payload,
          _id: realId || String(Date.now()),
      };

      if (realId) {
        try {
          await userApi.selectAddress({ addressId: realId });
        } catch (e) {
          try {
             await userApi.selectAddress(realId);
          } catch(err){}
        }
      }

      setSelectedAddress(saved);
      router.back();
    } catch (e) {
      // Fallback Visual Update
      const fallback: SavedAddress = {
        _id: String(Date.now()),
        type: addressType,
        addressLine1: houseNo,
        addressLine2: area,
        city,
        state: stateForm,
        postalCode: postal,
        coordinates: resolvedAddress?.coordinates,
      };
      setSelectedAddress(fallback);
      router.back();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => step === 'form' ? setStep('map') : router.back()}>
          <X size={24} color="#3D4152" />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={styles.headerTitle}>{step === 'map' ? 'Select delivery location' : 'Edit Address'}</Text>
        </View>
      </View>

      {step === 'map' ? (
        <>
          {/* Map Area */}
          <View style={styles.mapContainer}>
            {Platform.OS !== 'web' ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={region}
                showsUserLocation={false}
                onRegionChangeComplete={handleRegionChangeComplete}
              />
            ) : (
              <View style={[styles.map, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }]}>
                <Text style={{ fontFamily: 'Inter-Medium', color: '#6B7280' }}>Map Interactive Selection unavailable on Web Preview</Text>
              </View>
            )}
            
            <View style={styles.centerPinWrap} pointerEvents="none">
              <View style={styles.centerPinIcon}>
                <MapPin size={28} color="#000" fill="#000" />
              </View>
              <View style={styles.pinShadow} />
            </View>

            <TouchableOpacity style={styles.locateBtn} onPress={locateMe}>
              <Navigation size={18} color={PRIMARY} />
              <Text style={styles.locateBtnText}>Locate Me</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Display Card */}
          <View style={styles.bottomCard}>
            <View style={styles.addressRow}>
              <View style={styles.pinIconWrap}>
                <MapPin size={22} color={PRIMARY} fill="#FFF3E0" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                {geocoding ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={PRIMARY} />
                    <Text style={styles.loadingText}>Fetching location details...</Text>
                  </View>
                ) : resolvedAddress ? (
                  <>
                    <Text style={styles.addressLine1} numberOfLines={1}>
                      {resolvedAddress.displayName || [resolvedAddress.addressLine1, resolvedAddress.addressLine2].filter(Boolean).join(", ")}
                    </Text>
                    <Text style={styles.addressLine2} numberOfLines={2}>
                      {[resolvedAddress.city, resolvedAddress.state, resolvedAddress.postalCode].filter(Boolean).join(", ")}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.loadingText}>Move map to find location</Text>
                )}
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.confirmBtn, (!resolvedAddress || geocoding) && { opacity: 0.6 }]} 
              onPress={handleMapConfirm}
              disabled={!resolvedAddress || geocoding}
            >
              <Text style={styles.confirmBtnText}>Confirm Location</Text>
              <CheckCircle size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Form Area */
        <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Address Type Selectors */}
          <Text style={styles.sectionLabel}>Save as</Text>
          <View style={styles.typeRow}>
            {([
              { key: 'HOME', icon: Home, label: 'Home' },
              { key: 'WORK', icon: Briefcase, label: 'Work' },
              { key: 'OTHER', icon: MapPin, label: 'Other' },
            ] as const).map(item => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setAddressType(item.key)}
                style={[styles.typeBtn, addressType === item.key && styles.typeBtnActive]}
                activeOpacity={0.8}
              >
                <item.icon size={20} color={addressType === item.key ? PRIMARY : '#6B7280'} />
                <Text style={[styles.typeBtnText, addressType === item.key && styles.typeBtnTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form Fields */}
          <Text style={styles.sectionLabel}>House / Flat / Block No. *</Text>
          <TextInput
            style={styles.input}
            placeholder="House no, Flat, Block"
            value={houseNo}
            onChangeText={setHouseNo}
          />

          <Text style={styles.sectionLabel}>Apartment / Road / Area</Text>
          <TextInput
            style={styles.input}
            placeholder="Area, Colony, Street"
            value={area}
            onChangeText={setArea}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.sectionLabel}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="City"
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.sectionLabel}>State *</Text>
              <TextInput
                style={styles.input}
                placeholder="State"
                value={stateForm}
                onChangeText={setStateForm}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Postal Code</Text>
          <TextInput
            style={styles.input}
            placeholder="PIN Code"
            keyboardType="number-pad"
            value={postal}
            onChangeText={setPostal}
          />

          <Text style={styles.sectionLabel}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            value={mobile}
            onChangeText={setMobile}
          />

          <TouchableOpacity 
            style={[styles.confirmBtn, { marginTop: 20 }, confirming && { opacity: 0.6 }]} 
            onPress={handleSaveAddress}
            disabled={confirming}
          >
            {confirming ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmBtnText}>Save Address</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingTop: Platform.OS === 'ios' ? 50 : 20, 
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderColor: '#F3F4F6'
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: '#1A1A1A' },
  
  mapContainer: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
  
  centerPinWrap: {
    position: 'absolute', top: '50%', left: '50%',
    marginLeft: -14, marginTop: -28,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  centerPinIcon: { zIndex: 2, paddingBottom: 4 },
  pinShadow: { width: 12, height: 4, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.3)', marginTop: -6 },
  
  locateBtn: {
    position: 'absolute', bottom: 20, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  locateBtnText: { fontFamily: 'Inter-Bold', fontSize: 13, color: PRIMARY },
  
  bottomCard: {
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10,
    marginTop: -24
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  pinIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44 },
  loadingText: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#6B7280' },
  addressLine1: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#1A1A1A', marginBottom: 4 },
  addressLine2: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#6B7280', lineHeight: 18 },
  
  confirmBtn: {
    backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 54, borderRadius: 16,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  confirmBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#FFFFFF' },

  // Form Styles
  formContainer: { flex: 1, padding: 20 },
  sectionLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#1A1A1A', marginBottom: 8, marginTop: 16 },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: '#F3F4F6',
  },
  typeBtnActive: { borderColor: PRIMARY, backgroundColor: '#FFF7ED' },
  typeBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#6B7280' },
  typeBtnTextActive: { color: PRIMARY },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'Inter-Medium', fontSize: 15, color: '#1A1A1A', backgroundColor: '#F9FAFB',
  },
  row: { flexDirection: 'row', width: '100%' },
});

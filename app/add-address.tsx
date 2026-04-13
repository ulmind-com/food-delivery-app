import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Home, Briefcase, Check, Navigation } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { userApi } from '../services/api';

const PRIMARY = '#FC8019';
const PRIMARY_LIGHT = '#FFF7ED';
const TEXT_COLOR = '#1A1A1A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const INPUT_BG = '#F9FAFB';
const BG = '#F8F9FB';

export default function AddAddressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string; prefill?: string }>();

  const isEditing = !!params.editId;
  const editId = params.editId || '';

  const [type, setType] = useState('HOME');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [mobile, setMobile] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill for edit mode
  useEffect(() => {
    if (params.prefill) {
      try {
        const data = JSON.parse(params.prefill);
        setType(data.type || 'HOME');
        setAddressLine1(data.addressLine1 || '');
        setAddressLine2(data.addressLine2 || '');
        setCity(data.city || '');
        setState(data.state || '');
        setPostalCode(data.postalCode || '');
        setMobile(data.mobile || '');
      } catch {}
    }
  }, [params.prefill]);

  const handleSave = async () => {
    if (!addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
      setError('Please fill all mandatory fields (Address, City, State, PIN)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        type,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        mobile: mobile.trim()
      };

      if (isEditing) {
        await userApi.updateAddress(editId, payload);
      } else {
        await userApi.addAddress(payload);
      }
      router.back();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const TypeButton = ({ itemType, icon, label }: any) => {
    const isSelected = type === itemType;
    return (
      <TouchableOpacity
        style={[styles.typeBtn, isSelected && styles.typeBtnActive]}
        onPress={() => setType(itemType)}
        activeOpacity={0.8}
      >
        <View style={[styles.typeBtnIconWrap, isSelected && { backgroundColor: PRIMARY }]}>
          {React.cloneElement(icon, { color: isSelected ? '#FFF' : MUTED })}
        </View>
        <Text style={[styles.typeBtnText, isSelected && { color: PRIMARY }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={TEXT_COLOR} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Address' : 'Add New Address'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Pick From Map Banner */}
          {!isEditing && (
            <Animated.View entering={FadeInDown.delay(50).springify()}>
              <TouchableOpacity
                style={styles.mapBanner}
                activeOpacity={0.85}
                onPress={() => router.replace('/location-picker')}
              >
                <View style={styles.mapBannerIcon}>
                  <Navigation size={20} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapBannerTitle}>Pick from Map</Text>
                  <Text style={styles.mapBannerDesc}>Use GPS to auto-fill your address</Text>
                </View>
                <MapPin size={20} color={PRIMARY} />
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
                <View style={styles.dividerLine} />
              </View>
            </Animated.View>
          )}

          {error ? (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          <View style={styles.formArea}>

            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Text style={styles.label}>Save as</Text>
              <View style={styles.typeRow}>
                <TypeButton itemType="HOME" icon={<Home size={18} />} label="Home" />
                <TypeButton itemType="WORK" icon={<Briefcase size={18} />} label="Work" />
                <TypeButton itemType="OTHER" icon={<MapPin size={18} />} label="Other" />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <Text style={styles.label}>House / Flat / Block No. *</Text>
              <TextInput
                style={styles.inputArea}
                value={addressLine1}
                onChangeText={setAddressLine1}
                placeholder="House No., Building, Street Area"
                placeholderTextColor="#A1A1AA"
                multiline
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Text style={styles.label}>Apartment / Road / Area</Text>
              <TextInput
                style={styles.input}
                value={addressLine2}
                onChangeText={setAddressLine2}
                placeholder="Locality, Landmark"
                placeholderTextColor="#A1A1AA"
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>City *</Text>
                <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="e.g. Kolkata" placeholderTextColor="#A1A1AA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>State *</Text>
                <TextInput style={styles.input} value={state} onChangeText={setState} placeholder="e.g. West Bengal" placeholderTextColor="#A1A1AA" />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>PIN Code *</Text>
                <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" placeholder="e.g. 700001" placeholderTextColor="#A1A1AA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Mobile (Optional)</Text>
                <TextInput style={styles.input} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="+91" placeholderTextColor="#A1A1AA" />
              </View>
            </Animated.View>

          </View>
        </ScrollView>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.saveText}>{isEditing ? 'Update Address' : 'Save Address'}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_COLOR },
  backBtn: { padding: 8, marginLeft: -8, borderRadius: 12, backgroundColor: BG },

  scrollContent: { paddingVertical: 20 },

  // ── Map Banner ──
  mapBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 20, marginBottom: 20,
    padding: 16, borderRadius: 16,
    backgroundColor: PRIMARY_LIGHT,
    borderWidth: 1.5, borderColor: '#FDDCB5',
  },
  mapBannerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  mapBannerTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: TEXT_COLOR },
  mapBannerDesc: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED, marginTop: 2 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontFamily: 'Inter-Bold', fontSize: 11, color: MUTED, marginHorizontal: 12, letterSpacing: 0.5 },

  formArea: { paddingHorizontal: 20, gap: 16 },

  errorBox: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#DC2626', textAlign: 'center' },

  label: {
    fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_COLOR,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, paddingHorizontal: 16, height: 52,
    fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_COLOR,
  },
  inputArea: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, minHeight: 80,
    fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_COLOR, textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 12 },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  typeBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 14, paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  typeBtnActive: { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  typeBtnIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  typeBtnText: { fontFamily: 'Inter-Bold', fontSize: 13, color: MUTED },

  footer: {
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 10,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 16, height: 56,
    shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  saveText: { fontFamily: 'Inter-Black', fontSize: 16, color: '#FFFFFF' },
});

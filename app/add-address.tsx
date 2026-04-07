import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Home, Briefcase, Check } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { userApi } from '../services/api';

const PRIMARY = '#FC8019';
const TEXT_COLOR = '#1A1A1A';
const MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';
const INPUT_BG = '#F9FAFB';

export default function AddAddressScreen() {
  const router = useRouter();

  const [type, setType] = useState('HOME');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [mobile, setMobile] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
      setError('Please fill all mandatory fields (Address, City, State, ZIP)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await userApi.addAddress({
        type,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        mobile: mobile.trim()
      });
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
      >
        {icon}
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
        <Text style={styles.headerTitle}>Add New Address</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {error ? (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          <View style={styles.formArea}>
            
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Text style={styles.label}>Save delivery address as</Text>
              <View style={styles.typeRow}>
                <TypeButton itemType="HOME" icon={<Home size={18} color={type === 'HOME' ? PRIMARY : MUTED} />} label="Home" />
                <TypeButton itemType="WORK" icon={<Briefcase size={18} color={type === 'WORK' ? PRIMARY : MUTED} />} label="Work" />
                <TypeButton itemType="OTHER" icon={<MapPin size={18} color={type === 'OTHER' ? PRIMARY : MUTED} />} label="Other" />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <Text style={styles.label}>Address Line 1 *</Text>
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
              <Text style={styles.label}>Address Line 2 (Optional)</Text>
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
                <TextInput style={styles.input} value={state} onChangeText={setState} placeholder="e.g. WB" placeholderTextColor="#A1A1AA" />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>PIN Code *</Text>
                <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" placeholder="e.g. 700001" placeholderTextColor="#A1A1AA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Contact (Optional)</Text>
                <TextInput style={styles.input} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="+91" placeholderTextColor="#A1A1AA" />
              </View>
            </Animated.View>

          </View>
        </ScrollView>
        
        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.saveText}>Save Address</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: TEXT_COLOR },
  backBtn: { padding: 8, marginLeft: -8 },
  
  scrollContent: { paddingVertical: 24 },
  
  formArea: { paddingHorizontal: 24, gap: 16 },
  errorBox: {
    marginHorizontal: 24, marginBottom: 16,
    backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#DC2626', textAlign: 'center' },
  
  label: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_COLOR, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: INPUT_BG, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, height: 50,
    fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_COLOR,
  },
  inputArea: {
    backgroundColor: INPUT_BG, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14, minHeight: 80,
    fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_COLOR, textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 12 },

  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, height: 42,
  },
  typeBtnActive: { borderColor: PRIMARY, backgroundColor: 'rgba(252, 128, 25, 0.05)' },
  typeBtnText: { fontFamily: 'Inter-Bold', fontSize: 13, color: MUTED },

  footer: {
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: BORDER,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 16, height: 56,
    shadowColor: PRIMARY, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  saveText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#FFFFFF' },
});

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, TextInput, ScrollView, Image, ActivityIndicator, Dimensions, Pressable
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { authApi } from '../../services/api';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const TEXT_COLOR = '#1A1A1A';
const MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';
const INPUT_BG = '#F9FAFB';

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [focusField, setFocusField] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, TextInput | null>>({});

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !mobile.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      await authApi.register({ name: name.trim(), email: email.trim(), password, mobile: mobile.trim() });
      router.replace('/(auth)/login');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderInputRow = (
    field: string, val: string, setVal: any, placeholder: string,
    icon: any, config: any = {}
  ) => {
    const isFocused = focusField === field;
    return (
      <Animated.View entering={FadeInDown.delay(config.delay).springify().damping(16)}>
        <Text style={styles.label}>{config.label}</Text>
        <Pressable 
          onPress={() => inputRefs.current[field]?.focus()}
          style={[styles.inputWrap, isFocused && styles.inputFocused]}
        >
          {icon}
          <TextInput
            ref={(r) => { inputRefs.current[field] = r; }}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#A1A1AA"
            value={val}
            onChangeText={(t) => { setVal(t); setErrorMsg(''); }}
            onFocus={() => setFocusField(field)}
            onBlur={() => setFocusField(null)}
            autoCapitalize={config.capitalize || 'none'}
            keyboardType={config.keyboard || 'default'}
            secureTextEntry={config.secure && !showPwd}
          />
          {config.secure && (
            <Pressable onPress={() => setShowPwd(!showPwd)} hitSlop={15}>
              {showPwd ? <EyeOff size={20} color={MUTED} /> : <Eye size={20} color={MUTED} />}
            </Pressable>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* Header Action */}
          <Animated.View entering={FadeInDown.delay(50).springify().damping(14)} style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={15}>
              <View style={styles.backCircle}>
                <ArrowLeft size={20} color={TEXT_COLOR} />
              </View>
              <Text style={styles.backLabel}>Back to Login</Text>
            </Pressable>
          </Animated.View>

          {/* OP Hero Area */}
          <View style={styles.heroArea}>
            <Animated.View entering={FadeIn.delay(100).duration(800)} style={styles.heroBgShape1} />
            <Animated.View entering={FadeInDown.delay(150).springify().damping(14)}>
              <Image source={require('../../assets/images/delivery-hero.png')} style={styles.heroImage} resizeMode="contain" />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(200).springify().damping(14)}>
              <Text style={styles.title}>Join the OP Family</Text>
              <Text style={styles.subtext}>Create an account to get your favorite meals delivered fast! 🚀</Text>
            </Animated.View>
          </View>

          {/* Form */}
          <View style={styles.formArea}>
            {errorMsg ? (
              <Animated.View entering={FadeInUp.duration(300)} style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </Animated.View>
            ) : null}

            {renderInputRow('name', name, setName, 'John Doe', 
              <User size={20} color={focusField === 'name' ? PRIMARY : MUTED} />, 
              { label: 'Full Name', delay: 300, capitalize: 'words' }
            )}

            {renderInputRow('email', email, setEmail, 'name@example.com', 
              <Mail size={20} color={focusField === 'email' ? PRIMARY : MUTED} />, 
              { label: 'Email Address', delay: 350, keyboard: 'email-address' }
            )}

            {renderInputRow('mobile', mobile, setMobile, '+91 9999999999', 
              <Phone size={20} color={focusField === 'mobile' ? PRIMARY : MUTED} />, 
              { label: 'Phone Number', delay: 400, keyboard: 'phone-pad' }
            )}

            {renderInputRow('password', password, setPassword, '••••••••', 
              <Lock size={20} color={focusField === 'password' ? PRIMARY : MUTED} />, 
              { label: 'Password', delay: 450, secure: true }
            )}

            <Animated.View entering={FadeInDown.delay(550).springify().damping(16)}>
              <TouchableOpacity
                style={[styles.ctaBtn, loading && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.ctaText}>Create Account</Text>}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(650).springify().damping(16)} style={styles.footer}>
              <Text style={styles.footerTxt}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')} hitSlop={10}>
                <Text style={styles.footerLink}>Login Instead</Text>
              </TouchableOpacity>
            </Animated.View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1, paddingBottom: 50 },
  
  headerRow: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 10, zIndex: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  backLabel: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: TEXT_COLOR },

  // OP Hero
  heroArea: {
    alignItems: 'center',
    paddingHorizontal: 28,
    position: 'relative',
  },
  heroBgShape1: {
    position: 'absolute', top: 30,
    width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4,
    backgroundColor: 'rgba(252, 128, 25, 0.06)',
    zIndex: -1,
  },
  heroImage: { width: width * 0.45, height: width * 0.45, marginBottom: 12 },
  title: { fontFamily: 'Inter-Black', fontSize: 26, color: TEXT_COLOR, textAlign: 'center', letterSpacing: -0.5 },
  subtext: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 4, paddingHorizontal: 10 },

  // Form
  formArea: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  errorText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#DC2626', textAlign: 'center' },
  
  label: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_COLOR, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG,
    borderWidth: 2, borderColor: BORDER, borderRadius: 16,
    paddingHorizontal: 16, height: 56, gap: 12,
  },
  inputFocused: { borderColor: PRIMARY, backgroundColor: '#FFFFFF', shadowColor: PRIMARY, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  input: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_COLOR, height: '100%', paddingVertical: 0 },
  
  ctaBtn: {
    backgroundColor: PRIMARY, borderRadius: 16, height: 56,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 35,
    shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8,
  },
  ctaText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#FFFFFF', letterSpacing: 0.5 },
  
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  footerTxt: { fontFamily: 'Inter-Medium', fontSize: 14, color: MUTED },
  footerLink: { fontFamily: 'Inter-Bold', fontSize: 14, color: PRIMARY },
});

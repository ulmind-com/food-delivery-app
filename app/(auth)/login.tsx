import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, TextInput, ScrollView, Image, ActivityIndicator, Dimensions, Pressable
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../services/api';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const TEXT_COLOR = '#1A1A1A';
const MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';
const INPUT_BG = '#F9FAFB';

export default function LoginScreen() {
  const router = useRouter();
  const loginFn = useAuthStore((s) => s.login);
  const emailRef = useRef<TextInput>(null);
  const pwdRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await authApi.login({ email: email.trim(), password });
      
      const token = res.data.token;
      const userData = res.data.user || res.data;
      
      loginFn(userData, token);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
          
          {/* OP Hero Area */}
          <View style={styles.heroArea}>
            <Animated.View entering={FadeIn.duration(800)} style={styles.heroBgShape1} />
            <Animated.View entering={FadeIn.delay(200).duration(800)} style={styles.heroBgShape2} />
            
            <Animated.View entering={FadeInDown.delay(100).springify().damping(14)}>
              <Image source={require('../../assets/images/chef-mascot.png')} style={styles.heroImage} resizeMode="contain" />
            </Animated.View>
            
            <Animated.View entering={FadeInDown.delay(200).springify().damping(14)}>
              <Text style={styles.helloText}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtext}>Log in to your FoodieExpress account</Text>
            </Animated.View>
          </View>

          {/* Form */}
          <View style={styles.formArea}>
            {errorMsg ? (
              <Animated.View entering={FadeInUp.duration(300)} style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </Animated.View>
            ) : null}

            {/* Email */}
            <Animated.View entering={FadeInDown.delay(300).springify().damping(16)}>
              <Text style={styles.label}>Email Address</Text>
              <Pressable 
                onPress={() => emailRef.current?.focus()}
                style={[styles.inputWrap, emailFocused && styles.inputFocused]}
              >
                <Mail size={20} color={emailFocused ? PRIMARY : MUTED} />
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#A1A1AA"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </Pressable>
            </Animated.View>

            {/* Password */}
            <Animated.View entering={FadeInDown.delay(400).springify().damping(16)}>
              <Text style={styles.label}>Password</Text>
              <Pressable 
                onPress={() => pwdRef.current?.focus()}
                style={[styles.inputWrap, pwdFocused && styles.inputFocused]}
              >
                <Lock size={20} color={pwdFocused ? PRIMARY : MUTED} />
                <TextInput
                  ref={pwdRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#A1A1AA"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
                  secureTextEntry={!showPwd}
                  onFocus={() => setPwdFocused(true)}
                  onBlur={() => setPwdFocused(false)}
                />
                <Pressable onPress={() => setShowPwd(!showPwd)} hitSlop={15}>
                  {showPwd ? <EyeOff size={20} color={MUTED} /> : <Eye size={20} color={MUTED} />}
                </Pressable>
              </Pressable>
              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotLabel}>Forgot Password?</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Login CTA */}
            <Animated.View entering={FadeInDown.delay(500).springify().damping(16)}>
              <TouchableOpacity
                style={[styles.ctaBtn, loading && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.ctaText}>Login</Text>}
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <Animated.View entering={FadeInDown.delay(600).springify().damping(16)} style={styles.footer}>
              <Text style={styles.footerTxt}>New to FoodieExpress? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')} hitSlop={10}>
                <Text style={styles.footerLink}>Create Account</Text>
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
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  
  // OP Hero
  heroArea: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 70 : 60,
    paddingBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBgShape1: {
    position: 'absolute', top: -50, right: -40,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(252, 128, 25, 0.08)',
  },
  heroBgShape2: {
    position: 'absolute', top: 80, left: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255, 179, 71, 0.12)',
  },
  heroImage: { width: width * 0.5, height: width * 0.5, marginBottom: 16 },
  helloText: { fontFamily: 'Inter-Black', fontSize: 32, color: TEXT_COLOR, textAlign: 'center', letterSpacing: -0.5 },
  welcomeSubtext: { fontFamily: 'Inter-Medium', fontSize: 15, color: MUTED, textAlign: 'center', marginTop: 6 },
  
  // Form
  formArea: { flex: 1, paddingHorizontal: 28, paddingTop: 10 },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  errorText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#DC2626', textAlign: 'center' },
  
  label: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_COLOR, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG,
    borderWidth: 2, borderColor: BORDER, borderRadius: 16,
    paddingHorizontal: 16, height: 56, gap: 12,
  },
  inputFocused: { borderColor: PRIMARY, backgroundColor: '#FFFFFF', shadowColor: PRIMARY, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  input: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_COLOR, height: '100%', paddingVertical: 0 },
  
  forgotBtn: { alignSelf: 'flex-end', marginTop: 12, marginBottom: 30 },
  forgotLabel: { fontFamily: 'Inter-Bold', fontSize: 13, color: PRIMARY },
  
  ctaBtn: {
    backgroundColor: PRIMARY, borderRadius: 16, height: 56,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8,
  },
  ctaText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#FFFFFF', letterSpacing: 0.5 },
  
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 35 },
  footerTxt: { fontFamily: 'Inter-Medium', fontSize: 14, color: MUTED },
  footerLink: { fontFamily: 'Inter-Bold', fontSize: 14, color: PRIMARY },
});

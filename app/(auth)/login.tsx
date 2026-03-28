import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, CheckSquare, Square } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../services/api';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const TEXT_COLOR = '#2D2D2D';
const MUTED = '#8A8A8A';
const BORDER = '#EBEBEB';
const INPUT_BG = '#F7F8FA';

export default function LoginScreen() {
  const router = useRouter();
  const loginFn = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);

  // Animations
  const heroOp = useSharedValue(0);
  const heroScale = useSharedValue(0.85);
  const formOp = useSharedValue(0);
  const formY = useSharedValue(25);

  useEffect(() => {
    heroOp.value = withTiming(1, { duration: 500 });
    heroScale.value = withSpring(1, { damping: 16, stiffness: 180 });
    formOp.value = withDelay(250, withTiming(1, { duration: 450 }));
    formY.value = withDelay(250, withTiming(0, { duration: 450, easing: Easing.out(Easing.ease) }));
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOp.value,
    transform: [{ scale: heroScale.value }],
  }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: formOp.value,
    transform: [{ translateY: formY.value }],
  }));

  const handleLogin = async () => {
    if (!email.trim()) { setErrorMsg('Please enter your email'); return; }
    if (!password.trim()) { setErrorMsg('Please enter your password'); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await authApi.login({ email: email.trim(), password });
      loginFn(res.data.user, res.data.token);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Hero Area */}
          <Animated.View style={[styles.heroArea, heroStyle]}>
            <View style={styles.heroBg}>
              {/* Decorative circles */}
              <View style={styles.heroCircle1} />
              <View style={styles.heroCircle2} />
              <Text style={styles.helloText}>Hello!</Text>
              <Text style={styles.welcomeSubtext}>Welcome to FoodieExpress</Text>
              <Image
                source={require('../../assets/images/login-hero.png')}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* Form */}
          <Animated.View style={[styles.formArea, formStyle]}>
            <Text style={styles.formTitle}>Login</Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={[
              styles.inputWrap,
              emailFocused && styles.inputFocused,
            ]}>
              <Mail size={18} color={emailFocused ? PRIMARY : MUTED} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#C0C0C0"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={[
              styles.inputWrap,
              pwdFocused && styles.inputFocused,
            ]}>
              <Lock size={18} color={pwdFocused ? PRIMARY : MUTED} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#C0C0C0"
                value={password}
                onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
                secureTextEntry={!showPwd}
                autoCorrect={false}
                onFocus={() => setPwdFocused(true)}
                onBlur={() => setPwdFocused(false)}
              />
              <Pressable onPress={() => setShowPwd(!showPwd)} hitSlop={10}>
                {showPwd ? <EyeOff size={20} color={MUTED} /> : <Eye size={20} color={MUTED} />}
              </Pressable>
            </View>

            {/* Remember + Forgot */}
            <View style={styles.optionsRow}>
              <Pressable style={styles.rememberBtn} onPress={() => setRemember(!remember)}>
                {remember
                  ? <CheckSquare size={18} color={PRIMARY} />
                  : <Square size={18} color={MUTED} />
                }
                <Text style={styles.rememberLabel}>Remember me</Text>
              </Pressable>
              <TouchableOpacity>
                <Text style={styles.forgotLabel}>Forgot Password</Text>
              </TouchableOpacity>
            </View>

            {/* Login CTA */}
            <TouchableOpacity
              style={[styles.ctaBtn, loading && { opacity: 0.65 }]}
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.ctaText}>Login</Text>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social */}
            <View style={styles.socialRow}>
              {['G', '🍎', 'f'].map((icon, i) => (
                <TouchableOpacity key={i} style={styles.socialBtn} activeOpacity={0.7}>
                  <Text style={styles.socialIcon}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerTxt}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1 },
  // Hero
  heroArea: { overflow: 'hidden' },
  heroBg: {
    backgroundColor: '#FFF5EB',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    position: 'relative',
  },
  heroCircle1: {
    position: 'absolute', top: -30, right: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FC8019', opacity: 0.08,
  },
  heroCircle2: {
    position: 'absolute', top: 50, left: -20,
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#FFB347', opacity: 0.1,
  },
  helloText: {
    fontFamily: 'Inter-ExtraBold', fontSize: 30, color: TEXT_COLOR,
  },
  welcomeSubtext: {
    fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED, marginTop: 2, marginBottom: 12,
  },
  heroImage: { width: width * 0.45, height: width * 0.38 },
  // Form
  formArea: { flex: 1, paddingHorizontal: 28, paddingTop: 24 },
  formTitle: {
    fontFamily: 'Inter-Bold', fontSize: 22, color: TEXT_COLOR,
    textAlign: 'center', marginBottom: 18,
  },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#DC2626', textAlign: 'center' },
  label: {
    fontFamily: 'Inter-SemiBold', fontSize: 13, color: TEXT_COLOR,
    marginBottom: 6, marginTop: 14,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  inputFocused: {
    borderColor: PRIMARY,
    backgroundColor: '#FFF9F3',
  },
  input: {
    flex: 1, fontFamily: 'Inter', fontSize: 15, color: TEXT_COLOR,
    paddingVertical: 0, // CRITICAL for web input
    height: '100%',
  },
  optionsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 16, marginBottom: 24,
  },
  rememberBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rememberLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_COLOR },
  forgotLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: PRIMARY },
  ctaBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, height: 54,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  ctaText: { fontFamily: 'Inter-Bold', fontSize: 17, color: '#fff', letterSpacing: 0.3 },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 22,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED, marginHorizontal: 14 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
  socialBtn: {
    width: 54, height: 54, borderRadius: 16,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#FAFAFA',
    alignItems: 'center', justifyContent: 'center',
  },
  socialIcon: { fontSize: 20, fontFamily: 'Inter-Bold', color: TEXT_COLOR },
  footer: {
    flexDirection: 'row', justifyContent: 'center',
    paddingVertical: 24, paddingBottom: 36,
  },
  footerTxt: { fontFamily: 'Inter-Medium', fontSize: 14, color: MUTED },
  footerLink: { fontFamily: 'Inter-Bold', fontSize: 14, color: PRIMARY },
});

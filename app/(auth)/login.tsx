import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, TextInput, ScrollView, Image, ActivityIndicator, Dimensions, Pressable
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, Check } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, Pattern, Rect, Line } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#FC8019'; // User requested Orange instead of Yellow
const TEXT_COLOR = '#1A1A1A';
const BORDER = '#F3F4F6';
const INPUT_BG = '#FFFFFF';

const BackgroundGrid = () => (
  <View style={StyleSheet.absoluteFill}>
    {/* Base Background is Black */}
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />
    
    {/* Top Sunset Glow - Orange */}
    <LinearGradient
      colors={['#FC8019', '#000000']}
      locations={[0, 0.35]}
      style={StyleSheet.absoluteFill}
    />
    
    {/* Perspective Grid Line Overlay */}
    <View style={{ position: 'absolute', top: '35%', left: 0, right: 0, height: height * 0.3, zIndex: 0 }}>
      {/* Fade the top edge of the grid */}
      <LinearGradient colors={['#000000', 'transparent']} locations={[0, 0.3]} style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 40, zIndex: 1 }} />
      <Svg width={width} height={height * 0.3} preserveAspectRatio="none">
        {/* Horizontal lines */}
        <Line x1={0} y1={height * 0.3 * 0.1} x2={width} y2={height * 0.3 * 0.1} stroke="rgba(252,128,25,0.2)" strokeWidth={1} />
        <Line x1={0} y1={height * 0.3 * 0.25} x2={width} y2={height * 0.3 * 0.25} stroke="rgba(252,128,25,0.3)" strokeWidth={1} />
        <Line x1={0} y1={height * 0.3 * 0.45} x2={width} y2={height * 0.3 * 0.45} stroke="rgba(252,128,25,0.4)" strokeWidth={1.2} />
        <Line x1={0} y1={height * 0.3 * 0.75} x2={width} y2={height * 0.3 * 0.75} stroke="rgba(252,128,25,0.5)" strokeWidth={1.5} />
        
        {/* Perspective radiating lines */}
        <Path d={`M${width/2} 0 L${width/2} ${height * 0.3}`} stroke="rgba(252,128,25,0.4)" strokeWidth={1.2} />
        <Path d={`M${width/2} 0 L${width*0.25} ${height * 0.3}`} stroke="rgba(252,128,25,0.4)" strokeWidth={1.2} />
        <Path d={`M${width/2} 0 L${width*0.75} ${height * 0.3}`} stroke="rgba(252,128,25,0.4)" strokeWidth={1.2} />
        <Path d={`M${width/2} 0 L${-width*0.1} ${height * 0.3}`} stroke="rgba(252,128,25,0.4)" strokeWidth={1.2} />
        <Path d={`M${width/2} 0 L${width*1.1} ${height * 0.3}`} stroke="rgba(252,128,25,0.4)" strokeWidth={1.2} />
        <Path d={`M${width/2} 0 L${-width*0.5} ${height * 0.3}`} stroke="rgba(252,128,25,0.3)" strokeWidth={1} />
        <Path d={`M${width/2} 0 L${width*1.5} ${height * 0.3}`} stroke="rgba(252,128,25,0.3)" strokeWidth={1} />
      </Svg>
    </View>
  </View>
);

export default function LoginScreen() {
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [focusField, setFocusField] = useState<string | null>(null);
  const pwdRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter email and password');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await authApi.login({ email: email.trim(), password });
      
      // Backend returns { _id, name, email, token, role }
      const { token, ...userData } = res.data;
      
      setToken(token);
      setUser(userData);
      
      // Admin vs User Routing
      const role = (userData.user?.role || userData.role || '').toLowerCase();
      if (role === 'admin') {
        router.replace('/role-selection');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const renderInputBox = (
    field: string, val: string, setVal: any, label: string, placeholder: string,
    IconComp: any, config: any = {}
  ) => {
    const isFocused = focusField === field;
    return (
      <Animated.View entering={FadeInDown.delay(config.delay).duration(500)}>
        <Text style={styles.label}>{label}</Text>
        <Pressable 
          onPress={() => (field === 'email' ? emailRef : pwdRef).current?.focus()}
          style={[styles.inputWrap, isFocused && styles.inputFocused]}
        >
          <IconComp size={18} color="#6B7280" style={{ marginRight: 8 }} />
          <TextInput
            ref={field === 'email' ? emailRef : pwdRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#A1A1AA"
            value={val}
            onChangeText={(t) => { setVal(t); setErrorMsg(''); }}
            onFocus={() => setFocusField(field)}
            onBlur={() => setFocusField(null)}
            autoCapitalize="none"
            keyboardType={config.keyboard || 'default'}
            secureTextEntry={config.secure && !showPwd}
          />
          {config.secure && (
            <Pressable onPress={() => setShowPwd(!showPwd)} hitSlop={15}>
              {showPwd ? <EyeOff size={18} color="#6B7280" /> : <Eye size={18} color="#6B7280" />}
            </Pressable>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundGrid />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled" 
          bounces={false}
          automaticallyAdjustKeyboardInsets={true}
        >
          
          {/* Hero Area */}
          <View style={styles.heroArea}>
            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
              <Image source={require('../../assets/logo/restaurantLOGO.png')} style={styles.heroImage} resizeMode="contain" />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <Text style={styles.helloText}>Welcome Back !</Text>
              <Text style={styles.welcomeSubtext}>Your world of living colors awaits</Text>
            </Animated.View>
          </View>

          {/* Form */}
          <View style={styles.formArea}>
            {errorMsg ? (
              <Animated.View entering={FadeInUp.duration(300)} style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </Animated.View>
            ) : null}

            {renderInputBox(
              'email', email, setEmail, 'Email', 'davidjonson@gmail.com', Mail,
              { delay: 300, keyboard: 'email-address' }
            )}

            {renderInputBox(
              'password', password, setPassword, 'Password', 'xxxxxxxx', Lock,
              { delay: 400, secure: true }
            )}

            {/* Remember Me & Forgot Password Row */}
            <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.optionsRow}>
              <TouchableOpacity style={styles.rememberWrap} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.8}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Check size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity hitSlop={10}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600).duration(500)}>
              <TouchableOpacity
                style={[styles.ctaBtn, loading && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.ctaText}>Log In</Text>}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(700).duration(500)} style={styles.footer}>
              <Text style={styles.footerTxt}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/register')} hitSlop={10}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </Animated.View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  gridContainer: { position: 'absolute', top: height * 0.45, left: 0, right: 0, height: height * 0.5 },
  scrollContent: { flexGrow: 1 },
  
  // Hero Area
  heroArea: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 70 : 60,
    paddingBottom: 25,
    minHeight: height * 0.45,
    justifyContent: 'center'
  },
  heroImage: { width: width * 0.75, height: 190, marginBottom: 16 },
  helloText: { fontFamily: 'Inter-Black', fontSize: 32, color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.5 },
  welcomeSubtext: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#D1D5DB', textAlign: 'center', marginTop: 4 },
  
  // Form Area
  formArea: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 36, 
    borderTopRightRadius: 36, 
    paddingHorizontal: 28, 
    paddingTop: 35,
    paddingBottom: Platform.OS === 'ios' ? 40 : 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#FCA5A5' },
  errorText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#DC2626', textAlign: 'center' },
  
  label: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#4B5563', marginBottom: 8, marginTop: 16 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 16,
    paddingHorizontal: 16, height: 56,
  },
  inputFocused: { borderColor: PRIMARY },
  input: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_COLOR, height: '100%', paddingVertical: 0 },
  
  optionsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, marginBottom: 25,
  },
  rememberWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { 
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA'
  },
  checkboxActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  rememberText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#6B7280' },
  forgotText: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#DC2626' },
  
  ctaBtn: {
    backgroundColor: PRIMARY, borderRadius: 28, height: 56, // Large Pill
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { fontFamily: 'Inter-Bold', fontSize: 16, color: TEXT_COLOR, letterSpacing: 0.3 }, // Black text on Orange
  
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  footerTxt: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#6B7280' },
  footerLink: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_COLOR },
});

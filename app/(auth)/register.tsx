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
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Mail, Lock, Eye, EyeOff, User, Phone,
  ArrowLeft, CheckSquare, Square,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../services/api';

const PRIMARY    = '#FC8019';
const TEXT_COLOR = '#2D2D2D';
const MUTED      = '#8A8A8A';
const BORDER     = '#EBEBEB';
const INPUT_BG   = '#F7F8FA';

export default function RegisterScreen() {
  const router = useRouter();
  const loginFn = useAuthStore((s) => s.login);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [focusField, setFocusField] = useState('');

  const headerOp = useSharedValue(0);
  const formOp = useSharedValue(0);
  const formY = useSharedValue(20);

  useEffect(() => {
    headerOp.value = withTiming(1, { duration: 400 });
    formOp.value = withDelay(150, withTiming(1, { duration: 400 }));
    formY.value = withDelay(150, withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }));
  }, []);

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOp.value }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: formOp.value, transform: [{ translateY: formY.value }],
  }));

  const handleRegister = async () => {
    if (!name.trim()) { setErrorMsg('Please enter your name'); return; }
    if (!email.trim()) { setErrorMsg('Please enter your email'); return; }
    if (!mobile.trim() || mobile.length < 10) { setErrorMsg('Please enter a valid phone number'); return; }
    if (!password.trim() || password.length < 6) { setErrorMsg('Password must be at least 6 characters'); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await authApi.register({
        name: name.trim(), email: email.trim(),
        password, mobile: mobile.trim(),
      });
      loginFn(res.data.user, res.data.token);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    field: string, value: string, setter: (v: string) => void,
    placeholder: string, icon: React.ReactNode,
    options: { secure?: boolean; keyboard?: any; capitalize?: any } = {}
  ) => {
    const isFocused = focusField === field;
    return (
      <View style={[styles.inputWrap, isFocused && styles.inputFocused]}>
        {icon}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#C0C0C0"
          value={value}
          onChangeText={(t) => { setter(t); setErrorMsg(''); }}
          secureTextEntry={options.secure && !showPwd}
          keyboardType={options.keyboard || 'default'}
          autoCapitalize={options.capitalize || 'none'}
          autoCorrect={false}
          onFocus={() => setFocusField(field)}
          onBlur={() => setFocusField('')}
        />
        {options.secure && (
          <Pressable onPress={() => setShowPwd(!showPwd)} hitSlop={10}>
            {showPwd ? <EyeOff size={20} color={MUTED} /> : <Eye size={20} color={MUTED} />}
          </Pressable>
        )}
      </View>
    );
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
          {/* Header */}
          <Animated.View style={[styles.header, headerStyle]}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
              <View style={styles.backCircle}>
                <ArrowLeft size={20} color={TEXT_COLOR} />
              </View>
              <Text style={styles.backLabel}>Back to Login</Text>
            </Pressable>
          </Animated.View>

          {/* Form */}
          <Animated.View style={[styles.formArea, formStyle]}>
            {/* Title with decorative line */}
            <View style={styles.titleRow}>
              <View style={styles.titleDeco} />
              <Text style={styles.title}>Create Account</Text>
              <View style={styles.titleDeco} />
            </View>
            <Text style={styles.titleSub}>Join thousands of happy foodies 🍕</Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Inputs */}
            <Text style={styles.label}>Full Name</Text>
            {renderInput('name', name, setName, 'John Doe',
              <User size={18} color={focusField === 'name' ? PRIMARY : MUTED} />,
              { capitalize: 'words' }
            )}

            <Text style={styles.label}>Email Address</Text>
            {renderInput('email', email, setEmail, 'you@example.com',
              <Mail size={18} color={focusField === 'email' ? PRIMARY : MUTED} />,
              { keyboard: 'email-address' }
            )}

            <Text style={styles.label}>Phone Number</Text>
            {renderInput('mobile', mobile, setMobile, '9876543210',
              <Phone size={18} color={focusField === 'mobile' ? PRIMARY : MUTED} />,
              { keyboard: 'phone-pad' }
            )}

            <Text style={styles.label}>Password</Text>
            {renderInput('password', password, setPassword, '••••••••',
              <Lock size={18} color={focusField === 'password' ? PRIMARY : MUTED} />,
              { secure: true }
            )}

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

            {/* CTA */}
            <TouchableOpacity
              style={[styles.ctaBtn, loading && { opacity: 0.65 }]}
              activeOpacity={0.8}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.ctaText}>Create Account</Text>
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
              <Text style={styles.footerTxt}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.footerLink}>Login</Text>
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backCircle: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  backLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_COLOR },
  formArea: { flex: 1, paddingHorizontal: 28, paddingTop: 12 },
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 12, marginBottom: 6,
  },
  titleDeco: { flex: 1, height: 1.5, backgroundColor: '#FFDDB5', maxWidth: 40 },
  title: { fontFamily: 'Inter-Bold', fontSize: 26, color: TEXT_COLOR },
  titleSub: {
    fontFamily: 'Inter-Medium', fontSize: 14, color: MUTED,
    textAlign: 'center', marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#DC2626', textAlign: 'center' },
  label: {
    fontFamily: 'Inter-SemiBold', fontSize: 13, color: TEXT_COLOR,
    marginBottom: 6, marginTop: 12,
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
    borderColor: PRIMARY, backgroundColor: '#FFF9F3',
  },
  input: {
    flex: 1, fontFamily: 'Inter', fontSize: 15, color: TEXT_COLOR,
    paddingVertical: 0,
    height: '100%',
  },
  optionsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 16, marginBottom: 22,
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
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
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
    paddingVertical: 24, paddingBottom: 40,
  },
  footerTxt: { fontFamily: 'Inter-Medium', fontSize: 14, color: MUTED },
  footerLink: { fontFamily: 'Inter-Bold', fontSize: 14, color: PRIMARY },
});

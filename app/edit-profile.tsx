import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, User as UserIcon, Mail, Phone, Camera, Check } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '../store/useAuthStore';
import { userApi, uploadApi } from '../services/api';
import { resolveImageURL } from '../lib/image-utils';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

const PRIMARY = '#FC8019';
const TEXT_COLOR = '#1A1A1A';
const MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';
const INPUT_BG = '#F9FAFB';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [freshImage, setFreshImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    userApi.getProfile()
      .then((res) => {
        const profile = res.data?.user || res.data;
        if (profile?.profileImage) {
          setFreshImage(profile.profileImage);
        }
      })
      .catch((err) => console.log('Error fetching fresh profile:', err));
  }, []);

  const displayImage = freshImage || user?.profileImage;

  const handleImageUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingImage(true);
        const asset = result.assets[0];

        // Format for React Native multipart form data
        const formData = new FormData();
        formData.append('image', {
          uri: asset.uri,
          name: asset.fileName || 'profile.jpg',
          type: asset.mimeType || 'image/jpeg',
        } as any);

        const uploadRes = await uploadApi.uploadImage(formData);
        const imageUrl = uploadRes.data?.url || uploadRes.data?.imageURL || uploadRes.data?.image;

        if (imageUrl) {
          await userApi.updateProfile({ profileImage: imageUrl });
          setUser({ ...user, profileImage: imageUrl } as any);
          setFreshImage(imageUrl);
        }
      }
    } catch (err: any) {
      console.log('Error uploading image:', err);
      // Silent catch, or show alert
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !mobile.trim()) {
      setError('Name and Mobile are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await userApi.updateProfile({ name: name.trim(), mobile: mobile.trim() });
      if (res.data?.user) {
        setUser({ ...user, ...res.data.user });
      }
      router.back();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={TEXT_COLOR} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              {displayImage ? (
                <Image source={{ uri: resolveImageURL(displayImage) }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.cameraBtn} onPress={handleImageUpload} disabled={uploadingImage}>
                {uploadingImage ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Camera size={16} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {error ? (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          <View style={styles.formArea}>
            {/* Read-Only Email */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrap, { backgroundColor: '#F3F4F6' }]}>
                <Mail size={20} color={MUTED} />
                <TextInput style={[styles.input, { color: MUTED }]} value={user?.email} editable={false} />
              </View>
            </Animated.View>

            {/* Name */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrap}>
                <UserIcon size={20} color={name ? PRIMARY : MUTED} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  placeholderTextColor="#A1A1AA"
                />
              </View>
            </Animated.View>

            {/* Phone */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrap}>
                <Phone size={20} color={mobile ? PRIMARY : MUTED} />
                <TextInput
                  style={styles.input}
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                  placeholder="+91 9999999999"
                  placeholderTextColor="#A1A1AA"
                />
              </View>
            </Animated.View>

            {/* Save Button */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={{ marginTop: 24 }}>
              <TouchableOpacity
                style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                activeOpacity={0.8}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                  <>
                    <Check size={20} color="#FFFFFF" />
                    <Text style={styles.saveText}>Save Details</Text>
                  </>
                )}
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: TEXT_COLOR },
  backBtn: { padding: 8, marginLeft: -8 },
  
  scrollContent: { paddingVertical: 24 },
  
  avatarContainer: { alignItems: 'center', marginBottom: 32 },
  avatarRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 3, borderColor: 'rgba(252, 128, 25, 0.2)',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(252, 128, 25, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontFamily: 'Inter-Black', fontSize: 36, color: PRIMARY },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
  },

  formArea: { paddingHorizontal: 24, gap: 16 },
  errorBox: {
    marginHorizontal: 24, marginBottom: 16,
    backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#DC2626', textAlign: 'center' },
  
  label: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_COLOR, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: INPUT_BG, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 16, paddingHorizontal: 16, height: 56,
  },
  input: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_COLOR, height: '100%', paddingVertical: 0 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 16, height: 56,
    shadowColor: PRIMARY, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  saveText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#FFFFFF' },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, TextInput, Alert, Modal, KeyboardAvoidingView, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { menuApi, categoryApi, uploadApi } from '../../services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus, Trash2, Edit2, X, ImagePlus, Grid } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { resolveImageURL } from '../../lib/image-utils';
import { SkeletonCard } from '../../components/Skeleton';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';
const ACCENT = '#0EA5E9'; // Sky blue for Categories

export default function AdminCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // Create / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pickedAsset, setPickedAsset] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await menuApi.getCategories();
      setCategories(res.data || []);
    } catch (e) {
      console.log('Error fetching categories:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const openCreate = () => {
    setEditing(null);
    setName('');
    setImagePreview(null);
    setPickedAsset(null);
    setShowModal(true);
  };

  const openEdit = (cat: any) => {
    setEditing(cat);
    setName(cat.name || '');
    setImagePreview(cat.imageURL || cat.image || null);
    setPickedAsset(null);
    setShowModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setPickedAsset(asset);
      setImagePreview(asset.uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Please enter a category name.');
    setSaving(true);
    try {
      let imageURL = editing ? (editing.imageURL || editing.image || '') : '';
      if (pickedAsset) {
        const file = {
          uri: pickedAsset.uri,
          name: pickedAsset.fileName || pickedAsset.uri.split('/').pop() || 'category.jpg',
          type: pickedAsset.mimeType || 'image/jpeg',
        };
        const urls = await uploadApi.uploadMultipleImages([file]);
        imageURL = urls[0];
      }

      if (editing) {
        await categoryApi.update(editing._id, { name: name.trim(), imageURL });
      } else {
        await categoryApi.create({ name: name.trim(), imageURL });
      }
      setShowModal(false);
      fetchCategories();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = (id: string, catName: string) => {
    Alert.alert('Delete Category?', `Delete "${catName}"? This will affect products linked to this category.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await categoryApi.delete(id);
            setCategories(prev => prev.filter(c => c._id !== id));
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to delete category');
          }
      }}
    ]);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const img = item.imageURL || item.image;
    return (
      <Animated.View entering={FadeInDown.delay(index * 20).duration(400)} style={styles.card}>
        <View style={styles.avatarWrap}>
          {img ? (
            <Image source={{ uri: resolveImageURL(img) }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={{ fontSize: 28 }}>🍽️</Text>
            </View>
          )}
        </View>
        <Text style={styles.catName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => openEdit(item)} style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]}>
            <Edit2 size={14} color={ACCENT} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteCategory(item._id, item.name)} style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}>
            <Trash2 size={14} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.headerTitle}>Categories</Text>
            <Text style={styles.headerSubtitle}>{categories.length} Menu Categories</Text>
          </View>
          <TouchableOpacity style={styles.fabBtn} onPress={openCreate}>
            <Plus size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: 14 }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Grid size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No categories yet.</Text>
            </View>
          }
        />
      )}

      {/* Create / Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: BG_COLOR }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitleText}>{editing ? 'Edit Category' : 'New Category'}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
              <X size={20} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category Image</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                {imagePreview ? (
                  <Image source={{ uri: resolveImageURL(imagePreview) }} style={styles.pickedImage} contentFit="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <ImagePlus size={28} color={ACCENT} />
                    <Text style={styles.imagePlaceholderText}>Tap to upload</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category Name</Text>
              <TextInput style={styles.textInput} placeholder="e.g. Biryani" value={name} onChangeText={setName} />
            </View>

            <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>{editing ? 'SAVE CHANGES' : 'CREATE CATEGORY'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: CARD_BG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4, zIndex: 10 },
  headerTitle: { fontFamily: 'Jakarta-ExtraBold', fontSize: 28, color: TEXT_DARK, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: ACCENT, marginTop: 2 },
  fabBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },

  listContent: { padding: 16, paddingBottom: 40 },
  card: { flex: 1, backgroundColor: CARD_BG, borderRadius: 20, padding: 16, marginBottom: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  avatarWrap: { padding: 3, borderRadius: 50, borderWidth: 2, borderColor: '#E0F2FE' },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#F1F5F9' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  catName: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_DARK, marginTop: 12, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  emptyState: { paddingTop: 80, alignItems: 'center', justifyContent: 'center', width: '100%' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_MUTED },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: CARD_BG, borderBottomColor: BORDER_COLOR, borderBottomWidth: 1 },
  modalTitleText: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_DARK },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },

  inputGroup: { marginBottom: 20 },
  inputLabel: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  textInput: { height: 50, backgroundColor: CARD_BG, borderRadius: 12, paddingHorizontal: 16, fontFamily: 'Inter-SemiBold', fontSize: 15, color: TEXT_DARK, borderWidth: 1, borderColor: BORDER_COLOR },

  imagePicker: { height: 160, borderRadius: 16, borderWidth: 2, borderColor: BORDER_COLOR, borderStyle: 'dashed', backgroundColor: CARD_BG, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pickedImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: TEXT_MUTED, marginTop: 8 },

  submitBtn: { height: 56, backgroundColor: ACCENT, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { fontFamily: 'Inter-Black', fontSize: 15, color: '#FFF', letterSpacing: 1 },
});

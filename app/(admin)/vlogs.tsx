import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, TextInput, Alert, Modal, KeyboardAvoidingView, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vlogApi, uploadApi } from '../../services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus, Trash2, Eye, EyeOff, Film, Image as ImageIcon, X, Play, Upload } from 'lucide-react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { resolveImageURL } from '../../lib/image-utils';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';
const ACCENT = '#10B981'; // Green for Vlogs
const { width } = Dimensions.get('window');
const CARD_W = (width - 16 * 2 - 14) / 2;

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

export default function AdminVlogsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vlogs, setVlogs] = useState<any[]>([]);

  // Create modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Preview modal
  const [previewVlog, setPreviewVlog] = useState<any>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchVlogs = async () => {
    try {
      const res = await vlogApi.getAdminVlogs();
      setVlogs(res.data || []);
    } catch (e) {
      console.log('Error fetching vlogs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVlogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVlogs();
  };

  const resetForm = () => {
    setShowModal(false);
    setTitle('');
    setDescription('');
    setMediaUrl('');
    setThumbnailUrl('');
    setMediaType('IMAGE');
  };

  const pickMedia = async (target: 'media' | 'thumbnail') => {
    const wantVideo = target === 'media' && mediaType === 'VIDEO';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: wantVideo ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: wantVideo ? 1 : 0.7,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];

    setUploading(true);
    try {
      const file = {
        uri: asset.uri,
        name: asset.fileName || asset.uri.split('/').pop() || (wantVideo ? 'vlog.mp4' : 'vlog.jpg'),
        type: asset.mimeType || (wantVideo ? 'video/mp4' : 'image/jpeg'),
      };
      let url: string;
      if (wantVideo) {
        const res = await uploadApi.uploadVideo(file);
        url = res.data.url;
      } else {
        const urls = await uploadApi.uploadMultipleImages([file]);
        url = urls[0];
      }
      if (target === 'media') setMediaUrl(url);
      else setThumbnailUrl(url);
    } catch (e) {
      Alert.alert('Error', 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return Alert.alert('Error', 'Title is required');
    if (!mediaUrl) return Alert.alert('Error', 'Please upload media first');
    setSubmitting(true);
    try {
      await vlogApi.createVlog({ title, description, mediaUrl, mediaType, thumbnailUrl });
      resetForm();
      fetchVlogs();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublish = async (vlog: any) => {
    setTogglingId(vlog._id);
    try {
      await vlogApi.updateVlog(vlog._id, { isPublished: !vlog.isPublished });
      setVlogs((prev) => prev.map((v) => (v._id === vlog._id ? { ...v, isPublished: !v.isPublished } : v)));
    } catch {
      Alert.alert('Error', 'Failed to update visibility');
    } finally {
      setTogglingId(null);
    }
  };

  const deleteVlog = (vlog: any) => {
    Alert.alert('Delete Post', `Delete "${vlog.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await vlogApi.deleteVlog(vlog._id);
            setVlogs((prev) => prev.filter((v) => v._id !== vlog._id));
          } catch {
            Alert.alert('Error', 'Failed to delete');
          }
      }},
    ]);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isVideo = item.mediaType === 'VIDEO';
    const thumb = item.thumbnailUrl || (isVideo ? null : item.mediaUrl);
    return (
      <Animated.View entering={FadeInDown.delay(index * 20).duration(400)} style={styles.card}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewVlog(item)} style={styles.mediaWrap}>
          {thumb ? (
            <Image source={{ uri: resolveImageURL(thumb) }} style={styles.media} contentFit="cover" />
          ) : (
            <View style={[styles.media, styles.mediaFallback]}>
              <Play size={36} color="#94A3B8" fill="#94A3B8" />
            </View>
          )}
          {isVideo && (
            <View style={styles.videoBadge}>
              <Film size={10} color="#FFF" />
              <Text style={styles.videoBadgeText}>VIDEO</Text>
            </View>
          )}
          {!item.isPublished && (
            <View style={styles.draftBadge}>
              <Text style={styles.draftBadgeText}>DRAFT</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          {!!item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
          <View style={styles.metaRow}>
            <Eye size={12} color={TEXT_MUTED} />
            <Text style={styles.metaText}>{item.views || 0}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.pubBtn, { backgroundColor: item.isPublished ? '#FEF3C7' : '#DCFCE7' }]}
              onPress={() => togglePublish(item)}
              disabled={togglingId === item._id}
            >
              {togglingId === item._id ? (
                <ActivityIndicator size="small" color={item.isPublished ? '#B45309' : '#15803D'} />
              ) : item.isPublished ? (
                <><EyeOff size={13} color="#B45309" /><Text style={[styles.pubBtnText, { color: '#B45309' }]}>Hide</Text></>
              ) : (
                <><Eye size={13} color="#15803D" /><Text style={[styles.pubBtnText, { color: '#15803D' }]}>Publish</Text></>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.delBtn} onPress={() => deleteVlog(item)}>
              <Trash2 size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.headerTitle}>Vlogs</Text>
            <Text style={styles.headerSubtitle}>{vlogs.length} Posts · Reels & Images</Text>
          </View>
          <TouchableOpacity style={styles.fabBtn} onPress={() => setShowModal(true)}>
            <Plus size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4].map((i) => <View key={i} style={styles.skeleton} />)}
        </View>
      ) : (
        <FlatList
          data={vlogs}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: 14 }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Film size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No posts yet. Create your first one!</Text>
            </View>
          }
        />
      )}

      {/* Create Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: BG_COLOR }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitleText}>New Post</Text>
            <TouchableOpacity onPress={resetForm} style={styles.closeBtn}>
              <X size={20} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {/* Media type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Media Type</Text>
              <View style={styles.segment}>
                <TouchableOpacity style={[styles.segmentBtn, mediaType === 'IMAGE' && styles.segmentBtnActive]} onPress={() => { setMediaType('IMAGE'); setMediaUrl(''); }}>
                  <ImageIcon size={16} color={mediaType === 'IMAGE' ? ACCENT : TEXT_MUTED} />
                  <Text style={[styles.segmentText, mediaType === 'IMAGE' && { color: ACCENT }]}>Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segmentBtn, mediaType === 'VIDEO' && styles.segmentBtnActive]} onPress={() => { setMediaType('VIDEO'); setMediaUrl(''); }}>
                  <Film size={16} color={mediaType === 'VIDEO' ? ACCENT : TEXT_MUTED} />
                  <Text style={[styles.segmentText, mediaType === 'VIDEO' && { color: ACCENT }]}>Video / Reel</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Media upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{mediaType === 'IMAGE' ? 'Upload Image' : 'Upload Video / Reel'}</Text>
              {mediaUrl ? (
                <View style={styles.previewBox}>
                  {mediaType === 'IMAGE' ? (
                    <Image source={{ uri: resolveImageURL(mediaUrl) }} style={styles.previewMedia} contentFit="cover" />
                  ) : (
                    <Video source={{ uri: resolveImageURL(mediaUrl) }} style={styles.previewMedia} resizeMode={ResizeMode.COVER} useNativeControls isLooping />
                  )}
                  <TouchableOpacity style={styles.removeMedia} onPress={() => setMediaUrl('')}>
                    <X size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadBox} onPress={() => pickMedia('media')} disabled={uploading} activeOpacity={0.8}>
                  {uploading ? <ActivityIndicator color={ACCENT} /> : (<><Upload size={28} color={TEXT_MUTED} /><Text style={styles.uploadText}>Tap to upload {mediaType === 'IMAGE' ? 'image' : 'video'}</Text></>)}
                </TouchableOpacity>
              )}
            </View>

            {/* Thumbnail for video */}
            {mediaType === 'VIDEO' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Thumbnail (optional)</Text>
                {thumbnailUrl ? (
                  <View style={styles.previewBox}>
                    <Image source={{ uri: resolveImageURL(thumbnailUrl) }} style={styles.previewMedia} contentFit="cover" />
                    <TouchableOpacity style={styles.removeMedia} onPress={() => setThumbnailUrl('')}>
                      <X size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.uploadBox, { height: 100 }]} onPress={() => pickMedia('thumbnail')} disabled={uploading} activeOpacity={0.8}>
                    <ImageIcon size={22} color={TEXT_MUTED} />
                    <Text style={styles.uploadText}>Upload thumbnail</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput style={styles.textInput} placeholder="e.g. Behind the scenes 🍕" value={title} onChangeText={setTitle} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput style={[styles.textInput, { height: 90, paddingTop: 12, textAlignVertical: 'top' }]} placeholder="Write something..." value={description} onChangeText={setDescription} multiline />
            </View>

            <TouchableOpacity style={[styles.submitBtn, (!title || !mediaUrl || submitting) && { opacity: 0.5 }]} onPress={handleSubmit} disabled={!title || !mediaUrl || submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>PUBLISH POST</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={!!previewVlog} animationType="fade" transparent>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewVlog(null)}>
            <X size={22} color="#FFF" />
          </TouchableOpacity>
          {previewVlog && (
            <View style={styles.previewContent}>
              {previewVlog.mediaType === 'VIDEO' ? (
                <Video source={{ uri: resolveImageURL(previewVlog.mediaUrl) }} style={styles.previewFull} resizeMode={ResizeMode.CONTAIN} useNativeControls shouldPlay isLooping />
              ) : (
                <Image source={{ uri: resolveImageURL(previewVlog.mediaUrl) }} style={styles.previewFull} contentFit="contain" />
              )}
              <Text style={styles.previewTitle}>{previewVlog.title}</Text>
              {!!previewVlog.description && <Text style={styles.previewDesc}>{previewVlog.description}</Text>}
            </View>
          )}
        </View>
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
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 14 },
  skeleton: { width: CARD_W, height: 240, borderRadius: 18, backgroundColor: '#E2E8F0' },

  card: { width: CARD_W, backgroundColor: CARD_BG, borderRadius: 18, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  mediaWrap: { width: '100%', aspectRatio: 9 / 12, backgroundColor: '#F1F5F9' },
  media: { width: '100%', height: '100%' },
  mediaFallback: { alignItems: 'center', justifyContent: 'center' },
  videoBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  videoBadgeText: { fontFamily: 'Inter-Bold', fontSize: 9, color: '#FFF' },
  draftBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#F59E0B', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  draftBadgeText: { fontFamily: 'Inter-Black', fontSize: 9, color: '#FFF' },

  cardBody: { padding: 12 },
  cardTitle: { fontFamily: 'Inter-Bold', fontSize: 14, color: TEXT_DARK },
  cardDesc: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED, marginTop: 3, lineHeight: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  metaText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: TEXT_MUTED },
  metaDot: { color: TEXT_MUTED, fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pubBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 34, borderRadius: 10 },
  pubBtnText: { fontFamily: 'Inter-Bold', fontSize: 12 },
  delBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },

  emptyState: { paddingTop: 80, alignItems: 'center', justifyContent: 'center', width: '100%' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_MUTED },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: CARD_BG, borderBottomColor: BORDER_COLOR, borderBottomWidth: 1 },
  modalTitleText: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_DARK },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },

  inputGroup: { marginBottom: 20 },
  inputLabel: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  textInput: { minHeight: 50, backgroundColor: CARD_BG, borderRadius: 12, paddingHorizontal: 16, fontFamily: 'Inter-SemiBold', fontSize: 15, color: TEXT_DARK, borderWidth: 1, borderColor: BORDER_COLOR },

  segment: { flexDirection: 'row', gap: 10 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_COLOR },
  segmentBtnActive: { borderColor: ACCENT, backgroundColor: '#ECFDF5' },
  segmentText: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_MUTED },

  uploadBox: { height: 160, borderRadius: 14, borderWidth: 2, borderColor: BORDER_COLOR, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: CARD_BG },
  uploadText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: TEXT_MUTED, marginTop: 8 },
  previewBox: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' },
  previewMedia: { width: '100%', height: 200 },
  removeMedia: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(239,68,68,0.92)', alignItems: 'center', justifyContent: 'center' },

  submitBtn: { height: 56, backgroundColor: ACCENT, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { fontFamily: 'Inter-Black', fontSize: 15, color: '#FFF', letterSpacing: 1 },

  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  previewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  previewContent: { width: '100%', alignItems: 'center' },
  previewFull: { width: '100%', height: 460, borderRadius: 16 },
  previewTitle: { fontFamily: 'Inter-Black', fontSize: 20, color: '#FFF', marginTop: 16, textAlign: 'center' },
  previewDesc: { fontFamily: 'Inter-Medium', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6, textAlign: 'center' },
});

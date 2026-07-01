import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { restaurantApi, uploadApi } from '../../services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Film, Trash2, Plus, AlertCircle, Play, Pause } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { resolveImageURL } from '../../lib/image-utils';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const ACCENT = '#EC4899'; // Pink for Hero Videos
const MAX_VIDEOS = 3;
const MAX_SIZE_MB = 5;

export default function AdminVideosScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [videos, setVideos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const fetchVideos = async () => {
    try {
      const res = await restaurantApi.getVideos();
      setVideos(res.data?.videos || []);
    } catch (e) {
      console.log('Error fetching videos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVideos();
  };

  const addVideo = async () => {
    if (videos.length >= MAX_VIDEOS) {
      return Alert.alert('Limit reached', `Maximum ${MAX_VIDEOS} videos allowed. Delete one first.`);
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_SIZE_MB * 1024 * 1024) {
      return Alert.alert('Too large', `Video must be under ${MAX_SIZE_MB}MB.`);
    }

    setUploading(true);
    try {
      const file = {
        uri: asset.uri,
        name: asset.fileName || asset.uri.split('/').pop() || 'hero.mp4',
        type: asset.mimeType || 'video/mp4',
      };
      const res = await uploadApi.uploadVideo(file);
      const url = res.data.url as string;
      await restaurantApi.addVideo({ url });
      fetchVideos();
    } catch (e) {
      Alert.alert('Error', 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteVideo = (index: number) => {
    Alert.alert('Remove Video', `Remove hero video slot ${index + 1}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
          setDeletingIndex(index);
          try {
            await restaurantApi.deleteVideo(index);
            setVideos((prev) => prev.filter((_, i) => i !== index));
          } catch {
            Alert.alert('Error', 'Failed to remove video.');
          } finally {
            setDeletingIndex(null);
          }
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Hero Videos</Text>
            <Text style={styles.headerSubtitle}>{videos.length}/{MAX_VIDEOS} · 16:9 · Max {MAX_SIZE_MB}MB</Text>
          </View>
          <TouchableOpacity
            style={[styles.fabBtn, (uploading || videos.length >= MAX_VIDEOS) && { opacity: 0.5 }]}
            onPress={addVideo}
            disabled={uploading || videos.length >= MAX_VIDEOS}
          >
            {uploading ? <ActivityIndicator color="#FFF" size="small" /> : <Plus size={20} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.helperText}>
          These videos rotate in the background of the customer home hero section. Use landscape (16:9) clips.
        </Text>

        {videos.length >= MAX_VIDEOS && (
          <View style={styles.warnBox}>
            <AlertCircle size={16} color="#B45309" />
            <Text style={styles.warnText}>Maximum {MAX_VIDEOS} videos reached. Delete one before adding new.</Text>
          </View>
        )}

        {loading ? (
          <View style={{ gap: 16, marginTop: 16 }}>
            {[1, 2, 3].map((i) => <View key={i} style={styles.skeleton} />)}
          </View>
        ) : videos.length === 0 ? (
          <TouchableOpacity style={styles.emptyState} onPress={addVideo} activeOpacity={0.8}>
            <Film size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No hero videos yet</Text>
            <Text style={styles.emptySub}>Tap to upload the first one</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 16, marginTop: 8 }}>
            {videos.map((url, index) => {
              const isPlaying = playingIndex === index;
              return (
                <Animated.View key={url} entering={FadeInDown.delay(index * 40).duration(400)} style={styles.videoCard}>
                  <Video
                    source={{ uri: resolveImageURL(url) }}
                    style={styles.video}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    isMuted
                    shouldPlay={isPlaying}
                    useNativeControls={false}
                  />
                  <View style={styles.slotBadge}>
                    <Text style={styles.slotText}>Slot {index + 1}</Text>
                  </View>
                  <TouchableOpacity style={styles.playBtn} onPress={() => setPlayingIndex(isPlaying ? null : index)}>
                    {isPlaying ? <Pause size={18} color="#FFF" fill="#FFF" /> : <Play size={18} color="#FFF" fill="#FFF" />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteVideo(index)} disabled={deletingIndex === index}>
                    {deletingIndex === index ? <ActivityIndicator color="#FFF" size="small" /> : <Trash2 size={16} color="#FFF" />}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}

            {videos.length < MAX_VIDEOS && (
              <TouchableOpacity style={styles.addSlot} onPress={addVideo} activeOpacity={0.8} disabled={uploading}>
                <Plus size={24} color={ACCENT} />
                <Text style={styles.addSlotText}>Add video</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: CARD_BG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4, zIndex: 10 },
  headerTitle: { fontFamily: 'Jakarta-ExtraBold', fontSize: 28, color: TEXT_DARK, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: ACCENT, marginTop: 2 },
  fabBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },

  scrollContent: { padding: 16, paddingBottom: 60 },
  helperText: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED, lineHeight: 19, marginBottom: 14 },

  warnBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' },
  warnText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#B45309' },

  skeleton: { width: '100%', aspectRatio: 16 / 9, borderRadius: 18, backgroundColor: '#E2E8F0' },

  emptyState: { marginTop: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 50, borderRadius: 20, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: TEXT_DARK, marginTop: 12 },
  emptySub: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED, marginTop: 4 },

  videoCard: { width: '100%', aspectRatio: 16 / 9, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 },
  video: { ...StyleSheet.absoluteFillObject },
  slotBadge: { position: 'absolute', left: 10, top: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  slotText: { fontFamily: 'Inter-Bold', fontSize: 11, color: '#FFF' },
  playBtn: { position: 'absolute', bottom: 10, left: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { position: 'absolute', right: 10, top: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239,68,68,0.92)', alignItems: 'center', justifyContent: 'center' },

  addSlot: { width: '100%', aspectRatio: 16 / 9, borderRadius: 18, borderWidth: 2, borderColor: '#F9A8D4', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDF2F8' },
  addSlotText: { fontFamily: 'Inter-Bold', fontSize: 13, color: ACCENT, marginTop: 6 },
});

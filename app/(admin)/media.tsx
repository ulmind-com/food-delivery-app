import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, Alert, Modal, TextInput, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vlogApi } from '../../services/api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Film, Trash2, Plus, Eye, Heart, X, PlayCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import { resolveImageURL } from '../../lib/image-utils';
import { SkeletonCard } from '../../components/Skeleton';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';
const ACCENT = '#10B981'; // Green for media Tab

export default function AdminMediaScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vlogs, setVlogs] = useState<any[]>([]);

  // Create Modal
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const fetchMedia = async () => {
    try {
      // First try admin specific, then fallback
      const res = await vlogApi.getAdminVlogs().catch(() => vlogApi.getAll());
      setVlogs(res.data);
    } catch (e) {
      console.log('Error fetching media:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedia();
  };

  const deleteMedia = (id: string, title: string) => {
    Alert.alert('Delete Media', `Remove "${title}" from the app gallery?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await vlogApi.deleteVlog(id);
            setVlogs(prev => prev.filter(v => v._id !== id));
          } catch (e) {}
      }}
    ]);
  };

  const handleCreate = async () => {
    if (!newTitle || !newUrl) return Alert.alert('Error', 'Title and a Media URL are required.');
    try {
      const payload = {
        title: newTitle,
        description: newDesc,
        videoUrl: newUrl, // For simplicity in mobile parody, acting as remote URL provider
        thumbnailUrl: newUrl,
      };
      await vlogApi.createVlog(payload);
      setShowCreate(false);
      setNewTitle(''); setNewDesc(''); setNewUrl('');
      fetchMedia();
    } catch (e) {
      Alert.alert('Error', 'Failed to publish media.');
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isVideo = item.videoUrl?.includes('.mp4') || item.videoUrl?.includes('youtube');

    return (
      <Animated.View entering={FadeInDown.delay(index * 20).springify().damping(16)} style={styles.card}>
        <View style={styles.mediaContainer}>
           <Image source={{ uri: resolveImageURL(item.thumbnailUrl || item.videoUrl || item.image) }} style={styles.mediaImage} contentFit="cover" />
           {isVideo && (
             <View style={styles.playOverlay}>
                <PlayCircle size={40} color="#FFF" style={{ opacity: 0.9 }} />
             </View>
           )}
        </View>

        <View style={styles.cardContent}>
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                 <Text style={styles.cardTitle}>{item.title || 'Untitled Media'}</Text>
                 <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteMedia(item._id, item.title || 'Unknown')} style={styles.deleteBtn}>
                 <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
           </View>

           <View style={styles.statsRow}>
              <View style={styles.statBox}>
                 <Eye size={14} color={TEXT_MUTED} />
                 <Text style={styles.statText}>{item.views || 0}</Text>
              </View>
              <View style={styles.statBox}>
                 <Heart size={14} color={TEXT_MUTED} />
                 <Text style={styles.statText}>{item.likes || 0}</Text>
              </View>
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
              <Text style={styles.headerTitle}>Media Gallery</Text>
              <Text style={styles.headerSubtitle}>{vlogs.length} Videos & Banners</Text>
            </View>
            <TouchableOpacity style={styles.fabBtn} onPress={() => setShowCreate(true)}>
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
          data={vlogs}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
             <View style={styles.emptyState}>
                <Film size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No media uploads recorded.</Text>
             </View>
          }
        />
      )}

      {/* Creation Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: BG_COLOR }}>
            <View style={styles.modalHeader}>
               <Text style={styles.modalTitleText}>Upload New Media</Text>
               <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.closeBtn}>
                  <X size={20} color={TEXT_DARK} />
               </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
               <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Media Title</Text>
                  <TextInput style={styles.textInput} placeholder="e.g. Secret Kitchen Tour" value={newTitle} onChangeText={setNewTitle} />
               </View>

               <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Video/Image URL</Text>
                  <TextInput style={styles.textInput} placeholder="https://..." value={newUrl} onChangeText={setNewUrl} keyboardType="url" autoCapitalize="none" />
                  <Text style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 6 }}>* Normally this is auto-filled by uploading via device camera, using remote URL provider for manual ingest.</Text>
               </View>

               <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description Context</Text>
                  <TextInput style={[styles.textInput, { height: 100, paddingTop: 14 }]} placeholder="What is this about?" value={newDesc} onChangeText={setNewDesc} multiline />
               </View>

               <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                  <Text style={styles.submitBtnText}>PUBLISH ENTRY</Text>
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
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 28, color: TEXT_DARK, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: ACCENT, marginTop: 2 },
  fabBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', shadowColor: ACCENT, shadowOffset: {width:0, height:4}, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },

  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: CARD_BG, borderRadius: 20, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width:0, height:6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  mediaContainer: { width: '100%', height: 180, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  mediaImage: { width: '100%', height: '100%', opacity: 0.8 },
  playOverlay: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  
  cardContent: { padding: 16 },
  cardTitle: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_DARK },
  cardDesc: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 4, lineHeight: 18 },
  deleteBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 10 },
  
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontFamily: 'Inter-Bold', fontSize: 13, color: TEXT_DARK },

  emptyState: { paddingTop: 80, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_MUTED },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: CARD_BG, borderBottomColor: BORDER_COLOR, borderBottomWidth: 1 },
  modalTitleText: { fontFamily: 'Inter-Black', fontSize: 20, color: TEXT_DARK },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },
  
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontFamily: 'Inter-Bold', fontSize: 12, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  textInput: { height: 50, backgroundColor: CARD_BG, borderRadius: 12, paddingHorizontal: 16, fontFamily: 'Inter-SemiBold', fontSize: 14, color: TEXT_DARK, borderWidth: 1, borderColor: BORDER_COLOR },

  submitBtn: { height: 56, backgroundColor: ACCENT, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: ACCENT, shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { fontFamily: 'Inter-Black', fontSize: 15, color: '#FFF', letterSpacing: 1 },
});

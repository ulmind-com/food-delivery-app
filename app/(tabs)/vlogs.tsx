import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, RefreshControl, Platform, Pressable, Modal, SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, Audio, ResizeMode } from 'expo-av';
import { Eye, ChefHat, X } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { vlogApi } from '../../services/api';
import { resolveImageURL } from '../../lib/image-utils';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const POST_HEIGHT = width * 1.25; // Standard 4:5 aspect ratio layout similar to Insta

export default function VlogsScreen() {
  const [vlogs, setVlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  
  // Fullscreen Reel state
  const [fullscreenItem, setFullscreenItem] = useState<any | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const fetchVlogs = async () => {
    try {
      const res = await vlogApi.getAll();
      setVlogs(res.data?.vlogs || res.data || []);
    } catch (e) {
      console.log('Error fetching vlogs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchVlogs(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVlogs();
  }, []);

  // Determine if post is an image or video based on accurate API fields
  const isVideoItem = (item: any) => {
    if (item.mediaType === 'VIDEO' || item.type === 'video') return true;
    const url = item.videoUrl || item.url || item.mediaUrl || '';
    if (typeof url === 'string' && url.toLowerCase().match(/\.(mp4|mov|webm)$/)) return true;
    return false; // Safely fallbacks to Image if not strictly a video
  };

  // Obtain highest quality media source correctly normalized
  const getMediaUrl = (item: any) => {
    const raw = item.videoUrl || item.url || item.mediaUrl || item.imageUrl || item.thumbnailUrl || item.thumbnail;
    return typeof raw === 'string' ? resolveImageURL(raw) : undefined;
  };

  // Viewability config to auto-play ONLY the video centrally focused natively saving RAM
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveVideoId(viewableItems[0].item._id);
    }
  }).current;

  // Enforce global Device Audio protocols when Fullscreen reel activates overlaying silent switches
  useEffect(() => {
    if (fullscreenItem) {
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    }
  }, [fullscreenItem]);

  const renderFeedPost = ({ item, index }: { item: any; index: number }) => {
    const mediaUri = getMediaUrl(item);
    const isVid = isVideoItem(item);
    const isActive = activeVideoId === item._id && !fullscreenItem;

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(400)} style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.chefAvatar}>
            <ChefHat size={16} color={PRIMARY} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.chefName}>{item.restaurantName || item.chefName || 'Foodie Chef'}</Text>
            {item.location && <Text style={styles.chefLocation}>{item.location}</Text>}
          </View>
          <TouchableOpacity style={styles.actionBtn}>
             <Text style={{fontWeight: '900', color: '#1A1A1A', fontSize: 18}}>...</Text>
          </TouchableOpacity>
        </View>

        {/* Media Block Experience */}
        <Pressable 
          activeOpacity={0.9} 
          onPress={() => setFullscreenItem(item)}
          style={styles.mediaContainer}
        >
          {isVid && mediaUri ? (
            <Video
              source={{ uri: mediaUri }}
              style={styles.mediaElement}
              resizeMode={ResizeMode.COVER}
              shouldPlay={isActive}
              isLooping
              isMuted={true}
              useNativeControls={false}
            />
          ) : mediaUri ? (
            <Image 
              source={{ uri: mediaUri }} 
              style={styles.mediaElement} 
              contentFit="cover" 
            />
          ) : (
            <View style={[styles.mediaElement, { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }]}>
               <ChefHat size={40} color="#D1D5DB" />
            </View>
          )}

          {/* Type Indicator Tag */}
          {isVid && (
            <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeText}>▶ Reel</Text>
            </View>
          )}
        </Pressable>


        {/* Post Footer Information */}
        <View style={styles.postFooter}>
          <Text style={styles.likesText}>{item.likes || 0} likes • {item.views || 0} views</Text>
          <Text style={styles.captionText}>
            <Text style={styles.captionAuthor}>{item.restaurantName || item.chefName || 'Foodie Chef'} </Text>
            {item.title || item.description || 'Delicious behind the scenes action! 👨‍🍳🔥'}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.globalHeader}>
        <Text style={styles.headerTitle}>Kitchen Reels</Text>
      </Animated.View>

      {loading ? (
        <View style={styles.loaderWrap}>
          {[1, 2].map(i => (
            <View key={i} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB' }} />
                <View style={{ flex: 1, height: 16, borderRadius: 4, backgroundColor: '#E5E7EB', marginRight: 150 }} />
              </View>
              <View style={{ width: '100%', height: POST_HEIGHT, backgroundColor: '#E5E7EB' }} />
            </View>
          ))}
        </View>
      ) : vlogs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>🎥</Text>
          <Text style={styles.emptyTitle}>No Stories Yet</Text>
          <Text style={styles.emptySub}>Catch the chefs in action soon!</Text>
        </View>
      ) : (
        <FlatList
          data={vlogs}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderFeedPost}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      )}

      {/* FULLSCREEN REEL MODAL */}
      <Modal
        visible={!!fullscreenItem}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setFullscreenItem(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {fullscreenItem && (
            <View style={styles.fullscreenContent}>
              {isVideoItem(fullscreenItem) ? (
                <Video
                  source={{ uri: getMediaUrl(fullscreenItem) as string }}
                  style={styles.fullMedia}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={true}
                  isLooping
                  isMuted={isMuted}
                  useNativeControls={true}
                />
              ) : (
                <Image 
                  source={{ uri: getMediaUrl(fullscreenItem) as string }} 
                  style={styles.fullMedia} 
                  contentFit="contain" 
                  transition={200}
                />
              )}

              {/* Float Controls */}
              <View style={styles.modalTopBar}>
                <TouchableOpacity onPress={() => setFullscreenItem(null)} style={styles.closeBtn}>
                  <X size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Data Overlay */}
              <View style={styles.modalBottomOverlay}>
                <Text style={styles.modalTitle}>{fullscreenItem.title || 'In The Kitchen'}</Text>
                <View style={styles.modalMetaRow}>
                  <Eye size={16} color="#FFF" />
                  <Text style={styles.modalMetaText}>{fullscreenItem.views || 0}</Text>
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  globalHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 24, color: '#1A1A1A' },
  
  // Post Structure
  postCard: { paddingBottom: 22 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  chefAvatar: {
    width: 36, height: 36, borderRadius: 18, 
    backgroundColor: '#FFF7ED', 
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FED7AA'
  },
  headerTextWrap: { flex: 1 },
  chefName: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#1A1A1A' },
  chefLocation: { fontFamily: 'Inter-Medium', fontSize: 11, color: '#6B7280' },
  
  mediaContainer: { width: '100%', height: POST_HEIGHT, backgroundColor: '#000', position: 'relative' },
  mediaElement: { width: '100%', height: '100%' },
  videoBadge: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
  },
  videoBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#FFF', letterSpacing: 0.5 },

  actionBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6 },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  actionBtn: { padding: 2 },

  postFooter: { paddingHorizontal: 14 },
  likesText: { fontFamily: 'Inter-Black', fontSize: 13, color: '#1A1A1A', marginBottom: 6 },
  captionText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#374151', lineHeight: 18 },
  captionAuthor: { fontFamily: 'Inter-Bold', color: '#1A1A1A' },

  loaderWrap: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#1A1A1A' },
  emptySub: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#6B7280', marginTop: 4 },

  // Interactive Modal
  modalContainer: { flex: 1, backgroundColor: '#000' },
  fullscreenContent: { flex: 1, position: 'relative' },
  fullMedia: { flex: 1, width: '100%', height: '100%' },
  modalTopBar: {
    position: 'absolute', top: Platform.OS === 'android' ? 20 : 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'flex-end', padding: 16, zIndex: 10,
  },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  modalBottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 24, paddingTop: 60, paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.4)', 
  },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#FFF', marginBottom: 10 },
  modalMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalMetaText: { fontFamily: 'Inter-Black', fontSize: 14, color: '#FFF' },
});

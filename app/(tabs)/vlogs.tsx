import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, RefreshControl, Platform, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Play, Heart, Eye, Clock, ChefHat } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { vlogApi } from '../../services/api';
import { resolveImageURL } from '../../lib/image-utils';

const { width } = Dimensions.get('window');
const PRIMARY = '#FC8019';
const CARD_WIDTH = (width - 48) / 2;

export default function VlogsScreen() {
  const [vlogs, setVlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleLike = async (id: string) => {
    try {
      await vlogApi.toggleLike(id);
      fetchVlogs();
    } catch {}
  };

  const renderVlogCard = ({ item, index }: { item: any; index: number }) => {
    const thumb = resolveImageURL(item.thumbnail || item.thumbnailUrl);
    return (
      <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
        <Pressable style={styles.vlogCard}>
          {/* Thumbnail */}
          <View style={styles.thumbnailWrap}>
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.thumbnail} contentFit="cover" />
            ) : (
              <View style={[styles.thumbnail, { backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }]}>
                <ChefHat size={32} color="#D0D0D0" />
              </View>
            )}
            {/* Play overlay */}
            <View style={styles.playOverlay}>
              <View style={styles.playCircle}>
                <Play size={16} color="#FFF" fill="#FFF" />
              </View>
            </View>
            {/* Duration */}
            {item.duration && (
              <View style={styles.durationBadge}>
                <Clock size={10} color="#FFF" />
                <Text style={styles.durationText}>{item.duration}</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.vlogInfo}>
            <Text style={styles.vlogTitle} numberOfLines={2}>{item.title || 'Untitled Vlog'}</Text>
            <View style={styles.vlogMeta}>
              <View style={styles.metaItem}>
                <Eye size={12} color="#93959F" />
                <Text style={styles.metaText}>{item.views || 0}</Text>
              </View>
              <TouchableOpacity style={styles.metaItem} onPress={() => handleLike(item._id)}>
                <Heart size={12} color={item.isLiked ? '#EF4444' : '#93959F'} fill={item.isLiked ? '#EF4444' : 'none'} />
                <Text style={styles.metaText}>{item.likes || 0}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Kitchen Stories</Text>
        <Text style={styles.headerSub}>Watch our chefs in action 🎬</Text>
      </Animated.View>

      {loading ? (
        <View style={styles.loaderWrap}>
          {/* Skeleton grid */}
          <View style={styles.skeletonGrid}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={styles.skeletonCard}>
                <View style={[styles.skeletonThumb, { backgroundColor: '#F0F0F5' }]} />
                <View style={{ padding: 10, gap: 6 }}>
                  <View style={{ width: '80%', height: 12, borderRadius: 4, backgroundColor: '#F0F0F5' }} />
                  <View style={{ width: '50%', height: 10, borderRadius: 4, backgroundColor: '#F0F0F5' }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : vlogs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>🎥</Text>
          <Text style={styles.emptyTitle}>No vlogs yet</Text>
          <Text style={styles.emptySub}>Check back soon for kitchen stories!</Text>
        </View>
      ) : (
        <FlatList
          data={vlogs}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderVlogCard}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFCF7' },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F3F3',
  },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 24, color: '#3D4152' },
  headerSub: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#93959F', marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 40 },
  gridRow: { gap: 16 },
  vlogCard: {
    width: CARD_WIDTH, marginBottom: 16,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
    overflow: 'hidden',
  },
  thumbnailWrap: { width: '100%', height: CARD_WIDTH * 1.2, position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  playCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
    paddingLeft: 3,
  },
  durationBadge: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  durationText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#FFF' },
  vlogInfo: { padding: 12 },
  vlogTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#3D4152', lineHeight: 18 },
  vlogMeta: { flexDirection: 'row', gap: 14, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: 'Inter-Medium', fontSize: 11, color: '#93959F' },
  // Loading
  loaderWrap: { flex: 1, padding: 16 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  skeletonCard: {
    width: CARD_WIDTH, borderRadius: 16, backgroundColor: '#FFF',
    overflow: 'hidden', marginBottom: 16,
  },
  skeletonThumb: { width: '100%', height: CARD_WIDTH * 1.2 },
  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#3D4152' },
  emptySub: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#93959F', marginTop: 4 },
});

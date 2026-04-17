import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Dimensions, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import { chatApi, uploadApi, restaurantApi } from '../services/api';
import { ArrowLeft, ChevronLeft, Send, ImagePlus, CheckCheck, MessageCircle, Headset, RefreshCw, XCircle, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInUp, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withDelay, Easing, Layout } from 'react-native-reanimated';
import { Audio } from 'expo-av';

const SOCKET_URL = "https://food-delivery-backend-173b.onrender.com";
const { width } = Dimensions.get('window');

const PRIMARY = '#FC8019';
const MUTED = '#9CA3AF';
const BORDER = '#F3F4F6';
const BG = '#F8FAFC';

interface Message {
  _id: string;
  sender: "user" | "admin";
  text: string;
  images?: string[];
  isRead: boolean;
  createdAt: string;
}

interface ChatSession {
  _id: string;
  userName: string;
  messages: Message[];
  isOpen: boolean;
  unreadByUser: number;
}

// ─── Animated Online Dot ──────────────────────────────────────────────
const OnlineDot = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.3, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, true);
    opacity.value = withRepeat(withSequence(withTiming(0.6, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return <Animated.View style={[styles.onlineDot, style]} />;
};

// ─── Animated Typing Dots ──────────────────────────────────────────────
const TypingIndicator = ({ logo }: { logo?: string }) => {
  return (
    <Animated.View entering={FadeInDown.duration(300)} exiting={FadeInDown} style={styles.typingContainer}>
      <View style={styles.avatarWrapSmall}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.avatarImgSmall} />
        ) : (
          <View style={styles.avatarBoxSmall}><MessageCircle size={12} color={PRIMARY} /></View>
        )}
      </View>
      <View style={styles.typingBubble}>
        {[0, 1, 2].map((i) => {
          const translateY = useSharedValue(0);
          useEffect(() => {
            translateY.value = withDelay(i * 150, withRepeat(withSequence(
              withTiming(-4, { duration: 300, easing: Easing.inOut(Easing.ease) }),
              withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) })
            ), -1, true));
          }, []);
          const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
          return <Animated.View key={i} style={[styles.typingDot, style]} />;
        })}
      </View>
    </Animated.View>
  );
};

export default function ChatScreen() {
  const router = useRouter();
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [chat, setChat] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [closed, setClosed] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // Images
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Typing
  const [adminTyping, setAdminTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const adminTypingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const chatIdRef = useRef<string | undefined>(undefined);
  const scrollViewRef = useRef<ScrollView>(null);

  // ─── Play Audio ────────────────────────────────────────────────────────
  const playDing = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/zomato.mp3')
      );
      await sound.playAsync();
      setTimeout(() => {
        sound.unloadAsync();
      }, 5000);
    } catch (e) {
      console.log('Audio missing, skipping sound.');
    }
  };

  // ─── Init Data ──────────────────────────────────────────────────────────
  useEffect(() => {
    restaurantApi.get().then(res => setRestaurant(res.data)).catch(() => {});

    chatApi.getOrCreateChat()
      .then((res) => {
        setChat(res.data);
        chatIdRef.current = res.data._id;
        setClosed(!res.data.isOpen);
        chatApi.markRead().catch(() => {});
        if (socketRef.current) socketRef.current.emit("joinChat", res.data._id);
      })
      .catch((e) => console.log('Chat fetch error', e))
      .finally(() => setLoading(false));
  }, []);

  // ─── Socket Connection ────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    if (chatIdRef.current) socket.emit("joinChat", chatIdRef.current);

    socket.on("chatMessage", (data: { chatId: string; message: Message }) => {
      if (data.chatId !== chatIdRef.current) return;
      if (data.message.sender === "user") return;
      
      playDing();
      chatApi.markRead().catch(() => {});
      
      setChat((prev) => {
        if (!prev) return prev;
        if (prev.messages.some(m => m._id === data.message._id)) return prev;
        return { ...prev, messages: [...prev.messages, data.message] };
      });
      scrollToBottom();
    });

    socket.on("chatClosed", () => setClosed(true));

    socket.on("typing", () => {
      setAdminTyping(true);
      if (adminTypingTimerRef.current) clearTimeout(adminTypingTimerRef.current);
      adminTypingTimerRef.current = setTimeout(() => setAdminTyping(false), 3000);
      scrollToBottom();
    });

    socket.on("stopTyping", () => {
      setAdminTyping(false);
      if (adminTypingTimerRef.current) clearTimeout(adminTypingTimerRef.current);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  useEffect(() => {
    if (chat?.messages.length) scrollToBottom();
  }, [chat?.messages.length]);

  // ─── User Actions ───────────────────────────────────────────────────────
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    if (!socketRef.current || !chat?._id) return;
    
    socketRef.current.emit("typing", { chatId: chat._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stopTyping", { chatId: chat._id });
    }, 1500);
  };

  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets) {
      setSelectedImages((prev) => [...prev, ...result.assets]);
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && selectedImages.length === 0) || sending || closed) return;
    setSending(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit("stopTyping", { chatId: chat?._id });

    let uploadedImageUrls: string[] = [];

    try {
      // Step 1: Upload images first (if any)
      if (selectedImages.length > 0) {
        const filesToUpload = selectedImages.map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `img_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg'
        }));
        uploadedImageUrls = await uploadApi.uploadMultipleImages(filesToUpload);
      }

      // Step 2: Create optimistic message (same as web — use uploadedImageUrls only)
      const optimisticMsg: Message = {
        _id: `opt-${Date.now()}`,
        sender: "user",
        text: text.trim(),
        images: uploadedImageUrls,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      // Step 3: Show optimistic UI
      setChat((prev) => prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev);
      scrollToBottom();
      setText("");
      setSelectedImages([]);

      // Step 4: Send to backend (exactly like web)
      const res = await chatApi.sendMessage({ text: optimisticMsg.text, images: optimisticMsg.images });

      // Step 5: Replace optimistic with real server message
      setChat((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) => m._id === optimisticMsg._id ? res.data : m),
        };
      });
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || JSON.stringify(err);
      console.error('❌ Chat send failed:', errMsg);
      Alert.alert('Send Failed', errMsg);
      // Rollback optimistic messages
      setChat((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: prev.messages.filter(m => !m._id.startsWith('opt-')) };
      });
    } finally {
      setSending(false);
    }
  };

  const startNewChat = async () => {
    try {
      setLoading(true);
      const res = await chatApi.createNewChat();
      setChat(res.data);
      chatIdRef.current = res.data._id;
      setClosed(false);
      if (socketRef.current) socketRef.current.emit("joinChat", res.data._id);
    } catch (err) {
      console.log('Failed to start new chat', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  // ─── Rendering ──────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_right' }} />

      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ChevronLeft size={28} color="#111827" strokeWidth={1.5} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleWrap}>
            {restaurant?.logo ? (
              <Image source={{ uri: restaurant.logo }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Headset size={18} color={PRIMARY} strokeWidth={2} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{restaurant?.name || "Support"}</Text>
              {closed ? (
                <Text style={styles.headerSubtitle}>Chat closed</Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {socketConnected ? <OnlineDot /> : <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />}
                  <Text style={styles.headerSubtitle}>{socketConnected ? "Online" : "Connecting..."}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* ─── Chat Area ─── */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatArea} 
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.encryptionNotice}>
          <CheckCheck size={12} color="#9CA3AF" />
          <Text style={styles.encryptionText}>End-to-End Encrypted Support Chat</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 40 }} />
        ) : chat?.messages.length === 0 ? (
          <Animated.View entering={FadeInUp} style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <MessageCircle size={40} color={PRIMARY} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>How can we help you?</Text>
            <Text style={styles.emptySub}>Send us a message and our support team will get back to you as soon as possible.</Text>
          </Animated.View>
        ) : (
          chat?.messages.map((msg, i) => {
            const isUser = msg.sender === 'user';
            const justImages = !msg.text && msg.images && msg.images.length > 0;
            return (
              <Animated.View 
                key={msg._id || i}
                entering={FadeInUp.duration(400).springify()}
                layout={Layout.springify()}
                style={[styles.messageRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}
              >
                {!isUser && (
                  <View style={styles.avatarWrapSmall}>
                    {restaurant?.logo ? (
                      <Image source={{ uri: restaurant.logo }} style={styles.avatarImgSmall} />
                    ) : (
                      <View style={styles.avatarBoxSmall}><MessageCircle size={10} color="#FFFFFF" /></View>
                    )}
                  </View>
                )}

                <View style={[styles.msgContentWrap, isUser ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                  <View style={[
                    styles.msgBubble, 
                    isUser ? styles.msgBubbleUser : styles.msgBubbleAdmin,
                    justImages ? { backgroundColor: 'transparent', padding: 0, paddingHorizontal: 0, elevation: 0 } : {}
                  ]}>
                    {msg.images && msg.images.length > 0 && (
                      <View style={[styles.imgGrid, { marginBottom: msg.text ? 8 : 0 }]}>
                        {msg.images.map((img, idx) => (
                          <TouchableOpacity key={idx} onPress={() => setFullscreenImage(img)} activeOpacity={0.8}>
                            <Image source={{ uri: img }} style={[ styles.msgImage, { width: msg.images!.length === 1 ? 220 : 130 } ]} contentFit="cover" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {msg.text ? (
                      <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAdmin]}>{msg.text}</Text>
                    ) : null}
                  </View>
                  
                  <View style={[styles.msgMeta, isUser && { flexDirection: 'row-reverse' }]}>
                    <Text style={styles.metaTime}>{formatTime(msg.createdAt)}</Text>
                    {isUser && (
                      <CheckCheck size={14} color={msg.isRead ? "#3B82F6" : "#9CA3AF"} strokeWidth={3} />
                    )}
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}

        {adminTyping && <TypingIndicator logo={restaurant?.logo} />}
      </ScrollView>

      {/* ─── Closed Banner ─── */}
      {closed && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedText}>This conversation has been closed by the agent.</Text>
          <TouchableOpacity style={styles.startNewBtn} onPress={startNewChat}>
            <RefreshCw size={14} color="#DC2626" />
            <Text style={styles.startNewText}>Start New Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Image Preview Row ─── */}
      {!closed && selectedImages.length > 0 && (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.previewContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {selectedImages.map((img, i) => (
              <View key={i} style={styles.previewBox}>
                <Image source={{ uri: img.uri }} style={styles.previewImg} />
                <TouchableOpacity activeOpacity={0.8} style={styles.previewRemove} onPress={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))}>
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 }}>
                    <XCircle size={20} color="#EF4444" fill="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* ─── Input Area ─── */}
      {!closed && (
        <View style={styles.inputAreaWrapper}>
          <View style={styles.inputArea}>
            <TouchableOpacity style={styles.attachBtn} onPress={pickImages}>
              <ImagePlus size={22} color="#6B7280" />
            </TouchableOpacity>
            
            <View style={styles.inputFieldContainer}>
              <TextInput
                value={text}
                onChangeText={handleTextChange}
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                style={styles.inputField}
                multiline
                maxLength={1000}
              />
            </View>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.sendBtn, (!text.trim() && selectedImages.length === 0) && styles.sendBtnDisabled]} 
              onPress={handleSend}
              disabled={(!text.trim() && selectedImages.length === 0) || sending}
            >
              {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Send size={18} color="#FFFFFF" style={{ marginLeft: 2, marginTop: 2 }} />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Fullscreen Viewer Modal ─── */}
      <Modal visible={!!fullscreenImage} transparent animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.closeModalBtn} onPress={() => setFullscreenImage(null)}>
            <X size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image source={{ uri: fullscreenImage }} style={styles.fullscreenImg} contentFit="contain" />
          )}
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  
  // Header
  header: { 
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 10
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#E5E7EB' },
  headerAvatarPlaceholder: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(252,128,25,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: '#111827' },
  headerSubtitle: { fontFamily: 'Inter-Medium', fontSize: 11, color: '#9CA3AF' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },

  // Chat Content
  chatArea: { flex: 1, backgroundColor: BG },
  chatContent: { padding: 16, paddingBottom: 32 },
  
  encryptionNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F3F4F6', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 20 },
  encryptionText: { fontFamily: 'Inter-Medium', fontSize: 10, color: '#9CA3AF' },

  // Empty State
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(252,128,25,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#1F2937', textAlign: 'center' },
  emptySub: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },

  // Messages
  messageRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },

  avatarWrapSmall: { marginRight: 8, marginBottom: 16 },
  avatarImgSmall: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  avatarBoxSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },

  msgContentWrap: { maxWidth: '78%' },
  msgBubble: { paddingHorizontal: 16, paddingVertical: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  msgBubbleUser: { backgroundColor: PRIMARY, borderRadius: 20, borderBottomRightRadius: 4, shadowColor: PRIMARY, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  msgBubbleAdmin: { backgroundColor: '#FFFFFF', borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F3F4F6' },

  msgText: { fontFamily: 'Inter-Medium', fontSize: 14.5, lineHeight: 22 },
  msgTextUser: { color: '#FFFFFF' },
  msgTextAdmin: { color: '#1F2937' },

  imgGrid: { gap: 4, flexDirection: 'row', flexWrap: 'wrap', borderRadius: 16, overflow: 'hidden' },
  msgImage: { height: 160, backgroundColor: '#E5E7EB' },

  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  metaTime: { fontFamily: 'Inter-Medium', fontSize: 10, color: '#9CA3AF' },

  // Typing Details
  typingContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  typingBubble: { backgroundColor: '#FFFFFF', borderRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', gap: 5, alignItems: 'center', elevation: 1 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9CA3AF' },

  // Closed Banner
  closedBanner: { backgroundColor: '#FEF2F2', padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#FECACA', flexDirection: 'row', justifyContent: 'space-between' },
  closedText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#DC2626', flex: 1 },
  startNewBtn: { backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA', shadowColor: '#DC2626', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  startNewText: { fontFamily: 'Inter-Bold', fontSize: 12, color: '#DC2626' },

  // Previews
  previewContainer: { backgroundColor: '#FFFFFF', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  previewBox: { width: 72, height: 72, marginRight: 16, position: 'relative' },
  previewImg: { width: '100%', height: '100%', borderRadius: 16, borderWidth: 1.5, borderColor: '#E5E7EB' },
  previewRemove: { position: 'absolute', top: -8, right: -8, zIndex: 5 },

  // Input Shell
  inputAreaWrapper: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  attachBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  inputFieldContainer: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: '#F3F4F6', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
  inputField: { fontFamily: 'Inter-Medium', fontSize: 14.5, color: '#111827', paddingTop: 0, paddingBottom: 0 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  sendBtnDisabled: { backgroundColor: '#E5E7EB', shadowOpacity: 0 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  closeModalBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 24, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24 },
  fullscreenImg: { width: width - 32, height: '80%', borderRadius: 16 },
});

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, TextInput, KeyboardAvoidingView, SafeAreaView, Keyboard, Image, Alert, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatApi, uploadApi } from '../../services/api';
import { socket } from '../../services/socket';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, SlideInRight, SlideOutRight, FadeIn, FadeOut } from 'react-native-reanimated';
import { MessageSquare, Check, X, Send, User, Clock, ChevronLeft, Trash2, XCircle, ImagePlus, Loader2 } from 'lucide-react-native';
import { SkeletonCard } from '../../components/Skeleton';

const BG_COLOR = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#F1F5F9';
const ACCENT = '#FC8019'; // Foodie Orange

export default function AdminChatScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState<any[]>([]);

  // Active Chat State
  const [activeChat, setActiveChat] = useState<any>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  
  // New Features State
  const [sending, setSending] = useState(false);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChat?._id || null;
  }, [activeChat]);

  const fetchChats = async () => {
    try {
      const res = await chatApi.getAllChats();
      setChats(res.data);
    } catch (e) {
      console.log('Error fetching admin chats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChats();

    // Sockets
    socket.emit("joinAdminChat");

    const handleChatMessage = (data: any) => {
      if (data.message.sender !== 'user') return;
      
      setChats(prev => {
        const exists = prev.some(c => c._id === data.chatId);
        if (!exists) {
          fetchChats();
          return prev;
        }
        return prev.map(c => 
          c._id === data.chatId ? {
            ...c,
            lastMessage: data.message.text || 'Sent an image',
            lastMessageAt: data.message.createdAt,
            unreadByAdmin: activeChatIdRef.current === data.chatId ? 0 : (c.unreadByAdmin || 0) + 1
          } : c
        );
      });

      if (activeChatIdRef.current === data.chatId) {
         setIsTyping(false);
         if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
         setMessages(prev => {
           if (prev.some(m => m._id === data.message._id)) return prev;
           setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
           return [...prev, data.message];
         });
      }
    };

    const handleTyping = (data: any) => {
      if (activeChatIdRef.current === data.chatId) {
         setIsTyping(true);
         if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
         typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      }
    };

    const handleStopTyping = (data: any) => {
      if (activeChatIdRef.current === data.chatId) {
         setIsTyping(false);
         if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    };

    const handleChatClosed = () => {
       fetchChats();
    };

    socket.on("chatMessage", handleChatMessage);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("chatClosed", handleChatClosed);

    return () => {
      socket.off("chatMessage", handleChatMessage);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("chatClosed", handleChatClosed);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  const loadChat = async (chat: any) => {
    setActiveChat(chat);
    setReplyText('');
    setSelectedImages([]);
    setIsTyping(false);
    
    // Optimistic unread clear
    setChats(prev => prev.map(c => c._id === chat._id ? { ...c, unreadByAdmin: 0 } : c));
    
    try {
      const res = await chatApi.getChatById(chat._id);
      setMessages(res.data?.messages || []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
    } catch {}
  };

  const closeActiveThread = () => {
    Keyboard.dismiss();
    setActiveChat(null);
    setMessages([]);
    fetchChats();
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setSelectedImages(prev => [...prev, ...result.assets]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleInputText = (text: string) => {
    setReplyText(text);
    if (activeChatIdRef.current) {
       socket.emit("typing", { chatId: activeChatIdRef.current });
       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
       typingTimeoutRef.current = setTimeout(() => {
           socket.emit("stopTyping", { chatId: activeChatIdRef.current });
       }, 1500);
    }
  };

  const sendReply = async () => {
    if ((!replyText.trim() && selectedImages.length === 0) || sending || !activeChat) return;
    setSending(true);
    const textToSend = replyText;
    const imagesToSend = [...selectedImages];
    
    setReplyText('');
    setSelectedImages([]);
    socket.emit("stopTyping", { chatId: activeChat._id });

    try {
      let uploadedUrls: string[] = [];
      if (imagesToSend.length > 0) {
         const files = imagesToSend.map(img => ({
           uri: img.uri,
           name: img.fileName || img.uri.split('/').pop() || 'image.jpg',
           type: img.mimeType || 'image/jpeg'
         }));
         uploadedUrls = await uploadApi.uploadMultipleImages(files);
      }

      await chatApi.adminReply(activeChat._id, { text: textToSend, images: uploadedUrls });
      const res = await chatApi.getChatById(activeChat._id);
      setMessages(res.data?.messages || []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const markResolved = async (id: string) => {
    // Optimistic UI update
    setChats(prev => prev.map(c => c._id === id ? { ...c, isOpen: false } : c));
    if (activeChat?._id === id) {
       setActiveChat((prev: any) => ({ ...prev, isOpen: false }));
    }
    
    try {
      await chatApi.closeChat(id);
    } catch (e) {
      fetchChats(); // Revert on failure
    }
  };

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to permanently delete this chat?')) {
        chatApi.deleteChat(activeChat._id).then(() => {
          closeActiveThread();
        }).catch(e => console.log(e));
      }
    } else {
      Alert.alert('Delete Chat', 'Are you sure you want to permanently delete this chat?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
           try {
             await chatApi.deleteChat(activeChat._id);
             closeActiveThread();
           } catch (e) {
             console.log(e);
           }
        }}
      ]);
    }
  };

  const renderChatCard = ({ item, index }: { item: any; index: number }) => {
    const isClosed = item.isOpen === false;
    const hasUnread = !isClosed && item.unreadByAdmin > 0;
    const lastMsg = item.messages?.[item.messages.length - 1];
    const customerName = item.user?.name || item.userName || 'Guest User';
    const initial = customerName.charAt(0).toUpperCase();

    return (
      <Animated.View entering={FadeInDown.delay(index * 20).duration(400)}>
        <TouchableOpacity style={[styles.card, isClosed && { opacity: 0.65 }]} onPress={() => loadChat(item)} activeOpacity={0.7}>
           <View style={styles.cardHeader}>
              <View style={[styles.avatar, hasUnread && { borderColor: ACCENT, borderWidth: 2 }]}>
                 {item.user?.profileImage ? (
                   <Image source={{ uri: item.user.profileImage }} style={{ width: '100%', height: '100%', borderRadius: 24 }} />
                 ) : (
                   <Text style={styles.avatarText}>{initial}</Text>
                 )}
                 {hasUnread && <View style={styles.unreadDotBadge} />}
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.cardTitle, hasUnread && { color: ACCENT }]} numberOfLines={1}>{customerName}</Text>
                    {lastMsg && <Text style={[styles.timeText, hasUnread && { color: ACCENT, fontFamily: 'Inter-Bold' }]}>{new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
                 </View>
                 <Text style={[styles.lastMsgText, hasUnread && { color: TEXT_DARK, fontFamily: 'Inter-SemiBold' }]} numberOfLines={1}>{lastMsg ? lastMsg.text || 'Sent an image' : 'New thread opened'}</Text>
              </View>
           </View>

           <View style={styles.cardFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.statusIndicator, { backgroundColor: isClosed ? '#94A3B8' : '#10B981' }]} />
                <Text style={styles.statusText}>{isClosed ? 'Resolved' : 'Active Session'}</Text>
              </View>
              {!isClosed && (
                 <TouchableOpacity onPress={() => markResolved(item._id)} style={styles.resolveBtn} activeOpacity={0.7}>
                    <Check size={12} color="#10B981" strokeWidth={3} />
                    <Text style={styles.resolveText}>Resolve</Text>
                 </TouchableOpacity>
              )}
           </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isAdmin = item.sender === 'admin' || item.senderModel === 'Admin';
    const hasImages = item.images && item.images.length > 0;
    const isImageOnly = hasImages && !item.text;

    return (
      <View style={[styles.msgWrapper, isAdmin ? styles.msgRight : styles.msgLeft]}>
         <View style={[styles.msgBubble, isAdmin ? styles.msgBubbleRight : styles.msgBubbleLeft, isImageOnly && styles.msgBubbleImageOnly]}>
            {hasImages && (
               <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, item.text && { marginBottom: 8 }]}>
                  {item.images.map((url: string, i: number) => (
                     <TouchableOpacity key={i} onPress={() => setFullscreenImage(url)} activeOpacity={0.8}>
                        <Image source={{ uri: url }} style={{ width: 140, height: 140, borderRadius: 12, backgroundColor: '#F1F5F9' }} />
                     </TouchableOpacity>
                  ))}
               </View>
            )}
            {item.text ? <Text style={[styles.msgText, isAdmin && { color: '#FFF' }]}>{item.text}</Text> : null}
            <View style={[styles.timeRow, isImageOnly && styles.timeRowImageOnly]}>
               <Text style={[styles.msgTime, isAdmin ? { color: isImageOnly ? '#FFF' : 'rgba(255,255,255,0.7)' } : { color: isImageOnly ? '#FFF' : TEXT_MUTED }]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </Text>
               {isAdmin && <Check size={12} color={isImageOnly ? '#FFF' : "rgba(255,255,255,0.7)"} style={{ marginLeft: 4 }} />}
            </View>
         </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Thread List View */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 50 }]}>
        <Text style={styles.headerTitle}>Support Desk</Text>
        <View style={styles.headerBadge}>
           <Text style={styles.headerSubtitle}>{chats.filter(c => c.isOpen !== false).length} Active sessions</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 20 }}>
           {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={renderChatCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
             <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                   <MessageSquare size={36} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No Support Tickets</Text>
                <Text style={styles.emptyText}>All customer queries are resolved.</Text>
             </View>
          }
        />
      )}

      {/* Active Chat Thread View (Modal Overlay) */}
      {activeChat && (
         <Animated.View entering={SlideInRight.duration(400)} exiting={SlideOutRight.duration(300)} style={[StyleSheet.absoluteFill, { backgroundColor: BG_COLOR, zIndex: 100 }]}>
            <SafeAreaView style={{ flex: 1 }}>
               {/* Chat Header */}
               <View style={styles.chatHeader}>
                  <TouchableOpacity onPress={closeActiveThread} style={styles.backBtn} activeOpacity={0.7}>
                     <ChevronLeft size={24} color={TEXT_DARK} />
                  </TouchableOpacity>
                  <View style={styles.chatHeaderInfo}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.statusIndicator, { backgroundColor: activeChat.isOpen === false ? '#94A3B8' : '#10B981', width: 8, height: 8 }]} />
                        <Text style={styles.chatTitleText} numberOfLines={1}>{activeChat.user?.name || activeChat.userName || 'Guest User'}</Text>
                     </View>
                     <Text style={styles.chatSubText}>Ticket #{activeChat._id.slice(-6).toUpperCase()}</Text>
                  </View>
                  
                  {/* Header Actions */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                     {activeChat.isOpen !== false && (
                       <TouchableOpacity onPress={() => markResolved(activeChat._id)} activeOpacity={0.7}>
                          <XCircle size={22} color="#64748B" />
                       </TouchableOpacity>
                     )}
                     <TouchableOpacity onPress={confirmDelete} activeOpacity={0.7}>
                        <Trash2 size={22} color="#EF4444" />
                     </TouchableOpacity>
                  </View>
               </View>

               <FlatList
                 ref={flatListRef}
                 data={messages}
                 keyExtractor={(item) => item._id || Math.random().toString()}
                 renderItem={renderMessage}
                 contentContainerStyle={styles.chatListContent}
                 onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                 showsVerticalScrollIndicator={false}
                 ListFooterComponent={
                   isTyping ? (
                     <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.typingIndicator}>
                        <Text style={styles.typingText}>User is typing...</Text>
                     </Animated.View>
                   ) : null
                 }
               />

               <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                  <View style={styles.inputDock}>
                     {activeChat.isOpen !== false ? (
                        <>
                          {selectedImages.length > 0 && (
                             <View style={styles.imagePreviewContainer}>
                                <FlatList 
                                   horizontal 
                                   data={selectedImages} 
                                   keyExtractor={(_, i) => i.toString()}
                                   showsHorizontalScrollIndicator={false}
                                   renderItem={({item, index}) => (
                                      <View style={styles.imagePreviewWrap}>
                                         <Image source={{ uri: item.uri }} style={styles.imagePreview} />
                                         <TouchableOpacity style={styles.imagePreviewRemove} onPress={() => removeImage(index)}>
                                            <XCircle size={18} color="#FFF" fill="#000" />
                                         </TouchableOpacity>
                                      </View>
                                   )}
                                />
                             </View>
                          )}
                          <View style={styles.inputWrap}>
                            <TouchableOpacity onPress={pickImage} style={styles.attachBtn} activeOpacity={0.7}>
                               <ImagePlus size={22} color={TEXT_MUTED} />
                            </TouchableOpacity>
                            <TextInput 
                              style={styles.chatInput} 
                              placeholder="Type your response..." 
                              placeholderTextColor={TEXT_MUTED}
                              value={replyText}
                              onChangeText={handleInputText}
                              multiline
                              maxLength={500}
                            />
                            <TouchableOpacity 
                               style={[styles.sendBtn, (!replyText.trim() && selectedImages.length === 0) && { opacity: 0.5, backgroundColor: '#E2E8F0' }]} 
                               onPress={sendReply}
                               disabled={(!replyText.trim() && selectedImages.length === 0) || sending}
                               activeOpacity={0.8}
                            >
                               {sending ? <Loader2 size={18} color="#FFF" /> : <Send size={18} color={(replyText.trim() || selectedImages.length > 0) ? '#FFF' : '#94A3B8'} style={(replyText.trim() || selectedImages.length > 0) ? { marginLeft: -2 } : {}} />}
                            </TouchableOpacity>
                          </View>
                        </>
                     ) : (
                        <View style={styles.resolvedBanner}>
                           <Check size={16} color="#10B981" style={{ marginRight: 6 }} />
                           <Text style={styles.resolvedBannerText}>This support thread has been resolved</Text>
                        </View>
                     )}
                  </View>
               </KeyboardAvoidingView>
            </SafeAreaView>
         </Animated.View>
      )}

      {/* Fullscreen Image Modal */}
      <Modal visible={!!fullscreenImage} transparent={true} animationType="fade">
         <View style={styles.fullscreenModal}>
            <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenImage(null)}>
               <X size={28} color="#FFF" />
            </TouchableOpacity>
            {fullscreenImage && (
               <Image source={{ uri: fullscreenImage }} style={styles.fullscreenImg} resizeMode="contain" />
            )}
         </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  header: { paddingHorizontal: 24, paddingBottom: 24, backgroundColor: BG_COLOR },
  headerTitle: { fontFamily: 'Jakarta-ExtraBold', fontSize: 32, color: TEXT_DARK, letterSpacing: -1 },
  headerBadge: { backgroundColor: 'rgba(252, 128, 25, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 10 },
  headerSubtitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: ACCENT },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  
  card: { backgroundColor: CARD_BG, borderRadius: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width:0, height:6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 3, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', padding: 18, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_DARK },
  unreadDotBadge: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: ACCENT, borderWidth: 2, borderColor: '#FFF' },
  cardTitle: { fontFamily: 'Inter-Black', fontSize: 16, color: TEXT_DARK, flex: 1, marginRight: 8 },
  timeText: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED },
  lastMsgText: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED, marginTop: 4 },
  
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: BORDER_COLOR },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: TEXT_MUTED },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  resolveText: { fontFamily: 'Inter-Bold', fontSize: 12, color: '#10B981' },

  emptyState: { paddingTop: 100, alignItems: 'center', justifyContent: 'center' },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_DARK, marginBottom: 4 },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_MUTED },

  // Chat View
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: CARD_BG, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 4, zIndex: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  chatHeaderInfo: { flex: 1 },
  chatTitleText: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_DARK, letterSpacing: -0.5, flex: 1, paddingRight: 10 },
  chatSubText: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  
  chatListContent: { padding: 20, paddingBottom: 20 },
  typingIndicator: { alignSelf: 'flex-start', padding: 12, backgroundColor: '#E2E8F0', borderRadius: 16, borderBottomLeftRadius: 4, marginBottom: 16 },
  typingText: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED },
  
  msgWrapper: { width: '100%', marginBottom: 16, alignItems: 'flex-start' },
  msgRight: { alignItems: 'flex-end' },
  msgLeft: { alignItems: 'flex-start' },
  msgBubble: { maxWidth: '82%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  msgBubbleLeft: { backgroundColor: CARD_BG, borderBottomLeftRadius: 4 },
  msgBubbleRight: { backgroundColor: ACCENT, borderBottomRightRadius: 4 },
  msgBubbleImageOnly: { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0, shadowOpacity: 0, elevation: 0 },
  msgText: { fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_DARK, lineHeight: 22 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  timeRowImageOnly: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  msgTime: { fontFamily: 'Inter-SemiBold', fontSize: 10, color: TEXT_MUTED },

  inputDock: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 12 : 24, backgroundColor: BG_COLOR },
  imagePreviewContainer: { marginBottom: 12 },
  imagePreviewWrap: { marginRight: 10, position: 'relative' },
  imagePreview: { width: 70, height: 70, borderRadius: 12, borderWidth: 1, borderColor: BORDER_COLOR },
  imagePreviewRemove: { position: 'absolute', top: -6, right: -6, zIndex: 10 },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: CARD_BG, borderRadius: 24, paddingHorizontal: 6, paddingVertical: 6, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 5 },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 4, marginBottom: 2 },
  chatInput: { flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: 4, paddingTop: 10, paddingBottom: 10, fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_DARK },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  resolvedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#D1FAE5' },
  resolvedBannerText: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#10B981' },

  fullscreenModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullscreenClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  fullscreenImg: { width: '100%', height: '80%' }
});

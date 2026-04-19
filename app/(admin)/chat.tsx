import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, TextInput, KeyboardAvoidingView, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatApi } from '../../services/api';
import Animated, { FadeInDown, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { MessageSquare, Check, X, Send, User } from 'lucide-react-native';
import { SkeletonCard } from '../../components/Skeleton';

const BG_COLOR = '#F5F7FA';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';
const ACCENT = '#3B82F6'; // Blue matching Chat icon

export default function AdminChatScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState<any[]>([]);

  // Active Chat State
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const flatListRef = useRef<FlatList>(null);

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
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  const loadChat = async (chat: any) => {
    setActiveChat(chat);
    try {
      const res = await chatApi.getChatById(chat._id);
      setMessages(res.data?.messages || []);
    } catch {}
  };

  const closeActiveThread = () => {
    setActiveChat(null);
    setMessages([]);
    fetchChats(); // Refresh main list silently
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    const textToSend = replyText;
    setReplyText('');
    
    // Optimistic append
    const tempMsg = {
      _id: Date.now().toString(),
      senderModel: 'Admin',
      text: textToSend,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      await chatApi.adminReply(activeChat._id, { text: textToSend });
      // Reload actual chat state to sync properly
      const res = await chatApi.getChatById(activeChat._id);
      setMessages(res.data?.messages || []);
    } catch (e) {
      console.log(e);
    }
  };

  const markResolved = async (id: string) => {
    try {
      await chatApi.closeChat(id);
      if (activeChat?._id === id) closeActiveThread();
      else fetchChats();
    } catch (e) {}
  };

  const renderChatCard = ({ item, index }: { item: any; index: number }) => {
    const isClosed = item.status === 'CLOSED';
    const lastMsg = item.messages?.[item.messages.length - 1];
    const customerName = item.user?.name || 'Guest User';

    return (
      <Animated.View entering={FadeInDown.delay(index * 20).springify().damping(16)}>
        <TouchableOpacity style={[styles.card, isClosed && { opacity: 0.6 }]} onPress={() => loadChat(item)}>
           <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                 <User size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.cardTitle}>{customerName}</Text>
                    {lastMsg && <Text style={styles.timeText}>{new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
                 </View>
                 <Text style={styles.lastMsgText} numberOfLines={1}>{lastMsg ? lastMsg.text : 'Thread opened'}</Text>
              </View>
           </View>

           <View style={styles.cardFooter}>
              <View style={[styles.statusBadge, { backgroundColor: isClosed ? '#F1F5F9' : '#DBEAFE' }]}>
                 <Text style={[styles.statusText, { color: isClosed ? TEXT_MUTED : ACCENT }]}>{isClosed ? 'RESOLVED' : 'ACTIVE'}</Text>
              </View>
              {!isClosed && (
                 <TouchableOpacity onPress={() => markResolved(item._id)} style={styles.resolveBtn}>
                    <Check size={14} color="#10B981" />
                    <Text style={styles.resolveText}>Mark Resolved</Text>
                 </TouchableOpacity>
              )}
           </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isAdmin = item.senderModel === 'Admin';
    return (
      <View style={[styles.msgWrapper, isAdmin ? styles.msgRight : styles.msgLeft]}>
         <View style={[styles.msgBubble, isAdmin ? styles.msgBubbleRight : styles.msgBubbleLeft]}>
            <Text style={[styles.msgText, isAdmin && { color: '#FFF' }]}>{item.text}</Text>
            <Text style={[styles.msgTime, isAdmin && { color: 'rgba(255,255,255,0.7)' }]}>
               {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
         </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Thread List View */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 40 }]}>
        <Text style={styles.headerTitle}>Support Desk</Text>
        <Text style={styles.headerSubtitle}>{chats.filter(c => c.status !== 'CLOSED').length} Active sessions</Text>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
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
                <MessageSquare size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No support tickets found.</Text>
             </View>
          }
        />
      )}

      {/* Active Chat Thread View */}
      {activeChat && (
         <Animated.View entering={SlideInRight.springify().damping(18)} exiting={SlideOutRight} style={[StyleSheet.absoluteFill, { backgroundColor: BG_COLOR, zIndex: 50 }]}>
            <SafeAreaView style={{ flex: 1 }}>
               <View style={styles.chatHeader}>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.chatTitleText}>{activeChat.user?.name || 'Guest User'}</Text>
                     <Text style={styles.chatSubText}>Ticket #{activeChat._id.slice(-6).toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity onPress={closeActiveThread} style={styles.closeBtn}>
                     <X size={20} color={TEXT_DARK} />
                  </TouchableOpacity>
               </View>

               <FlatList
                 ref={flatListRef}
                 data={messages}
                 keyExtractor={(item) => item._id || Math.random().toString()}
                 renderItem={renderMessage}
                 contentContainerStyle={styles.chatListContent}
                 onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
               />

               <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                  <View style={styles.inputDock}>
                     {activeChat.status !== 'CLOSED' ? (
                        <>
                          <TextInput 
                            style={styles.chatInput} 
                            placeholder="Type a response..." 
                            placeholderTextColor={TEXT_MUTED}
                            value={replyText}
                            onChangeText={setReplyText}
                            multiline
                            maxLength={500}
                          />
                          <TouchableOpacity 
                             style={[styles.sendBtn, !replyText.trim() && { opacity: 0.5 }]} 
                             onPress={sendReply}
                             disabled={!replyText.trim()}
                          >
                             <Send size={18} color="#FFF" />
                          </TouchableOpacity>
                        </>
                     ) : (
                        <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
                           <Text style={{ fontFamily: 'Inter-Medium', color: TEXT_MUTED }}>This thread has been resolved.</Text>
                        </View>
                     )}
                  </View>
               </KeyboardAvoidingView>
            </SafeAreaView>
         </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  header: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: CARD_BG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4, zIndex: 10 },
  headerTitle: { fontFamily: 'Inter-Black', fontSize: 28, color: TEXT_DARK, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: 'Inter-Bold', fontSize: 13, color: ACCENT, marginTop: 2 },
  
  listContent: { padding: 16, paddingBottom: 40 },
  
  card: { backgroundColor: CARD_BG, borderRadius: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'Inter-Black', fontSize: 15, color: TEXT_DARK },
  timeText: { fontFamily: 'Inter-Medium', fontSize: 11, color: TEXT_MUTED },
  lastMsgText: { fontFamily: 'Inter-Medium', fontSize: 13, color: TEXT_MUTED, marginTop: 4 },
  
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FAFAFA', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontFamily: 'Inter-Bold', fontSize: 10 },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  resolveText: { fontFamily: 'Inter-Bold', fontSize: 11, color: '#10B981' },

  emptyState: { paddingTop: 100, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_MUTED },

  // Chat View
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: CARD_BG, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR, shadowOpacity: 0.02, elevation: 4, zIndex: 10 },
  chatTitleText: { fontFamily: 'Inter-Black', fontSize: 18, color: TEXT_DARK },
  chatSubText: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_MUTED },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },
  
  chatListContent: { padding: 16, paddingBottom: 20 },
  msgWrapper: { width: '100%', marginBottom: 12, alignItems: 'flex-start' },
  msgRight: { alignItems: 'flex-end' },
  msgLeft: { alignItems: 'flex-start' },
  msgBubble: { maxWidth: '80%', padding: 14, borderRadius: 20 },
  msgBubbleLeft: { backgroundColor: CARD_BG, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: BORDER_COLOR },
  msgBubbleRight: { backgroundColor: ACCENT, borderBottomRightRadius: 4 },
  msgText: { fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_DARK, lineHeight: 20 },
  msgTime: { fontFamily: 'Inter-SemiBold', fontSize: 10, color: TEXT_MUTED, marginTop: 4, alignSelf: 'flex-end' },

  inputDock: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: CARD_BG, borderTopWidth: 1, borderTopColor: BORDER_COLOR },
  chatInput: { flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: BG_COLOR, borderRadius: 22, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, fontFamily: 'Inter-Medium', fontSize: 14, color: TEXT_DARK, borderWidth: 1, borderColor: BORDER_COLOR },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
});

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function MessagesTab() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load data whenever the user opens this tab
  useFocusEffect(
    useCallback(() => {
      fetchInbox();
    }, [])
  );

  async function fetchInbox() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const myId = session.user.id;

      // 1. Fetch ALL messages sent or received by me
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(full_name, avatar_url),
          receiver:receiver_id(full_name, avatar_url)
        `)
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Group by "Conversation Partner"
      const uniqueMap = {};
      
      data.forEach((msg) => {
        // Who is the "other" person?
        const isMe = msg.sender_id === myId;
        const partnerId = isMe ? msg.receiver_id : msg.sender_id;
        const partnerData = isMe ? msg.receiver : msg.sender;

        // Only add if we haven't seen this partner yet (since we sorted by new, this is the latest msg)
        if (!uniqueMap[partnerId]) {
          uniqueMap[partnerId] = {
            id: partnerId,
            name: partnerData?.full_name || "User",
            avatar: partnerData?.avatar_url,
            lastMsg: msg.content,
            date: new Date(msg.created_at).toLocaleDateString(),
            unread: !isMe && !msg.is_read // Bold if I didn't send it and it's not read
          };
        }
      });

      setConversations(Object.values(uniqueMap));
    } catch (error) {
      console.log("Error loading inbox:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Messages</Text>

      {loading ? (
        <ActivityIndicator style={{marginTop: 50}} size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchInbox} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FontAwesome name="comments-o" size={50} color="#ccc" />
              <Text style={{ marginTop: 10, color: 'gray' }}>No messages yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.card, item.unread && styles.unreadCard]} 
              onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } })}
            >
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.placeholder}>
                  <FontAwesome name="user" size={24} color="#666" />
                </View>
              )}
              
              <View style={{ flex: 1 }}>
                <View style={styles.topRow}>
                  <Text style={[styles.name, item.unread && styles.unreadText]}>{item.name}</Text>
                  <Text style={styles.date}>{item.date}</Text>
                </View>
                <Text numberOfLines={1} style={[styles.msg, item.unread && styles.unreadText]}>
                  {item.lastMsg}
                </Text>
              </View>
              
              {/* Blue Dot for Unread */}
              {item.unread && <View style={styles.blueDot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', paddingTop: 60, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  
  card: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  unreadCard: { backgroundColor: '#f0f9ff', marginHorizontal: -20, paddingHorizontal: 20 }, // Highlight background
  
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#eee' },
  placeholder: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  name: { fontSize: 16, fontWeight: 'bold' },
  msg: { fontSize: 14, color: '#666' },
  date: { fontSize: 12, color: '#999' },
  
  unreadText: { color: 'black', fontWeight: 'bold' },
  blueDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#007AFF', marginLeft: 10 }
});
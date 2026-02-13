import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';

export default function ChatScreen() {
  const { id } = useLocalSearchParams(); // Partner's ID
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel = null; 

    const setupChat = async () => {
      // 1. Get Current User
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUser(session.user);
      const myId = session.user.id;

      // 🟢 NEW: Mark incoming messages as READ
      // This removes the "Blue Dot" in the Inbox
      const { error: readError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', myId) // Messages sent TO me
        .eq('sender_id', id);    // From THIS partner
      
      if (readError) console.log("Error marking read:", readError.message);

      // 2. Fetch History (Initial Load)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${myId})`)
        .order('created_at', { ascending: false });

      if (error) console.log("Error fetching history:", error.message);
      if (data) setMessages(data);
      setLoading(false);

      // 3. Subscribe to Realtime (Live Updates)
      channel = supabase
        .channel(`chat:${myId}-${id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new;
            // Only add if it belongs to THIS specific conversation
            if (
              (newMsg.sender_id === myId && newMsg.receiver_id === id) || 
              (newMsg.sender_id === id && newMsg.receiver_id === myId)
            ) {
              setMessages((previous) => [newMsg, ...previous]);
              
              // If the message is from them, mark it read immediately while screen is open
              if (newMsg.receiver_id === myId) {
                 supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
              }
            }
          }
        )
        .subscribe();
    };

    setupChat();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [id]);

  async function sendMessage() {
    if (!inputText.trim() || !currentUser) return;
    const content = inputText.trim();
    setInputText(''); 

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: id,
      content: content
    });

    if (error) {
      console.error("Send failed:", error.message);
      alert("Failed to send message");
    }
  }

  if (loading) return <ActivityIndicator style={{marginTop: 50}} size="large" color="#007AFF" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{padding: 10}}>
          <FontAwesome name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          data={messages}
          inverted 
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isMe = item.sender_id === currentUser?.id;
            return (
              <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                <Text style={isMe ? styles.myText : styles.theirText}>{item.content}</Text>
              </View>
            );
          }}
          contentContainerStyle={{ padding: 15 }}
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <FontAwesome name="send" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginBottom: 8 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#007AFF' },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#E5E5EA' },
  myText: { color: 'white', fontSize: 16 },
  theirText: { color: 'black', fontSize: 16 },
  inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f2f2f7', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, marginRight: 10 },
  sendBtn: { backgroundColor: '#007AFF', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});
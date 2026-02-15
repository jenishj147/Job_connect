import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import NotificationToast from '../components/NotificationToast';
import { supabase } from '../supabase';

export default function RootLayout() {
  const [session, setSession] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [newMessage, setNewMessage] = useState(null);
  const [showToast, setShowToast] = useState(false);

  const router = useRouter();
  const segments = useSegments();

  // 1. Auth & Session Management
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setInitialized(true);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      // Ensure initialized is true on auth change to prevent stuck loading screens
      setInitialized(true); 
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/update-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Redirect Logic
  useEffect(() => {
    if (!initialized) return;
    const currentGroup = segments[0] || '';
    const publicScreens = ['login', 'signup', 'forgot-password', 'update-password'];
    
    if (currentGroup === 'update-password') return; 
    
    const inPublicGroup = publicScreens.includes(currentGroup);

    if (session && inPublicGroup) {
      router.replace('/(tabs)');
    } else if (!session && !inPublicGroup) {
      router.replace('/login');
    }
  }, [session, initialized, segments]);

  // 3. NOTIFICATION LOGIC
  useEffect(() => {
    if (!session?.user?.id) return;

    console.log("Subscribing to messages for user:", session.user.id);

    const channel = supabase
      .channel('public:messages') 
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const messageData = payload.new;
          const myId = session.user.id;

          // Check if message is for ME and NOT from ME
          if (messageData.receiver_id === myId && messageData.sender_id !== myId) {
             
             // Fetch Sender Name
             const { data: senderProfile, error } = await supabase
               .from('profiles')
               .select('username') 
               .eq('id', messageData.sender_id)
               .single();
             
             if (error) {
                console.log("Error fetching sender name:", error.message);
             }

             const senderName = senderProfile?.username || "New Message";

             setNewMessage({ 
               ...messageData, 
               senderName: senderName 
             });
             
             // 🟢 Trick to force re-render if toast is already open (Optional, 
             // but 'message' dependency in Toast useEffect handles most of this)
             setShowToast(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    
  }, [session?.user?.id]); 

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="forgot-password" options={{ presentation: 'modal' }} />
        <Stack.Screen name="update-password" options={{ gestureEnabled: false }} />
        <Stack.Screen name="job/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="my-applications" options={{ presentation: 'card' }} />
      </Stack>

      <NotificationToast 
        visible={showToast} 
        message={newMessage} 
        onHide={() => setShowToast(false)} 
      />
    </>
  );
}
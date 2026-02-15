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

  // 🟢 3. NOTIFICATION LOGIC (Messages AND Hired Status)
  useEffect(() => {
    // Only run if we have a valid User ID
    if (!session?.user?.id) return;

    const myId = session.user.id;
    console.log("Subscribing to notifications for user:", myId);

    const channel = supabase
      .channel('public:notifications') 
      
      // --- LISTENER A: NEW MESSAGES ---
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const messageData = payload.new;

          // Check if message is for ME and NOT from ME
          if (messageData.receiver_id === myId && messageData.sender_id !== myId) {
              
             // Fetch Sender Name
             const { data: senderProfile, error } = await supabase
               .from('profiles')
               .select('username') 
               .eq('id', messageData.sender_id)
               .single();
             
             const senderName = senderProfile?.username || "New Message";

             setNewMessage({ 
               ...messageData, 
               type: 'message', // 👈 Standard message type
               senderName: senderName 
             });
             
             setShowToast(true);
          }
        }
      )

      // --- LISTENER B: JOB APPLICATIONS (HIRED) ---
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
        },
        async (payload) => {
          const newData = payload.new;

          // Check if:
          // 1. I am the applicant
          // 2. The status changed to 'ACCEPTED' (Must match JobDetailsScreen logic)
          if (newData.applicant_id === myId && newData.status === 'ACCEPTED') {
             
             // Fetch Job Details for the notification text
             const { data: jobData } = await supabase
               .from('jobs')
               .select('title')
               .eq('id', newData.job_id)
               .single();

             const jobTitle = jobData?.title || "a job";

             setNewMessage({
               type: 'hire', // 👈 Special 'hire' type triggers Green Toast & Trophy Icon
               senderName: "Congratulations! 🎉",
               content: `You have been hired for ${jobTitle}`,
               conversation_id: null // Clicking redirects to 'my-applications'
             });

             setShowToast(true);
          }
        }
      )
      .subscribe();

    return () => {
      console.log("Unsubscribing from notifications...");
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
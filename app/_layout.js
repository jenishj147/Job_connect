import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../supabase';

export default function RootLayout() {
  const [session, setSession] = useState(null);
  const [initialized, setInitialized] = useState(false);
  
  const router = useRouter();
  const segments = useSegments();

  // 1. Monitor Auth State
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

    // 🟢 CHANGED: Remove the underscore from 'event' so we can use it
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setInitialized(true);

      // 🟢 ADDED: Catch the password recovery event explicitly
      if (event === 'PASSWORD_RECOVERY') {
        // Force navigation to update-password, ignoring other logic
        router.replace('/update-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Handle Protected vs Public Routing
  useEffect(() => {
    if (!initialized) return;

    const currentGroup = segments[0] || '';
    
    // Define all screens that don't require login
    const publicScreens = ['login', 'signup', 'forgot-password', 'update-password'];
    const inPublicGroup = publicScreens.includes(currentGroup);

    // 🟢 KEEP THIS: It stops the auto-redirect if we are already on the update page
    if (currentGroup === 'update-password') {
      return; 
    }

    if (session && inPublicGroup) {
      // If logged in and on a login/reset screen, go to home
      router.replace('/(tabs)');
    } else if (!session && !inPublicGroup) {
      // If not logged in and on a protected screen, go to login
      router.replace('/login');
    }
  }, [session, initialized, segments]);

  // Loading Screen
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="login" 
        options={{ gestureEnabled: false, animation: 'fade' }} 
      />
      <Stack.Screen 
        name="forgot-password" 
        options={{ presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="update-password" 
        options={{ gestureEnabled: false }} 
      />
      <Stack.Screen
        name="job/[id]"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="my-applications"
        options={{ presentation: 'card' }}
      />
    </Stack>
  );
}
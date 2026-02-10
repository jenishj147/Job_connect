import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../supabase';

export default function RootLayout() {
  const [session, setSession] = useState(null);
  const [initialized, setInitialized] = useState(false);
  
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 1. Initial Session Check
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

    // 2. Real-time Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    // 🛡️ Safety: Handle case where segments might be undefined initially
    const currentGroup = segments[0] || '';
    
    // Check if user is currently on an authentication screen
    // (If you add a 'register' screen later, add it to this check)
    const inAuthGroup = currentGroup === 'login';

    if (session && inAuthGroup) {
      // ✅ Logged In: Redirect away from Login -> to Main Tabs
      router.replace('/(tabs)');
    } else if (!session && !inAuthGroup) {
      // ⛔ Not Logged In: Redirect away from Protected Screens -> to Login
      router.replace('/login');
    }
  }, [session, initialized, segments]);

  // Loading Spinner (blocks rendering until we know who the user is)
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Main App Group */}
      <Stack.Screen name="(tabs)" />

      {/* Auth Group */}
      <Stack.Screen 
        name="login" 
        options={{ 
          gestureEnabled: false, // Prevent swiping back to app
          animation: 'fade'      // Nice fade effect for login
        }} 
      />

      {/* Detail Screens */}
      <Stack.Screen
        name="job/[id]"
        options={{
          presentation: 'modal', // Makes it slide up like a sheet
          headerShown: false
        }}
      />

      <Stack.Screen
        name="my-applications"
        options={{
          presentation: 'card',  // Standard push navigation
          headerShown: false     // We use the custom header inside the component
        }}
      />
    </Stack>
  );
}
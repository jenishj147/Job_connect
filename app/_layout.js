import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';

export default function RootLayout() {
  const [session, setSession] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 1. Check for an existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // 2. Listen for login/logout changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    // Identify where the user is currently trying to go
    const inTabsGroup = segments[0] === '(tabs)';
    const inLogin = segments[0] === 'login';
    const inJobDetails = segments[0] === 'job';
    const inMyApps = segments[0] === 'my-applications';

    if (session) {
      // User IS logged in
      // If they are on the login screen, redirect them to the Tabs
      if (inLogin) {
        router.replace('/(tabs)');
      }
      // Otherwise, let them stay where they are (Tabs, Job Details, or My Apps)
    } else {
      // User is NOT logged in
      // If they are not on the login screen, force them to Login
      if (!inLogin) {
        router.replace('/login');
      }
    }
  }, [session, initialized, segments]);

  // Show a spinner while we check if the user is logged in
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Main Tab Navigation */}
      <Stack.Screen name="(tabs)" />

      {/* Auth Screen */}
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />

      {/* Sub-Screens */}
      <Stack.Screen
        name="job/[id]"
        options={{
          presentation: 'modal',
          headerShown: false
        }}
      />

      <Stack.Screen
        name="my-applications"
        options={{
          presentation: 'card',
          headerShown: false
        }}
      />
    </Stack>
  );
}
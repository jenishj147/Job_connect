import { Tabs } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF', headerShown: false }}>
      
      {/* name="index" points to app/(tabs)/index.js 
        (This is your "My Jobs" screen where you post jobs)
      */}
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'My Jobs', 
          tabBarIcon: ({ color }) => <FontAwesome size={24} name="briefcase" color={color} /> 
        }} 
      />

      {/* name="find" points to app/(tabs)/find.js 
        (This is the "Find Work" screen)
      */}
      <Tabs.Screen 
        name="find" 
        options={{ 
          title: 'Find Work', 
          tabBarIcon: ({ color }) => <FontAwesome size={24} name="search" color={color} /> 
        }} 
      />

      {/* name="profile" points to app/(tabs)/profile.js 
        (This is the "Profile" screen)
      */}
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile', 
          tabBarIcon: ({ color }) => <FontAwesome size={24} name="user" color={color} /> 
        }} 
      />
    </Tabs>
  );
}
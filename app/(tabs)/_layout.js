import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // 🛑 THIS LINE STOPS THE OVERLAP
        headerShown: false, 
        
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 60, 
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          backgroundColor: 'white',
          borderTopColor: '#E5E5EA',
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'My Jobs', 
          tabBarIcon: ({ color }) => <FontAwesome name="briefcase" size={24} color={color} style={{ marginBottom: -3 }} />,
        }} 
      />

      <Tabs.Screen 
        name="find" 
        options={{ 
          title: 'Find Work', 
          tabBarIcon: ({ color }) => <FontAwesome name="search" size={24} color={color} style={{ marginBottom: -3 }} />,
        }} 
      />

      <Tabs.Screen 
        name="messages" 
        options={{ 
          title: 'Messages', 
          tabBarIcon: ({ color }) => <FontAwesome name="comment" size={24} color={color} style={{ marginBottom: -3 }} />,
        }} 
      />

      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile', 
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={24} color={color} style={{ marginBottom: -3 }} />,
        }} 
      />
    </Tabs>
  );
}
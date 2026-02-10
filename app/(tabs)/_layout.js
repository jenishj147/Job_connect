import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // 1. Hide the default header (since we have custom headers in screens)
        headerShown: false,
        
        // 2. Active/Inactive Colors
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',

        // 3. Tab Bar Sizing (Fixes "squashed" look on iPhones)
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 60, 
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          backgroundColor: 'white',
          borderTopColor: '#E5E5EA',
        },
        
        // 4. Text Styling
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      {/* Route: app/(tabs)/index.js 
        Label: "My Jobs" (Post/Manage Jobs)
      */}
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'My Jobs', 
          tabBarIcon: ({ color }) => (
            <FontAwesome 
              name="briefcase" 
              size={24} 
              color={color} 
              style={{ marginBottom: -3 }} // Visual center fix
            /> 
          ),
        }} 
      />

      {/* Route: app/(tabs)/find.js 
        Label: "Find Work" (Search Jobs)
      */}
      <Tabs.Screen 
        name="find" 
        options={{ 
          title: 'Find Work', 
          tabBarIcon: ({ color }) => (
            <FontAwesome 
              name="search" 
              size={24} 
              color={color} 
              style={{ marginBottom: -3 }} 
            /> 
          ),
        }} 
      />

      {/* Route: app/(tabs)/profile.js 
        Label: "Profile" (User Settings)
      */}
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile', 
          tabBarIcon: ({ color }) => (
            <FontAwesome 
              name="user" 
              size={24} 
              color={color} 
              style={{ marginBottom: -3 }} 
            /> 
          ),
        }} 
      />
    </Tabs>
  );
}
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NotificationToast({ message, visible, onHide }) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-150)).current; 
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible) {
      // 1. Reset Timer if a new message arrives while already open
      if (timerRef.current) clearTimeout(timerRef.current);

      // 2. Play Entrance Animation
      Animated.spring(slideAnim, {
        toValue: 0, 
        useNativeDriver: Platform.OS !== 'web', 
        speed: 12,
        bounciness: 8,
      }).start();

      // 3. Set Auto-Hide Timer
      timerRef.current = setTimeout(() => {
        hideToast();
      }, 4000);
    }

    // Cleanup function
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, message]); // <--- 🟢 ADDED 'message' to reset timer on new chats

  const hideToast = () => {
    Animated.timing(slideAnim, {
      toValue: -150, 
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      if (onHide) onHide();
    });
  };

  const handlePress = () => {
    hideToast();
    if (message?.conversation_id) {
       router.push(`/chat/${message.conversation_id}`);
    } else {
       router.push('/(tabs)/messages');
    }
  };

  if (!visible) return null;

  return (
    <Animated.View style={[
      styles.toast, 
      { transform: [{ translateY: slideAnim }] }
    ]}>
      <TouchableOpacity onPress={handlePress} style={styles.content}>
        <FontAwesome name="user-circle" size={24} color="#fff" style={styles.icon} />
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {message?.senderName || "New Message"}
          </Text>
          
          <Text style={styles.message} numberOfLines={1}>
            {message?.content || "Sent you a message"}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    backgroundColor: '#333',
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    
    // 🟢 FIXED: "fixed" is invalid in React Native. Use "absolute".
    position: 'absolute', 
    left: 20,
    right: 20,
    
    ...Platform.select({
      web: {
        top: 20, 
        left: '50%', 
        marginLeft: -175, 
        width: 350, 
        // Note: boxShadow is valid in RN-Web, but standard RN uses shadowColor above
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.3)', 
      },
      default: {
        top: 50, // Mobile top margin (safe area usually)
      }
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  icon: { marginRight: 15 },
  textContainer: { flex: 1 },
  title: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
  message: { color: '#ddd', fontSize: 13 },
});
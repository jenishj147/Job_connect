import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons'; // 👈 Import for Trophy Icon
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NotificationToast({ message, visible, onHide }) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-150)).current; 
  const timerRef = useRef(null);

  // 🟢 Check if this is a HIRE notification
  const isHire = message?.type === 'hire';

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);

      Animated.spring(slideAnim, {
        toValue: 0, 
        useNativeDriver: Platform.OS !== 'web', 
        speed: 12,
        bounciness: 8,
      }).start();

      // Keep "Hire" notifications visible longer (5s) than messages (4s)
      const duration = isHire ? 5000 : 4000;

      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, message]); 

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
    
    // 🟢 Redirect Logic based on Type
    if (isHire) {
       router.push('/my-applications');
    } else if (message?.conversation_id) {
       router.push(`/chat/${message.conversation_id}`);
    } else {
       router.push('/(tabs)/messages');
    }
  };

  if (!visible) return null;

  // 🟢 Dynamic Styles based on Type
  const backgroundColor = isHire ? '#10B981' : '#333'; // Green for Hire, Dark for Message

  return (
    <Animated.View style={[
      styles.toast, 
      { backgroundColor, transform: [{ translateY: slideAnim }] }
    ]}>
      <TouchableOpacity onPress={handlePress} style={styles.content}>
        
        {/* 🟢 Dynamic Icon */}
        {isHire ? (
           <MaterialIcons name="emoji-events" size={28} color="#fff" style={styles.icon} />
        ) : (
           <FontAwesome name="user-circle" size={24} color="#fff" style={styles.icon} />
        )}
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {message?.senderName || "New Notification"}
          </Text>
          
          <Text style={styles.message} numberOfLines={2}>
            {message?.content || "You have a new update"}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    // Background color is handled dynamically in style prop
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    
    position: 'absolute', 
    left: 20,
    right: 20,
    
    ...Platform.select({
      web: {
        top: 20, 
        left: '50%', 
        marginLeft: -175, 
        width: 350, 
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.3)', 
      },
      default: {
        top: 50, 
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
  title: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  message: { color: '#f0f0f0', fontSize: 13 },
});
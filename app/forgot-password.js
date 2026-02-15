import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { supabase } from '../supabase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      const msg = "Please enter your email.";
      Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
      return;
    }

    setLoading(true);

    try {
      // 🟢 UNIVERSAL REDIRECT LOGIC
      let redirectUrl = "";

      if (Platform.OS === 'web') {
        redirectUrl = `${window.location.origin}/update-password`;
      } else {
        redirectUrl = Linking.createURL('/update-password');
      }

      console.log("Sending password reset to:", redirectUrl); 

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl, 
      });

      if (error) throw error;

      const successMsg = "Check your email for the reset link!";
      if (Platform.OS === 'web') {
        alert(successMsg);
        router.back();
      } else {
        Alert.alert("Success", successMsg, [{ text: "OK", onPress: () => router.back() }]);
      }
      
    } catch (error) {
      const errorMsg = error.message;
      Platform.OS === 'web' ? alert(errorMsg) : Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 🟢 FIX 1: Move KeyboardAvoidingView to the OUTSIDE to handle layout better
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1 }} // Ensure it fills the screen
    >
      {/* 🟢 FIX 2: Disable dismissal on Web to prevent input blocking */}
      <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}>
        <View style={styles.container}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <FontAwesome name="arrow-left" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Reset Password</Text>
          </View>

          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <View style={styles.inputContainer}>
            <FontAwesome name="envelope" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <TouchableOpacity 
            style={[styles.resetButton, loading && { opacity: 0.7 }]} 
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.resetButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // 🟢 NOTE: I removed 'flex: 1' from here because it's now on the internal View
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  header: { marginTop: 60, marginBottom: 20 },
  backBtn: { marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30, lineHeight: 24 },
  
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5',
    borderRadius: 12, paddingHorizontal: 15, height: 55, marginBottom: 25,
    borderWidth: 1, borderColor: '#EEE'
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333', height: '100%' },
  
  resetButton: {
    backgroundColor: '#007AFF', height: 55, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 4px 10px rgba(0, 122, 255, 0.3)',
      },
    }),
  },
  resetButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
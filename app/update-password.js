import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform, // 👈 Ensure this is imported
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../supabase';

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password) {
      const msg = "Please enter a new password.";
      // 🟢 FIX 1: Web-compatible alert for empty password
      Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // 🟢 FIX 2: Web-compatible Success Message
      const successMsg = "Your password has been updated!";
      
      if (Platform.OS === 'web') {
        // On Web: Show browser alert, then navigate
        alert(successMsg);
        router.replace('/(tabs)');
      } else {
        // On Mobile: Show native Alert with button
        Alert.alert(
          "Success",
          successMsg,
          [{ text: "Go to Home", onPress: () => router.replace('/(tabs)') }]
        );
      }
      
    } catch (error) {
      // 🟢 FIX 3: Web-compatible Error Message
      const errorMsg = error.message;
      Platform.OS === 'web' ? alert(errorMsg) : Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Set New Password</Text>
      </View>

      <Text style={styles.subtitle}>
        Enter your new password below.
      </Text>

      <View style={styles.inputContainer}>
        <FontAwesome name="lock" size={24} color="#666" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="New Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity 
        style={styles.updateButton} 
        onPress={handleUpdatePassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.updateButtonText}>Update Password</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20, justifyContent: 'center' },
  header: { marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5',
    borderRadius: 12, paddingHorizontal: 15, height: 55, marginBottom: 25,
    borderWidth: 1, borderColor: '#EEE'
  },
  icon: { marginRight: 10, width: 24, textAlign: 'center' },
  input: { flex: 1, fontSize: 16, color: '#333', height: '100%' },
  
  updateButton: {
    backgroundColor: '#007AFF', height: 55, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#007AFF', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 5
  },
  updateButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
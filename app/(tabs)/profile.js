import { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Image, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { supabase } from '../../supabase';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [session, setSession] = useState(null);
  
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) getProfile(session);
    });
  }, []);

  async function getProfile(currentSession) {
    try {
      setLoading(true);
      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url, full_name, phone, bio`)
        .eq('id', currentSession.user.id)
        .single();

      if (error && status !== 406) throw error;

      if (data) {
        setUsername(data.username || '');
        setWebsite(data.website || '');
        setAvatarUrl(data.avatar_url || null);
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setBio(data.bio || '');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function pickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled || !result.assets) return;

      const image = result.assets[0];
      await uploadImage(image.uri); // 👈 Separate upload function for clarity

    } catch (error) {
      Alert.alert('Selection Error', error.message);
    }
  }

  async function uploadImage(uri) {
    try {
      setUploading(true);

      // 1. Fetch the file from local URI and convert to Blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // 2. Create a unique file name
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpeg';
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 3. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg', // Force jpeg for simplicity
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 4. Get the Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      // 5. Update local state immediately so user sees the change
      setAvatarUrl(data.publicUrl);

      // 6. Optional: Auto-save the new URL to the profile table
      await updateProfileField({ avatar_url: data.publicUrl });

    } catch (error) {
      console.log("Upload error details:", error);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  }

  // Helper to update just one field or the whole profile
  async function updateProfileField(updates = {}) {
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        updated_at: new Date(),
        ...updates,
      });

      if (error) throw error;
    } catch (error) {
      console.log(error);
    }
  }

  async function saveAllChanges() {
    try {
      setLoading(true);
      const updates = {
        id: session.user.id,
        username,
        website,
        avatar_url: avatarUrl, // ensure we save the latest URL
        full_name: fullName,
        phone,
        bio,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Update Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Error", error.message);
    // Router will handle redirect in _layout.js
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 100, alignItems: 'center' }}
      >
        <Text style={styles.header}>Settings</Text>

        {/* AVATAR SECTION */}
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <FontAwesome name="user" size={50} color="#ccc" />
            </View>
          )}

          {/* Camera Button */}
          <TouchableOpacity 
            style={styles.changeAvatarButton} 
            onPress={pickImage} 
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <FontAwesome name="camera" size={16} color="white" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.subHeader}>
          {uploading ? "Uploading..." : "Tap camera to change photo"}
        </Text>

        {/* MY APPLICATIONS BUTTON */}
        <TouchableOpacity 
          style={styles.applicationButton} 
          onPress={() => router.push('/my-applications')}
        >
          <FontAwesome name="list-alt" size={20} color="white" />
          <Text style={styles.applicationButtonText}>My Applications</Text>
          <FontAwesome name="chevron-right" size={14} color="rgba(255,255,255,0.6)" style={{marginLeft: 'auto'}}/>
        </TouchableOpacity>

        {/* FORM INPUTS */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput 
              style={styles.input} 
              value={fullName} 
              onChangeText={setFullName} 
              placeholder="John Doe" 
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput 
              style={styles.input} 
              value={username} 
              onChangeText={setUsername} 
              autoCapitalize="none" 
              placeholder="johndoe123"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput 
              style={styles.input} 
              value={phone} 
              onChangeText={setPhone} 
              placeholder="+1 234 567 8900" 
              keyboardType="phone-pad" 
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              value={bio} 
              onChangeText={setBio} 
              multiline 
              numberOfLines={3}
              placeholder="Tell us about yourself..." 
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={saveAllChanges} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', paddingTop: 60, paddingHorizontal: 20 },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 25, color: '#000', alignSelf: 'flex-start' },
  subHeader: { fontSize: 13, color: '#888', marginBottom: 30, marginTop: 8 },
  
  avatarContainer: { position: 'relative', marginBottom: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E1E1E1' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  
  changeAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },

  applicationButton: { 
    flexDirection: 'row', 
    backgroundColor: '#5856D6', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    width: '100%',
    marginBottom: 25,
    gap: 12,
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4
  },
  applicationButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },

  formContainer: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, color: '#666', marginBottom: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#E5E5EA', color: '#000' },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 15 },
  
  primaryButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, width: '100%' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  signOutButton: { marginTop: 20, padding: 16, width: '100%', alignItems: 'center' },
  signOutText: { color: '#FF3B30', fontSize: 16, fontWeight: '600' }
});
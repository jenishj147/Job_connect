import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const isMounted = useRef(true);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [session, setSession] = useState(null);
  
  // Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    isMounted.current = true;
    
    // Get Session & Profile
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted.current) {
        setSession(session);
        if (session) getProfile(session);
      }
    });

    return () => { isMounted.current = false; };
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

      if (data && isMounted.current) {
        setUsername(data.username || '');
        setWebsite(data.website || '');
        setAvatarUrl(data.avatar_url || null);
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setBio(data.bio || '');
      }
    } catch (error) {
      if (isMounted.current) Alert.alert('Error', error.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }

  async function pickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Optimize size for faster uploads
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        await uploadImage(image.uri);
      }
    } catch (error) {
      Alert.alert('Selection Error', error.message);
    }
  }

  async function uploadImage(uri) {
    if (!session?.user) return;
    
    try {
      setUploading(true);

      // 1. Fetch file from local device
      const response = await fetch(uri);
      const blob = await response.blob();

      // 2. Construct filename
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpeg';
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 3. Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 4. Get Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      if (isMounted.current) {
        setAvatarUrl(data.publicUrl);
      }

    } catch (error) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      if (isMounted.current) setUploading(false);
    }
  }

  async function saveAllChanges() {
    if (!session?.user) return;

    try {
      setLoading(true);
      const updates = {
        id: session.user.id,
        username,
        website,
        avatar_url: avatarUrl,
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
      if (isMounted.current) setLoading(false);
    }
  }

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive", 
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) Alert.alert("Error", error.message);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={{ paddingBottom: 40, alignItems: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.header}>Settings</Text>

          {/* AVATAR SECTION */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <FontAwesome name="user" size={50} color="#ccc" />
                </View>
              )}
              
              {/* Overlay Loader while uploading */}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="white" />
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={styles.changeAvatarButton} 
              onPress={pickImage} 
              disabled={uploading}
            >
              <FontAwesome name="camera" size={16} color="white" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subHeader}>
            {uploading ? "Uploading..." : "Tap camera to change photo"}
          </Text>

          {/* QUICK LINKS */}
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => router.push('/my-applications')}
          >
            <View style={styles.iconCircle}>
               <FontAwesome name="list-alt" size={18} color="white" />
            </View>
            <Text style={styles.actionCardText}>My Applications</Text>
            <FontAwesome name="chevron-right" size={14} color="#C7C7CC" />
          </TouchableOpacity>

          {/* FORM INPUTS */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput 
                style={styles.input} 
                value={fullName} 
                onChangeText={setFullName} 
                placeholder="John Doe" 
                placeholderTextColor="#C7C7CC"
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
                placeholderTextColor="#C7C7CC"
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
                placeholderTextColor="#C7C7CC"
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
                placeholderTextColor="#C7C7CC"
              />
            </View>
          </View>

          {/* BUTTONS */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={saveAllChanges} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutText}>Log Out</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { fontSize: 34, fontWeight: 'bold', marginTop: 20, marginBottom: 20, color: '#000' },
  subHeader: { fontSize: 13, color: '#8E8E93', marginBottom: 25, marginTop: 10 },
  
  // Avatar
  avatarWrapper: { position: 'relative', alignItems: 'center' },
  avatarContainer: { 
    shadowColor: '#000', 
    shadowOpacity: 0.15, 
    shadowRadius: 10, 
    elevation: 5,
    borderRadius: 60 
  },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E1E1E1' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7', borderWidth: 2, borderColor: '#FFF' },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center'
  },
  changeAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 110, // Adjusted to sit nicely next to avatar
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 6
  },

  // Action Card (My Apps)
  actionCard: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    width: '100%',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#5856D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  actionCardText: { flex: 1, color: '#1C1C1E', fontSize: 16, fontWeight: '600' },

  // Form
  formSection: { width: '100%' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: '#1C1C1E' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, color: '#666', marginBottom: 6, fontWeight: '600', textTransform: 'uppercase' },
  input: { 
    backgroundColor: 'white', 
    padding: 16, 
    borderRadius: 12, 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: '#E5E5EA', 
    color: '#000' 
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  // Buttons
  buttonContainer: { width: '100%', marginTop: 20 },
  primaryButton: { 
    backgroundColor: '#007AFF', 
    padding: 16, 
    borderRadius: 14, 
    alignItems: 'center', 
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  primaryButtonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  signOutButton: { marginTop: 20, padding: 15, alignItems: 'center' },
  signOutText: { color: '#FF3B30', fontSize: 16, fontWeight: '600' }
});
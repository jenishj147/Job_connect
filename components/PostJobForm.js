import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard } from 'react-native';
import * as Location from 'expo-location';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '../supabase';

export default function PostJobForm({ onJobPosted, initialValues = null, onCancelEdit }) {
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (initialValues) {
      setNewTitle(initialValues.title);
      setNewAmount(initialValues.amount);
    } else {
      setNewTitle('');
      setNewAmount('');
    }
  }, [initialValues]);

  async function saveJob() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return Alert.alert("Error", "Please log in first.");

    if (!newTitle.trim() || !newAmount.trim()) {
      return Alert.alert("Missing Info", "Please enter a title and amount.");
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      if (initialValues) {
        // --- UPDATE MODE ---
        const { error } = await supabase
          .from('jobs')
          .update({
            title: newTitle,
            amount: newAmount,
            // We usually don't update location on simple edit, or we could ask again.
            // For now, let's keep it simple.
          })
          .eq('id', initialValues.id)
          .eq('user_id', session.user.id); // Security check

        if (error) throw error;
        Alert.alert("Success", "Job updated!");

      } else {
        // --- CREATE MODE ---
        // 1. Get Location
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Location is required to post a job.');
          setLoading(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

        // 2. Insert Data
        const { error } = await supabase.from('jobs').insert([{
          title: newTitle,
          amount: newAmount,
          user_id: session.user.id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          status: 'OPEN',
          created_at: new Date()
        }]);

        if (error) throw error;
        Alert.alert("Success", "Job posted successfully!");
      }

      setNewTitle('');
      setNewAmount('');

      // Callback to parent to refresh the list and clear edit state
      if (onJobPosted) onJobPosted();

    } catch (error) {
      Alert.alert("Operation Failed", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.formCard}>
      <View style={styles.formHeader}>
        <FontAwesome name={initialValues ? "pencil" : "plus-circle"} size={18} color="#007AFF" />
        <Text style={styles.sectionTitle}>
          {initialValues ? "Edit Job" : "Post New Job"}
        </Text>
        {initialValues && (
          <TouchableOpacity onPress={onCancelEdit} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.input}
        placeholder="What needs doing? (e.g. Move furniture)"
        value={newTitle}
        onChangeText={setNewTitle}
        placeholderTextColor="#999"
      />

      {/* Amount Input with Overlay Symbol */}
      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={[styles.input, styles.amountInput]}
          placeholder="0.00"
          value={newAmount}
          onChangeText={setNewAmount}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
      </View>

      <TouchableOpacity style={styles.postBtn} onPress={saveJob} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.postBtnText}>
            {initialValues ? "Update Job" : "Post Job Now"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', flex: 1 },
  cancelBtn: { padding: 5 },
  cancelText: { color: '#FF3B30', fontSize: 14 },

  input: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    color: '#000'
  },

  // Amount Input Specifics
  amountContainer: { position: 'relative', marginBottom: 12 },
  amountInput: { paddingLeft: 35, marginBottom: 0 },
  currencySymbol: {
    position: 'absolute',
    left: 15,
    top: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    zIndex: 1
  },

  postBtn: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4
  },
  postBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

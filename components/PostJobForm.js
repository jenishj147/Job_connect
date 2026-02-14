import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../supabase';

export default function PostJobForm({ onJobPosted, initialValues, onCancelEdit }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [location, setLocation] = useState(''); 
  
  // Date State
  const [jobDate, setJobDate] = useState('');        
  const [dateObject, setDateObject] = useState(new Date()); 
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [startTime, setStartTime] = useState(''); 
  const [endTime, setEndTime] = useState('');     
  const [hasFood, setHasFood] = useState(false);  
  const [dressCode, setDressCode] = useState('Casual'); 

  // Handle Edit Mode
  useEffect(() => {
    if (initialValues) {
      setTitle(initialValues.title);
      setAmount(initialValues.amount ? initialValues.amount.toString() : '');
      setLocation(initialValues.location || '');
      setJobDate(initialValues.job_date || '');   
      setStartTime(initialValues.shift_start || '');
      setEndTime(initialValues.shift_end || '');
      setHasFood(initialValues.has_food || false);
      setDressCode(initialValues.dress_code || 'Casual');
      setModalVisible(true);
    }
  }, [initialValues]);

  // Handle Date Change (Mobile Only)
  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateObject(selectedDate);
      setJobDate(selectedDate.toDateString()); // e.g. "Fri Oct 13 2023"
    }
  };

  async function handleSubmit() {
    if (!title || !amount || !location || !jobDate || !startTime) {
      Alert.alert("Missing Info", "Please fill in Title, Amount, Location, Date, and Timing.");
      return;
    }

    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      Alert.alert("Error", "Please log in first.");
      setLoading(false);
      return;
    }

    const jobData = {
      title,
      amount: parseInt(amount),
      user_id: user.id,
      location,
      job_date: jobDate,      
      shift_start: startTime, 
      shift_end: endTime,     
      has_food: hasFood,      
      dress_code: dressCode   
    };

    let error;

    if (initialValues) {
      const { error: updateErr } = await supabase
        .from('jobs')
        .update(jobData)
        .eq('id', initialValues.id);
      error = updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from('jobs')
        .insert(jobData);
      error = insertErr;
    }

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setModalVisible(false);
      resetForm();
      if (onJobPosted) onJobPosted();
    }
  }

  function resetForm() {
    setTitle(''); setAmount(''); setLocation(''); setJobDate('');
    setStartTime(''); setEndTime(''); 
    setHasFood(false); setDressCode('Casual');
    if (onCancelEdit) onCancelEdit();
  }

  return (
    <View style={styles.container}>
      {!modalVisible && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <FontAwesome name="plus" size={20} color="white" style={{ marginRight: 10 }} />
          <Text style={styles.fabText}>Post a Job</Text>
        </TouchableOpacity>
      )}

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{initialValues ? "Edit Job" : "Post New Job"}</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                  <FontAwesome name="close" size={24} color="#999" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Job Title</Text>
              <TextInput style={styles.input} placeholder="e.g. Catering Helper" value={title} onChangeText={setTitle} />

              <Text style={styles.label}>Pay Amount (₹)</Text>
              <TextInput style={styles.input} placeholder="e.g. 500" keyboardType="numeric" value={amount} onChangeText={setAmount} />

              <Text style={styles.label}>Location</Text>
              <TextInput style={styles.input} placeholder="e.g. 123 Main St, Chennai" value={location} onChangeText={setLocation} />

              {/* 🟢 HYBRID DATE INPUT: Logic split based on Platform */}
              <Text style={styles.label}>Work Date</Text>
              
              {Platform.OS === 'web' ? (
                // 🌐 WEB VIEW: Simple Text Input (Reliable)
                <TextInput 
                    style={styles.input} 
                    placeholder="e.g. 25 Oct 2024" 
                    value={jobDate} 
                    onChangeText={setJobDate} 
                />
              ) : (
                // 📱 MOBILE VIEW: Calendar Picker (Fancy)
                <View>
                    <TouchableOpacity 
                        style={styles.dateInput} 
                        onPress={() => setShowDatePicker(true)}
                    >
                        <FontAwesome name="calendar" size={18} color="#007AFF" style={{ marginRight: 10 }} />
                        <Text style={{ color: jobDate ? '#000' : '#999', fontSize: 16 }}>
                        {jobDate || "Select Date"}
                        </Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                        value={dateObject}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        minimumDate={new Date()} 
                        />
                    )}
                    
                    {/* iOS Close Button */}
                    {Platform.OS === 'ios' && showDatePicker && (
                        <TouchableOpacity 
                            style={styles.iosCloseBtn} 
                            onPress={() => setShowDatePicker(false)}
                        >
                            <Text style={{color: 'white', fontWeight: 'bold'}}>Confirm Date</Text>
                        </TouchableOpacity>
                    )}
                </View>
              )}

              {/* Timing */}
              <Text style={styles.label}>Shift Timing</Text>
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="Start (9 AM)" value={startTime} onChangeText={setStartTime} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="End (5 PM)" value={endTime} onChangeText={setEndTime} />
              </View>

              {/* Food & Dress */}
              <TouchableOpacity onPress={() => setHasFood(!hasFood)} style={styles.checkRow}>
                <FontAwesome name={hasFood ? "check-square" : "square-o"} size={24} color="#007AFF" />
                <Text style={styles.checkLabel}>Food Provided?</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Dress Code</Text>
              <View style={styles.dressRow}>
                <TouchableOpacity onPress={() => setDressCode('Casual')} style={[styles.dressBtn, dressCode === 'Casual' && styles.dressBtnActive]}>
                  <Text style={[styles.dressText, dressCode === 'Casual' && styles.dressTextActive]}>Casual</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDressCode('Formal')} style={[styles.dressBtn, dressCode === 'Formal' && styles.dressBtnActive]}>
                  <Text style={[styles.dressText, dressCode === 'Formal' && styles.dressTextActive]}>Formal</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : (
                  <Text style={styles.submitText}>{initialValues ? "Update Job" : "Post Job"}</Text>
                )}
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  fab: { backgroundColor: '#007AFF', flexDirection: 'row', padding: 15, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  fabText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 5, color: '#555', marginTop: 10 },
  input: { backgroundColor: '#f2f2f7', padding: 12, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#e1e1e1' },
  
  // Date Button
  dateInput: { 
    backgroundColor: '#E1F5FE', 
    padding: 12, 
    borderRadius: 10, 
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  iosCloseBtn: {
      backgroundColor: '#007AFF', 
      padding: 10, 
      alignItems: 'center', 
      borderRadius: 10, 
      marginTop: 5
  },

  row: { flexDirection: 'row' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15, marginBottom: 5 },
  checkLabel: { marginLeft: 10, fontSize: 16 },
  dressRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  dressBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  dressBtnActive: { backgroundColor: '#E1F5FE', borderColor: '#007AFF' },
  dressText: { color: '#555', fontWeight: 'bold' },
  dressTextActive: { color: '#007AFF' },
  submitBtn: { backgroundColor: '#34C759', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 30, marginBottom: 40 },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});
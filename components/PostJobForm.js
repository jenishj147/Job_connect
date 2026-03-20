import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../supabase';

export default function PostJobForm({ onJobPosted, initialValues, onCancelEdit }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false); // Loading state for GPS

  // Form Fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [vacancies, setVacancies] = useState('1'); // 🟢 Vacancies State
  const [locationText, setLocationText] = useState('');
  
  // 🟢 Store Coordinates Separately
  const [coords, setCoords] = useState({ lat: null, long: null });

  // Date State
  const [dateObject, setDateObject] = useState(new Date()); 
  const [displayDate, setDisplayDate] = useState('');       
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hasFood, setHasFood] = useState(false);
  const [dressCode, setDressCode] = useState('Casual');

  // Handle Edit Mode
  useEffect(() => {
    if (initialValues) {
      setTitle(initialValues.title || '');
      setAmount(initialValues.amount ? initialValues.amount.toString() : '');
      setVacancies(initialValues.total_vacancies ? initialValues.total_vacancies.toString() : '1'); // 🟢 Load Vacancies
      setLocationText(initialValues.location || '');
      
      // Load existing coords if editing
      setCoords({
        lat: initialValues.latitude || null,
        long: initialValues.longitude || null
      });

      if (initialValues.job_date) {
         const d = new Date(initialValues.job_date);
         setDateObject(d);
         setDisplayDate(d.toDateString());
      }

      setStartTime(initialValues.shift_start || '');
      setEndTime(initialValues.shift_end || '');
      setHasFood(initialValues.has_food || false);
      setDressCode(initialValues.dress_code || 'Casual');
      setModalVisible(true);
    }
  }, [initialValues]);

  const formatDateForDB = (date) => {
     return date.toISOString().split('T')[0];
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateObject(selectedDate);
      setDisplayDate(selectedDate.toDateString());
    }
  };

  // 🟢 FEATURE: GET CURRENT GPS LOCATION
  const handleCurrentLocation = async () => {
    setLocLoading(true);
    try {
      // 1. Permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use this feature.');
        setLocLoading(false);
        return;
      }

      // 2. Get GPS Coords
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      // 3. Save to State
      setCoords({ lat: latitude, long: longitude });
      console.log("📍 GPS Fetched:", latitude, longitude);

      // 4. Reverse Geocode (Get Address from Coords)
      let addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (addressResponse.length > 0) {
        const addr = addressResponse[0];
        // Construct a readable address string
        const fullAddress = `${addr.street || ''} ${addr.city || ''}, ${addr.region || ''}`;
        setLocationText(fullAddress.trim());
      } else {
        setLocationText("Current Location");
      }

    } catch (error) {
      Alert.alert("Error", "Could not fetch location. Make sure GPS is on.");
      console.log(error);
    } finally {
      setLocLoading(false);
    }
  };

  // 🟢 SUBMIT
  async function handleSubmit() {
    if (!title || !amount || !locationText || !displayDate || !startTime) {
      Alert.alert("Missing Info", "Please fill in Title, Amount, Location, Date, and Start Time.");
      return;
    }

    setLoading(true);
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
            Alert.alert("Error", "Please log in first.");
            setLoading(false);
            return;
        }

        // 🟢 FINAL CHECK: If no GPS coords yet, try to geocode the text as fallback
        let finalLat = coords.lat;
        let finalLong = coords.long;

        if (!finalLat || !finalLong) {
            console.log("⚠️ No GPS data, attempting fallback geocoding...");
            let geocoded = await Location.geocodeAsync(locationText);
            if (geocoded.length > 0) {
                finalLat = geocoded[0].latitude;
                finalLong = geocoded[0].longitude;
            } else {
                // If even fallback fails, use a Default (e.g., Chennai) to prevent crash
                finalLat = 13.0827;
                finalLong = 80.2707;
            }
        }

        const jobData = {
            title,
            amount: parseInt(amount) || 0,
            user_id: user.id,
            location: locationText, 
            latitude: finalLat,     // 🟢 SAVING GPS LAT
            longitude: finalLong,   // 🟢 SAVING GPS LONG
            job_date: formatDateForDB(dateObject),
            shift_start: startTime,
            shift_end: endTime,
            has_food: hasFood,
            dress_code: dressCode,
            total_vacancies: parseInt(vacancies) || 1, // 🟢 Save Vacancies to DB
            status: 'OPEN'
        };

        let error;

        if (initialValues?.id) {
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

        if (error) throw error;

        setModalVisible(false);
        resetForm();
        if (onJobPosted) onJobPosted();

    } catch (error) {
        Alert.alert("Database Error", error.message);
    } finally {
        setLoading(false);
    }
  }

  function resetForm() {
    setTitle(''); setAmount(''); setVacancies('1'); setLocationText(''); setDisplayDate('');
    setStartTime(''); setEndTime('');
    setCoords({ lat: null, long: null }); // Reset coords
    setDateObject(new Date());
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

      <Modal 
        animationType="slide" 
        transparent={true} 
        visible={modalVisible} 
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{initialValues ? "Edit Job" : "Post New Job"}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <FontAwesome name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
              
              <Text style={styles.label}>Job Title</Text>
              <TextInput style={styles.input} placeholder="e.g. Catering Helper" value={title} onChangeText={setTitle} />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Pay Amount (₹)</Text>
                  <TextInput style={styles.input} placeholder="e.g. 500" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                </View>
                
                {/* 🟢 Persons Required Input */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Persons Required</Text>
                  <TextInput style={styles.input} placeholder="e.g. 5" keyboardType="numeric" value={vacancies} onChangeText={setVacancies} />
                </View>
              </View>

              {/* 🟢 LOCATION SECTION WITH BUTTON */}
              <Text style={styles.label}>Location</Text>
              <View style={styles.locationRow}>
                  <TextInput 
                    style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                    placeholder="e.g. 123 Main St" 
                    value={locationText} 
                    onChangeText={setLocationText} 
                  />
                  <TouchableOpacity style={styles.gpsBtn} onPress={handleCurrentLocation} disabled={locLoading}>
                      {locLoading ? <ActivityIndicator color="white" size="small" /> : <FontAwesome name="crosshairs" size={20} color="white" />}
                  </TouchableOpacity>
              </View>
              {coords.lat && <Text style={{fontSize: 12, color: 'green', marginTop: 5}}>✅ GPS Coordinates Captured</Text>}

              <Text style={styles.label}>Work Date</Text>
              {Platform.OS === 'web' ? (
                <TextInput 
                    style={styles.input} 
                    placeholder="YYYY-MM-DD" 
                    value={displayDate} 
                    onChangeText={setDisplayDate} 
                />
              ) : (
                <View>
                    <TouchableOpacity 
                        style={styles.dateInput} 
                        onPress={() => setShowDatePicker(true)}
                    >
                        <FontAwesome name="calendar" size={18} color="#007AFF" style={{ marginRight: 10 }} />
                        <Text style={{ color: displayDate ? '#000' : '#999', fontSize: 16 }}>
                        {displayDate || "Select Date"}
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

              <Text style={styles.label}>Shift Timing</Text>
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="Start (9 AM)" value={startTime} onChangeText={setStartTime} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="End (5 PM)" value={endTime} onChangeText={setEndTime} />
              </View>

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
        </KeyboardAvoidingView>
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
  label: { fontSize: 14, fontWeight: '600', marginBottom: 5, color: '#555', marginTop: 15 },
  input: { backgroundColor: '#f2f2f7', padding: 12, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#e1e1e1' },
  
  // 🟢 NEW GPS BUTTON STYLES
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  gpsBtn: {
      backgroundColor: '#007AFF',
      padding: 12,
      borderRadius: 10,
      marginLeft: 10,
      justifyContent: 'center',
      alignItems: 'center',
      width: 50
  },

  dateInput: { backgroundColor: '#fff', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e1e1e1' },
  iosCloseBtn: { backgroundColor: '#007AFF', padding: 10, alignItems: 'center', borderRadius: 10, marginTop: 5, marginBottom: 10 },
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
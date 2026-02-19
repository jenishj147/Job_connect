import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 🟢 IMPORT CUSTOM COMPONENT
import JobCard from '../../components/JobCard';
import MapComponent from '../../components/MapComponent';
import { supabase } from '../../supabase';

// --- HELPER: Haversine Distance Formula ---
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

const deg2rad = (deg) => deg * (Math.PI / 180);

export default function FindWorkScreen() {
  const router = useRouter();
  
  // --- DATA STATE ---
  const [allJobs, setAllJobs] = useState([]); 
  const [filteredJobs, setFilteredJobs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- LOCATION STATE ---
  const [searchLocation, setSearchLocation] = useState({
    latitude: 37.78825, 
    longitude: -122.4324,
    address: 'Current Location',
    type: 'current' 
  });
  
  // --- MODAL STATES ---
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [modalView, setModalView] = useState('select'); // 'select', 'map', 'manual'
  const [manualAddress, setManualAddress] = useState('');
  
  // Map Region State
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // --- FILTER STATE ---
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeChip, setActiveChip] = useState('All'); 
  const [minPay, setMinPay] = useState('');
  const [foodOnly, setFoodOnly] = useState(false);
  const [sortBy, setSortBy] = useState('Newest'); 

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // 🟢 FIXED: Works on Web now
  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const msg = "Permission to access location was denied";
        Platform.OS === 'web' ? alert(msg) : Alert.alert("Permission Denied", msg);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      
      const newCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: 'Current Location',
        type: 'current'
      };

      setSearchLocation(newCoords);
      setMapRegion({
        ...mapRegion,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      fetchOpenJobs(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.log("Error getting location:", error);
      if (Platform.OS === 'web') alert("Could not fetch location. Please ensure location services are enabled in your browser.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOpenJobs(searchLocation.latitude, searchLocation.longitude);
    }, [searchLocation]) 
  );

  async function fetchOpenJobs(lat, long) {
    try {
      const userLat = lat || searchLocation.latitude;
      const userLong = long || searchLocation.longitude;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .rpc('get_nearby_jobs', { 
          user_lat: userLat, 
          user_long: userLong, 
          radius_km: 50 
        })
        .select(`*, profiles:user_id(username, full_name, avatar_url)`) 
        .eq('status', 'OPEN')
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const jobsWithDistance = data.map(job => ({
        ...job,
        distance: getDistance(userLat, userLong, job.latitude, job.longitude)
      }));

      setAllJobs(jobsWithDistance || []);
      applyFilters(jobsWithDistance, searchText, minPay, foodOnly, sortBy);

    } catch (error) {
      console.log("Error fetching jobs:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // --- LOCATION HANDLERS ---
  const onRegionChange = (region) => {
    setMapRegion(region);
  };

  const confirmMapLocation = () => {
    setSearchLocation({
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
        address: 'Custom Map Pin', 
        type: 'custom'
    });
    setShowLocationModal(false);
    setModalView('select');
    fetchOpenJobs(mapRegion.latitude, mapRegion.longitude);
  };

  const handleUseCurrentLocation = () => {
    setShowLocationModal(false);
    getCurrentLocation();
  };

  // 🟢 FIXED: Real Geocoding (No API Key Required)
  const handleManualSubmit = async () => {
      if(!manualAddress.trim()) return;
      setLoading(true);

      try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddress)}`
        );
        const data = await response.json();

        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);
            const displayName = result.display_name.split(',')[0];

            setSearchLocation({
                latitude: lat,
                longitude: lon,
                address: displayName, 
                type: 'custom'
            });

            setMapRegion({
                latitude: lat,
                longitude: lon,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            });

            setShowLocationModal(false);
            setModalView('select');
            setManualAddress(''); 
            fetchOpenJobs(lat, lon);

        } else {
            const msg = "Location not found. Try entering a city name.";
            Platform.OS === 'web' ? alert(msg) : Alert.alert("Not Found", msg);
        }
      } catch (error) {
          console.log("Geocoding error:", error);
      } finally {
          setLoading(false);
      }
  };

  // View Switchers
  const switchToMap = () => setModalView('map');
  const switchToManual = () => setModalView('manual');
  const backToMenu = () => setModalView('select');

  // --- FILTER LOGIC ---
  function applyFilters(sourceData = allJobs, text = searchText, pay = minPay, food = foodOnly, sort = sortBy) {
    let result = [...sourceData];

    if (text) {
      const lower = text.toLowerCase();
      result = result.filter(job => 
        (job.title && job.title.toLowerCase().includes(lower)) || 
        (job.location && job.location.toLowerCase().includes(lower))
      );
    }
    if (pay) {
      const minAmount = parseFloat(pay);
      if (!isNaN(minAmount)) result = result.filter(job => job.amount >= minAmount);
    }
    if (food) result = result.filter(job => job.has_food === true);

    if (sort === 'High Pay') result.sort((a, b) => b.amount - a.amount);
    else if (sort === 'Nearby') result.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    else result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredJobs(result);
  }

  // --- HANDLERS ---
  const handleSearchChange = (text) => { setSearchText(text); applyFilters(allJobs, text, minPay, foodOnly, sortBy); };
  const handleChipPress = (chip) => {
    setActiveChip(chip);
    let newSort = 'Newest';
    if (chip === 'High Pay') newSort = 'High Pay';
    if (chip === 'Nearby') newSort = 'Nearby';
    setSortBy(newSort);
    applyFilters(allJobs, searchText, minPay, foodOnly, newSort);
  };
  const applyAdvancedFilters = () => {
    setShowFilterModal(false);
    if (sortBy === 'High Pay') setActiveChip('High Pay');
    else if (sortBy === 'Nearby') setActiveChip('Nearby');
    else setActiveChip('All');
    applyFilters(allJobs, searchText, minPay, foodOnly, sortBy);
  };
  const clearFilters = () => {
    setMinPay(''); setFoodOnly(false); setSortBy('Newest'); setActiveChip('All'); setShowFilterModal(false);
    applyFilters(allJobs, searchText, '', false, 'Newest');
  };
  const onRefresh = () => { setRefreshing(true); fetchOpenJobs(searchLocation.latitude, searchLocation.longitude); };
  
  const FilterOption = ({ label, active, onPress }) => (
    <TouchableOpacity style={[styles.sortOption, active && styles.sortOptionActive]} onPress={onPress}>
      <Text style={[styles.sortText, active && styles.sortTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.locationRow} onPress={() => { setModalView('select'); setShowLocationModal(true); }}>
            <FontAwesome name="map-marker" size={16} color={searchLocation.type === 'custom' ? "#E65100" : "#007AFF"} />
            <Text style={styles.locationText} numberOfLines={1}>
                {searchLocation.type === 'current' ? 'Current Location' : searchLocation.address}
            </Text>
            <FontAwesome name="chevron-down" size={12} color="#666" style={{marginLeft: 5}} />
        </TouchableOpacity>

        <Text style={styles.title}>Find Work</Text>

        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={20} color="#999" style={{marginLeft: 10}} />
          <TextInput style={styles.searchInput} placeholder="Search jobs..." placeholderTextColor="#999" value={searchText} onChangeText={handleSearchChange} />
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
             <FontAwesome name="sliders" size={20} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.chipContainer}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10}}>
                {['All', 'Nearby', 'High Pay', 'Recent'].map((chip) => (
                    <TouchableOpacity key={chip} style={[styles.chip, activeChip === chip && styles.chipActive]} onPress={() => handleChipPress(chip)}>
                        <Text style={[styles.chipText, activeChip === chip && styles.chipTextActive]}>{chip}</Text>
                    </TouchableOpacity>
                ))}
             </ScrollView>
        </View>
        <Text style={styles.resultCount}>Showing {filteredJobs.length} jobs within 50km</Text>
      </View>

      {/* JOB LIST */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={{marginBottom: 15}}>
                <JobCard
                  title={item.title}
                  amount={item.amount}
                  jobData={item}        
                  profile={item.profiles} 
                  isOwner={false}       
                  onPress={() => router.push({ pathname: "/job/[id]", params: { id: item.id } })}
                  distance={item.distance} 
                />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FontAwesome name="search" size={50} color="#eee" />
              <Text style={styles.emptyText}>No jobs found nearby.</Text>
              <TouchableOpacity onPress={clearFilters} style={{marginTop: 10}}>
                  <Text style={{color:'#007AFF', fontWeight:'bold'}}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* FILTER MODAL */}
      <Modal animationType="slide" transparent={true} visible={showFilterModal} onRequestClose={() => setShowFilterModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
            <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter & Sort</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}><FontAwesome name="close" size={20} color="#666" /></TouchableOpacity>
                </View>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>Sort By</Text>
                <View style={styles.optionsRow}>
                <FilterOption label="Newest" active={sortBy === 'Newest'} onPress={() => setSortBy('Newest')} />
                <FilterOption label="High Pay" active={sortBy === 'High Pay'} onPress={() => setSortBy('High Pay')} />
                <FilterOption label="Nearby" active={sortBy === 'Nearby'} onPress={() => setSortBy('Nearby')} />
                </View>
                <Text style={styles.sectionLabel}>Minimum Pay (₹)</Text>
                <TextInput style={styles.inputBox} placeholder="e.g. 500" keyboardType="numeric" returnKeyType="done" value={minPay} onChangeText={setMinPay} />
                <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Food Provided Only</Text>
                <Switch trackColor={{ false: "#767577", true: "#81b0ff" }} thumbColor={foodOnly ? "#007AFF" : "#f4f3f4"} onValueChange={() => setFoodOnly(!foodOnly)} value={foodOnly} />
                </View>
                <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.clearButton} onPress={clearFilters}><Text style={styles.clearText}>Reset</Text></TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={applyAdvancedFilters}><Text style={styles.applyText}>Apply Filters</Text></TouchableOpacity>
                </View>
            </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* LOCATION MODAL */}
      <Modal 
        animationType={modalView === 'map' ? 'slide' : 'fade'} 
        transparent={true} 
        visible={showLocationModal} 
        onRequestClose={() => setShowLocationModal(false)}
      >
        {modalView === 'select' && (
             <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, {height: 'auto', paddingBottom: 40}]}>
                    <Text style={styles.modalTitle}>Choose Location</Text>
                    <Text style={{color:'#666', marginBottom: 20}}>Show jobs within 50km of:</Text>

                    <TouchableOpacity style={[styles.locationOption, searchLocation.type === 'current' && styles.locationOptionActive]} onPress={handleUseCurrentLocation}>
                        <FontAwesome name="location-arrow" size={20} color="#007AFF" />
                        <Text style={styles.locationOptionText}>Use My Current Location</Text>
                    </TouchableOpacity>

                    <View style={{flexDirection:'row', alignItems:'center', marginVertical: 15}}>
                        <View style={{height:1, backgroundColor:'#eee', flex:1}} />
                        <Text style={{marginHorizontal:10, color:'#999'}}>OR</Text>
                        <View style={{height:1, backgroundColor:'#eee', flex:1}} />
                    </View>

                    <TouchableOpacity style={[styles.locationOption, searchLocation.type === 'custom' && styles.locationOptionActive]} onPress={switchToMap}>
                        <FontAwesome name="map" size={18} color="#E65100" />
                        <Text style={styles.locationOptionText}>Pick on Map</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.locationOption, {marginTop: 10}]} onPress={switchToManual}>
                        <FontAwesome name="pencil" size={18} color="#333" />
                        <Text style={styles.locationOptionText}>Enter Location Manually</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={{marginTop: 20, alignSelf:'center'}} onPress={() => setShowLocationModal(false)}>
                        <Text style={{color:'#666'}}>Cancel</Text>
                    </TouchableOpacity>
                </View>
             </View>
        )}

        {modalView === 'map' && (
            <View style={{flex: 1, backgroundColor: 'white'}}>
                 <MapComponent
                    style={{flex: 1}}
                    initialRegion={mapRegion}
                    onRegionChangeComplete={onRegionChange}
                    showsUserLocation={true}
                />
                {Platform.OS !== 'web' && (
                  <View style={styles.mapCenterMarker}>
                      <FontAwesome name="map-marker" size={40} color="#E65100" />
                  </View>
                )}
                <TouchableOpacity style={styles.mapBackButton} onPress={backToMenu}>
                    <FontAwesome name="arrow-left" size={20} color="#333" />
                </TouchableOpacity>
                <View style={styles.mapFooter}>
                    <Text style={{textAlign:'center', marginBottom: 10, color: '#666'}}>
                       {Platform.OS === 'web' ? 'Map pin selection' : 'Move map to adjust location'}
                    </Text>
                    <TouchableOpacity 
                      style={styles.confirmLocationBtn} 
                      onPress={confirmMapLocation}
                    >
                        <Text style={styles.confirmLocationText}>Confirm Location</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )}

        {modalView === 'manual' && (
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{width:'100%'}}>
                <View style={[styles.modalContent, {paddingBottom: 40}]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={backToMenu} style={{paddingRight: 10}}>
                            <FontAwesome name="arrow-left" size={20} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Enter Location</Text>
                        <View style={{width: 20}} /> 
                    </View>
                    <TextInput 
                        style={styles.inputBox}
                        placeholder="e.g. Chennai, Anna Nagar"
                        value={manualAddress}
                        onChangeText={setManualAddress}
                        autoFocus={true}
                    />
                    <TouchableOpacity style={[styles.applyButton, {marginTop: 20}]} onPress={handleManualSubmit}>
                        <Text style={styles.applyText}>Set Location</Text>
                    </TouchableOpacity>
                </View>
                </KeyboardAvoidingView>
            </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: 'white', paddingHorizontal: 20, paddingBottom: 15, paddingTop: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5, zIndex: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, alignSelf: 'flex-start', paddingVertical: 5 },
  locationText: { color: '#333', fontWeight: '600', marginLeft: 6, fontSize: 14, maxWidth: 200 },
  title: { fontSize: 26, fontWeight: '800', color: '#000', marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 12, height: 50, marginBottom: 15 },
  searchInput: { flex: 1, fontSize: 16, color: '#000', marginLeft: 10, height: '100%' },
  filterBtn: { padding: 10, paddingHorizontal: 15, borderLeftWidth: 1, borderLeftColor: '#E5E5EA' },
  chipContainer: { flexDirection: 'row', marginBottom: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#E1F5FE', borderColor: '#007AFF' },
  chipText: { color: '#666', fontWeight: '600' },
  chipTextActive: { color: '#007AFF' },
  resultCount: { fontSize: 12, color: '#666', fontWeight: '500', marginLeft: 5 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#999', fontSize: 16, fontWeight: '500', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
  sectionLabel: { fontSize: 16, fontWeight: '600', marginTop: 15, marginBottom: 10, color: '#333' },
  optionsRow: { flexDirection: 'row', gap: 10 },
  sortOption: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#DDD' },
  sortOptionActive: { backgroundColor: '#E3F2FD', borderColor: '#007AFF' },
  sortText: { color: '#666' },
  sortTextActive: { color: '#007AFF', fontWeight: 'bold' },
  inputBox: { borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#F9F9F9' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  toggleLabel: { fontSize: 16, fontWeight: '600' },
  modalFooter: { flexDirection: 'row', gap: 15, marginTop: 10 },
  clearButton: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 12, backgroundColor: '#F2F2F7' },
  clearText: { color: '#FF3B30', fontWeight: 'bold' },
  applyButton: { flex: 2, padding: 15, alignItems: 'center', borderRadius: 12, backgroundColor: '#007AFF' },
  applyText: { color: 'white', fontWeight: 'bold' },
  locationOption: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, backgroundColor: '#F2F2F7', gap: 10 },
  locationOptionActive: { backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#007AFF' },
  locationOptionText: { fontSize: 16, fontWeight: '600', color: '#333' },
  mapCenterMarker: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -40, zIndex: 10 },
  mapBackButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'white', padding: 10, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, elevation: 3 },
  mapFooter: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'white', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.1, elevation: 5 },
  confirmLocationBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center' },
  confirmLocationText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
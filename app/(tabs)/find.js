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
  ScrollView // Added ScrollView for chips
  ,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import JobCard from '../../components/JobCard';
import { supabase } from '../../supabase';

export default function FindWorkScreen() {
  const router = useRouter();
  
  // --- DATA STATE ---
  const [allJobs, setAllJobs] = useState([]); 
  const [filteredJobs, setFilteredJobs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // --- FILTER STATE ---
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Active Chip State
  const [activeChip, setActiveChip] = useState('All'); 

  // Advanced Filters
  const [minPay, setMinPay] = useState('');
  const [foodOnly, setFoodOnly] = useState(false);
  const [sortBy, setSortBy] = useState('Newest'); 

  // 1. Get User Location
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    })();
  }, []);

  // 2. Fetch Jobs
  useFocusEffect(
    useCallback(() => {
      fetchOpenJobs();
    }, [])
  );

  async function fetchOpenJobs() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('jobs')
        .select(`*, profiles:user_id(username, full_name, avatar_url)`)
        .eq('status', 'OPEN')
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const jobsWithDistance = data.map(job => ({
        ...job,
        distance: (Math.random() * 10).toFixed(1)
      }));

      setAllJobs(jobsWithDistance || []);
      // Apply filters with current state
      applyFilters(jobsWithDistance, searchText, minPay, foodOnly, sortBy);

    } catch (error) {
      console.log("Error fetching jobs:", error.message);
      Alert.alert("Error", "Could not fetch jobs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // 3. MASTER FILTER FUNCTION
  function applyFilters(
    sourceData = allJobs, 
    text = searchText, 
    pay = minPay, 
    food = foodOnly, 
    sort = sortBy
  ) {
    let result = [...sourceData];

    // A. Text Search
    if (text) {
      const lower = text.toLowerCase();
      result = result.filter(job => 
        (job.title && job.title.toLowerCase().includes(lower)) || 
        (job.location && job.location.toLowerCase().includes(lower))
      );
    }

    // B. Min Pay
    if (pay) {
      const minAmount = parseFloat(pay);
      if (!isNaN(minAmount)) {
        result = result.filter(job => job.amount >= minAmount);
      }
    }

    // C. Food
    if (food) {
      result = result.filter(job => job.has_food === true);
    }

    // D. Sorting
    if (sort === 'High Pay') {
      result.sort((a, b) => b.amount - a.amount);
    } else if (sort === 'Nearby') {
      result.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    } else {
      // Newest (Default)
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setFilteredJobs(result);
  }

  // --- HANDLERS ---
  const handleSearchChange = (text) => {
    setSearchText(text);
    applyFilters(allJobs, text, minPay, foodOnly, sortBy);
  };

  const handleChipPress = (chip) => {
    setActiveChip(chip);
    
    // Update sort based on chip
    let newSort = 'Newest';
    if (chip === 'High Pay') newSort = 'High Pay';
    if (chip === 'Nearby') newSort = 'Nearby';
    
    setSortBy(newSort);
    applyFilters(allJobs, searchText, minPay, foodOnly, newSort);
  };

  const applyAdvancedFilters = () => {
    setShowFilterModal(false);
    
    // Sync chip state if possible
    if (sortBy === 'High Pay') setActiveChip('High Pay');
    else if (sortBy === 'Nearby') setActiveChip('Nearby');
    else setActiveChip('All');

    applyFilters(allJobs, searchText, minPay, foodOnly, sortBy);
  };

  const clearFilters = () => {
    setMinPay('');
    setFoodOnly(false);
    setSortBy('Newest');
    setActiveChip('All');
    setShowFilterModal(false);
    applyFilters(allJobs, searchText, '', false, 'Newest');
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOpenJobs();
  };

  const FilterOption = ({ label, active, onPress }) => (
    <TouchableOpacity 
      style={[styles.sortOption, active && styles.sortOptionActive]} 
      onPress={onPress}
    >
      <Text style={[styles.sortText, active && styles.sortTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* 🟢 1. Header Area */}
      <View style={styles.header}>
        <View style={styles.locationRow}>
            <FontAwesome name="map-marker" size={16} color="#007AFF" />
            <Text style={styles.locationText}>Current Location</Text>
            <FontAwesome name="chevron-down" size={12} color="#666" style={{marginLeft: 5}} />
        </View>
        <Text style={styles.title}>Find Work</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={20} color="#999" style={{marginLeft: 10}} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={handleSearchChange}
          />
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
             <FontAwesome name="sliders" size={20} color="#333" />
          </TouchableOpacity>
        </View>

        {/* 🟢 RESTORED: Filter Chips */}
        <View style={styles.chipContainer}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10}}>
                {['All', 'Nearby', 'High Pay', 'Recent'].map((chip) => (
                    <TouchableOpacity 
                        key={chip} 
                        style={[styles.chip, activeChip === chip && styles.chipActive]}
                        onPress={() => handleChipPress(chip)}
                    >
                        <Text style={[styles.chipText, activeChip === chip && styles.chipTextActive]}>
                            {chip}
                        </Text>
                    </TouchableOpacity>
                ))}
             </ScrollView>
        </View>

        <Text style={styles.resultCount}>Showing {filteredJobs.length} jobs</Text>
      </View>

      {/* 🟢 2. Job List */}
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
              <Text style={styles.emptyText}>No jobs match your filters.</Text>
              <TouchableOpacity onPress={clearFilters} style={{marginTop: 10}}>
                  <Text style={{color:'#007AFF', fontWeight:'bold'}}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* 🟢 3. Advanced Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{flex: 1}}
        >
            <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter & Sort</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                    <FontAwesome name="close" size={20} color="#666" />
                </TouchableOpacity>
                </View>
                
                <View style={styles.divider} />

                {/* Sort Section */}
                <Text style={styles.sectionLabel}>Sort By</Text>
                <View style={styles.optionsRow}>
                <FilterOption label="Newest" active={sortBy === 'Newest'} onPress={() => setSortBy('Newest')} />
                <FilterOption label="High Pay" active={sortBy === 'High Pay'} onPress={() => setSortBy('High Pay')} />
                <FilterOption label="Nearby" active={sortBy === 'Nearby'} onPress={() => setSortBy('Nearby')} />
                </View>

                {/* Min Pay Section */}
                <Text style={styles.sectionLabel}>Minimum Pay (₹)</Text>
                <TextInput 
                    style={styles.inputBox}
                    placeholder="e.g. 500"
                    keyboardType="numeric"
                    returnKeyType="done"
                    value={minPay}
                    onChangeText={setMinPay}
                />

                {/* Food Toggle */}
                <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Food Provided Only</Text>
                <Switch 
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={foodOnly ? "#007AFF" : "#f4f3f4"}
                    onValueChange={() => setFoodOnly(!foodOnly)}
                    value={foodOnly}
                />
                </View>

                {/* Action Buttons */}
                <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                    <Text style={styles.clearText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={applyAdvancedFilters}>
                    <Text style={styles.applyText}>Apply Filters</Text>
                </TouchableOpacity>
                </View>

            </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 10, 
    elevation: 5,
    zIndex: 10
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  locationText: { color: '#333', fontWeight: '600', marginLeft: 6, fontSize: 14 },
  title: { fontSize: 26, fontWeight: '800', color: '#000', marginBottom: 15 },
  
  // Search Bar
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', 
    borderRadius: 12, height: 50, marginBottom: 15
  },
  searchInput: { flex: 1, fontSize: 16, color: '#000', marginLeft: 10, height: '100%' },
  filterBtn: { padding: 10, paddingHorizontal: 15, borderLeftWidth: 1, borderLeftColor: '#E5E5EA' },
  
  // Chips
  chipContainer: { flexDirection: 'row', marginBottom: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#E1F5FE', borderColor: '#007AFF' },
  chipText: { color: '#666', fontWeight: '600' },
  chipTextActive: { color: '#007AFF' },

  resultCount: { fontSize: 12, color: '#666', fontWeight: '500', marginLeft: 5 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#999', fontSize: 16, fontWeight: '500', marginTop: 20 },

  // --- Modal Styles ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
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
});
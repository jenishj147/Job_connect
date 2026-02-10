import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from 'expo-router'; // 👈 IMPORT THIS
import { useCallback, useRef, useState } from 'react'; // Added useCallback, useRef
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../supabase';

export default function MyApplicationsScreen() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Memory Leak Protection
  const isMounted = useRef(true);

  // 2. Auto-Refresh Logic
  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      fetchApplications();

      return () => {
        isMounted.current = false; // Cleanup when screen loses focus
      };
    }, [])
  );

  async function fetchApplications() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 💡 NOTE: Ensure your database has a Foreign Key named 'user_id' 
      // in the 'jobs' table pointing to 'profiles'.
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id, 
          status, 
          created_at,
          jobs (
            title, 
            amount,
            profiles!user_id ( 
              phone, 
              full_name 
            )
          )
        `)
        .eq('applicant_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Only update state if screen is still mounted
      if (isMounted.current) {
        setApplications(data || []);
      }
    } catch (error) {
      if (isMounted.current) {
        Alert.alert("Error fetching applications", error.message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  const handleContact = async (type, phone) => {
    if (!phone) {
      return Alert.alert("No Phone Number", "The employer hasn't provided a contact number.");
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    
    // 3. Improved URL Schemes
    let url = '';
    if (type === 'call') {
      url = `tel:${cleanPhone}`;
    } else {
      // whatsapp:// is often more reliable on mobile than https://wa.me
      url = `whatsapp://send?phone=${cleanPhone}`; 
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback for WhatsApp if app not installed
        if (type === 'wa') {
           await Linking.openURL(`https://wa.me/${cleanPhone.replace('+', '')}`);
        } else {
           Alert.alert("Error", "Action not supported on this device.");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Could not open the application.");
    }
  };

  const renderItem = ({ item }) => {
    const job = item.jobs;
    const employer = job?.profiles;
    
    // Normalize status check (Supabase sometimes returns lowercase)
    const status = item.status?.toUpperCase();
    const isHired = status === 'APPROVED' || status === 'HIRED';

    if (!job) {
      return (
        <View style={[styles.card, { opacity: 0.6 }]}>
          <Text style={styles.jobTitle}>Job Post Unavailable</Text>
          <Text style={styles.statusText}>The employer removed this listing.</Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
            <Text style={styles.amountText}>
              Proposed Pay: <Text style={styles.amountValue}>${job.amount}</Text>
            </Text>
          </View>
          
          <View style={[styles.badge, isHired ? styles.bgSuccess : styles.bgPending]}>
            <Text style={styles.badgeText}>
              {isHired ? "HIRED ✅" : status || 'PENDING'}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>
          Applied on: {new Date(item.created_at).toLocaleDateString()}
        </Text>

        {isHired && (
          <View style={styles.contactSection}>
            <Text style={styles.contactLabel}>
              Contact {employer?.full_name ? employer.full_name.split(' ')[0] : 'Employer'}:
            </Text>
            <View style={styles.contactRow}>
              <TouchableOpacity 
                style={styles.callBtn} 
                onPress={() => handleContact('call', employer?.phone)}
              >
                <FontAwesome name="phone" size={16} color="white" />
                <Text style={styles.btnText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.waBtn} 
                onPress={() => handleContact('wa', employer?.phone)}
              >
                <FontAwesome name="whatsapp" size={18} color="white" />
                <Text style={styles.btnText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Applications</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => {
                setRefreshing(true);
                fetchApplications();
              }} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FontAwesome name="briefcase" size={50} color="#CCC" />
              <Text style={styles.emptyText}>You haven't applied for any jobs yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    paddingTop: 20, 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1C1C1E' },
  card: { 
    backgroundColor: 'white', 
    padding: 16, 
    marginHorizontal: 15, 
    marginTop: 15, 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  jobTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  amountText: { fontSize: 14, color: '#666' },
  amountValue: { fontWeight: '700', color: '#34C759' },
  dateText: { fontSize: 12, color: '#A0A0A0', marginTop: 10 },
  statusText: { color: '#888', marginTop: 5 },
  
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
  bgPending: { backgroundColor: '#FF9500' },
  bgSuccess: { backgroundColor: '#34C759' },
  
  contactSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  contactLabel: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 10 },
  contactRow: { flexDirection: 'row', gap: 10 },
  callBtn: { 
    flex: 1, 
    backgroundColor: '#007AFF', 
    height: 45, 
    borderRadius: 10, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8 
  },
  waBtn: { 
    flex: 1, 
    backgroundColor: '#25D366', 
    height: 45, 
    borderRadius: 10, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8 
  },
  btnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#8E8E93', marginTop: 15, fontSize: 16 }
});
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router'; // 🟢 Added useRouter
import { useCallback, useRef, useState } from 'react';
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
  const router = useRouter(); // 🟢 Used for navigating to job details
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

      // 3. Fetch Data (INCLUDING job status and id)
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id, 
          status, 
          created_at,
          job_id,
          jobs (
            id,
            title, 
            amount,
            status, 
            profiles:user_id ( 
              full_name,
              phone       
            )
          )
        `)
        .eq('applicant_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

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
      return Alert.alert("Unavailable", "The employer hasn't provided a contact number.");
    }

    // Clean the phone string (remove spaces, parentheses, dashes)
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    
    let url = '';
    if (type === 'call') {
      url = `tel:${cleanPhone}`;
    } else {
      url = `whatsapp://send?phone=${cleanPhone}`; 
    }

    try {
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
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
    const appStatus = item.status?.toUpperCase() || 'PENDING';
    const isHired = appStatus === 'ACCEPTED' || appStatus === 'HIRED';
    const isRejected = appStatus === 'REJECTED';

    // 🟢 SCENARIO 1: DELETED JOB (Job returns null because employer deleted it)
    if (!job) {
      return (
        <View style={[styles.card, { opacity: 0.5, backgroundColor: '#f0f0f0' }]}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.jobTitle, { color: '#888', textDecorationLine: 'line-through' }]} numberOfLines={1}>
                  Job Unavailable
                </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#888' }]}>
              <Text style={styles.badgeText}>DELETED</Text>
            </View>
          </View>
          <Text style={styles.statusText}>The employer removed this listing entirely.</Text>
        </View>
      );
    }

    const employer = job?.profiles; 
    const employerPhone = employer?.phone;
    const jobStatus = job.status?.toUpperCase() || 'OPEN';
    const isJobClosed = jobStatus === 'CLOSED';

    // Determine Application Badge Style
    let appBadgeStyle = styles.bgPending;
    let appBadgeText = 'PENDING';
    
    if (isHired) {
        appBadgeStyle = styles.bgSuccess;
        appBadgeText = 'HIRED ✅';
    } else if (isRejected) {
        appBadgeStyle = styles.bgRejected;
        appBadgeText = 'REJECTED';
    }

    // 🟢 SCENARIO 2 & 3: ACTIVE OR CLOSED JOB
    return (
      <TouchableOpacity 
        style={[styles.card, (isJobClosed || isRejected) && !isHired && { opacity: 0.75 }]}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: "/job/[id]", params: { id: job.id } })} // 🟢 Let user view the job
      >
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
            <Text style={styles.amountText}>
              Pay: <Text style={styles.amountValue}>₹{job.amount}</Text>
            </Text>
          </View>
          
          {/* Status Badges Group */}
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
              
              {/* 1. Application Status Badge */}
              <View style={[styles.badge, appBadgeStyle]}>
                <Text style={styles.badgeText}>{appBadgeText}</Text>
              </View>

              {/* 2. Job Closed Badge (Only show if the job is closed AND user is NOT hired) */}
              {isJobClosed && !isHired && !isRejected && (
                  <View style={[styles.badge, styles.bgClosed]}>
                    <Text style={styles.badgeText}>JOB FULL / CLOSED</Text>
                  </View>
              )}
          </View>
        </View>

        <Text style={styles.dateText}>
          Applied: {new Date(item.created_at).toLocaleDateString()}
        </Text>

        {/* Contact Buttons (Only visible if hired) */}
        {isHired && (
          <View style={styles.contactSection}>
            <Text style={styles.contactLabel}>
              Contact {employer?.full_name || 'Employer'}:
            </Text>
            
            <View style={styles.contactRow}>
              {/* Call Button */}
              <TouchableOpacity 
                style={styles.callBtn} 
                onPress={() => handleContact('call', employerPhone)}
              >
                <FontAwesome name="phone" size={16} color="white" />
                <Text style={styles.btnText}>Call</Text>
              </TouchableOpacity>

              {/* WhatsApp Button */}
              <TouchableOpacity 
                style={styles.waBtn} 
                onPress={() => handleContact('wa', employerPhone)}
              >
                <FontAwesome name="whatsapp" size={18} color="white" />
                <Text style={styles.btnText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
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
  statusText: { color: '#888', marginTop: 5, fontSize: 13 },
  
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
  bgPending: { backgroundColor: '#FF9500' },
  bgSuccess: { backgroundColor: '#34C759' },
  bgRejected: { backgroundColor: '#8E8E93' }, // 🟢 Added Rejected Style
  bgClosed: { backgroundColor: '#FF3B30' },  // 🟢 Added Closed Style
  
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

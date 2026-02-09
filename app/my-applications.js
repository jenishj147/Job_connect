import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  Linking, 
  Alert, 
  RefreshControl,
  SafeAreaView 
} from 'react-native';
import { supabase } from '../supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function MyApplicationsScreen() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch applications with nested Job and Employer (Profile) data
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
      setApplications(data || []);
    } catch (error) {
      Alert.alert("Error fetching applications", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleContact = async (type, phone) => {
    if (!phone) {
      return Alert.alert("No Phone Number", "The employer hasn't provided a contact number.");
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const url = type === 'call' 
      ? `tel:${cleanPhone}` 
      : `https://wa.me/${cleanPhone.replace('+', '')}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "This action is not supported on your device.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not open the application.");
    }
  };

  const renderItem = ({ item }) => {
    const job = item.jobs;
    const employer = job?.profiles;
    const isHired = item.status?.toUpperCase() === 'APPROVED' || item.status?.toUpperCase() === 'HIRED';

    // Handle case where a job might have been deleted
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
          <View style={{ flex: 1 }}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.amountText}>Proposed Pay: <Text style={{fontWeight: '700', color: '#34C759'}}>${job.amount}</Text></Text>
          </View>
          
          <View style={[styles.badge, isHired ? styles.bgSuccess : styles.bgPending]}>
            <Text style={styles.badgeText}>
              {isHired ? "HIRED ✅" : item.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>Applied on: {new Date(item.created_at).toLocaleDateString()}</Text>

        {isHired && (
          <View style={styles.contactSection}>
            <Text style={styles.contactLabel}>Contact {employer?.full_name || 'Employer'}:</Text>
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
  dateText: { fontSize: 12, color: '#A0A0A0', marginTop: 10 },
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
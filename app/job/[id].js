import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform // 👈 Import Platform
  ,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    if (id) {
      fetchData();
    }
  }, [id]);

  async function fetchData() {
    console.log("Loading Job ID:", id);

    // 1. Get Job Info
    const { data: jobData, error: jobError } = await supabase.from('jobs').select('*').eq('id', id).single();
    if (jobError) console.log("Job Error:", jobError);
    if (jobData) setJob(jobData);

    // 2. Get Applicants
    const { data: appData, error: appError } = await supabase
      .from('applications')
      .select('*, profiles(username, full_name, avatar_url)')
      .eq('job_id', id);

    if (appError) console.log("App Error:", appError);
    if (appData) setApplicants(appData);

    setLoading(false);
  }

  // 🟢 HELPER: The actual database logic
  async function executeHire(applicantId, applicationId) {
    setLoading(true);
    try {
      console.log("Starting Hire Process...");

      // 1. Mark Job as ACCEPTED
      const { error: jobErr } = await supabase
        .from('jobs')
        .update({ status: 'ACCEPTED', accepted_by: applicantId })
        .eq('id', id);

      if (jobErr) throw new Error("Failed to update job status: " + jobErr.message);

      // 2. Mark this application as APPROVED
      const { error: appErr } = await supabase
        .from('applications')
        .update({ status: 'APPROVED' })
        .eq('id', applicationId);

      if (appErr) throw new Error("Failed to approve application: " + appErr.message);

      // 3. REJECT all other applications for this job
      const { error: rejectErr } = await supabase
        .from('applications')
        .update({ status: 'REJECTED' })
        .eq('job_id', id)
        .neq('id', applicationId);

      if (rejectErr) console.error("Reject Error (Non-critical):", rejectErr);

      // Success Feedback
      if (Platform.OS !== 'web') {
          Alert.alert("Success", "Applicant hired!");
      } else {
          window.alert("Applicant hired successfully!");
      }
      
      router.back();
    } catch (error) {
      console.error("Hire Process Failed:", error);
      if (Platform.OS !== 'web') {
          Alert.alert("Error", error.message);
      } else {
          window.alert("Error: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  // 🟢 HANDLER: Checks platform and asks for confirmation
  function handleApprove(applicantId, applicationId) {
    const title = "Hire this person?";
    const msg = "This will reject all other applicants.";

    // 1. WEB LOGIC
    if (Platform.OS === 'web') {
      if (window.confirm(`${title} ${msg}`)) {
        executeHire(applicantId, applicationId);
      }
      return;
    }

    // 2. MOBILE LOGIC
    Alert.alert("Confirm Hire", msg, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Hire",
        onPress: () => executeHire(applicantId, applicationId)
      }
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 🟢 Main Content */}
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Applications</Text>
        </View>

        <FlatList
          data={applicants}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 50 }}
          
          // Job Info as Header of List (Scrolls with list)
          ListHeaderComponent={
            <>
                <View style={styles.jobCard}>
                <Text style={styles.jobTitle}>{job?.title || "Unknown Job"}</Text>
                <Text style={styles.jobPrice}>{job?.amount ? `$${job.amount}` : "N/A"}</Text>
                <View style={[styles.statusBadge, { backgroundColor: job?.status === 'OPEN' ? '#e1f5fe' : '#e0e0e0' }]}>
                    <Text style={{ color: job?.status === 'OPEN' ? '#0288d1' : '#616161', fontWeight: 'bold' }}>
                    {job?.status || 'LOADING'}
                    </Text>
                </View>
                </View>
                <Text style={styles.sectionTitle}>Applicants ({applicants.length})</Text>
            </>
          }

          renderItem={({ item }) => {
            const user = item.profiles || {};
            const name = user.full_name || user.username || "Unknown";

            return (
              <View style={styles.applicantCard}>
                <View style={styles.row}>
                  {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.placeholder}><FontAwesome name="user" size={20} color="#666" /></View>
                  )}
                  <View>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={[styles.date, {
                      color: item.status === 'APPROVED' ? 'green' : item.status === 'REJECTED' ? 'red' : '#888'
                    }]}>
                      Status: {item.status}
                    </Text>
                  </View>
                </View>

                {/* Only show Hire button if job is OPEN, app is PENDING, AND current user is OWNER */}
                {job?.status === 'OPEN' && item.status === 'PENDING' && session?.user?.id === job.user_id && (
                  <TouchableOpacity style={styles.hireBtn} onPress={() => handleApprove(item.applicant_id, item.id)}>
                    <Text style={styles.btnText}>Hire This Person</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 30, color: '#888' }}>
              No applicants yet.
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  jobCard: { backgroundColor: 'white', padding: 20, margin: 15, borderRadius: 10, elevation: 2 },
  jobTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  jobPrice: { fontSize: 18, color: '#34C759', fontWeight: 'bold' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 15, marginBottom: 10, color: '#555' },
  applicantCard: { backgroundColor: 'white', padding: 15, marginHorizontal: 15, marginBottom: 10, borderRadius: 10, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#eee' },
  placeholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  name: { fontSize: 16, fontWeight: 'bold' },
  date: { fontSize: 13, marginTop: 2 },
  hireBtn: { backgroundColor: '#007AFF', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' }
});
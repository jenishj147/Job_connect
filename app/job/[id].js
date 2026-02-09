import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
// Ensure this path matches your project structure. 
// If supabase.js is in the root, usage of '../../' is correct for 'app/job/[id].js'
import { supabase } from '../../supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    // We join with profiles to get the applicant's name and avatar
    const { data: appData, error: appError } = await supabase
      .from('applications')
      .select('*, profiles(username, full_name, avatar_url)') 
      .eq('job_id', id);

    if (appError) console.log("App Error:", appError);
    if (appData) setApplicants(appData);
    
    setLoading(false);
  }

  async function handleApprove(applicantId, applicationId) {
    Alert.alert("Confirm Hire", "Hire this person? This will reject all other applicants.", [
      { text: "Cancel" },
      { 
        text: "Yes, Hire", 
        onPress: async () => {
          setLoading(true);
          try {
            // 1. Mark Job as ACCEPTED
            const { error: jobErr } = await supabase
              .from('jobs')
              .update({ status: 'ACCEPTED', accepted_by: applicantId })
              .eq('id', id);
            if (jobErr) throw jobErr;

            // 2. Mark this application as APPROVED
            const { error: appErr } = await supabase
              .from('applications')
              .update({ status: 'APPROVED' })
              .eq('id', applicationId);
            if (appErr) throw appErr;

            // 3. REJECT all other applications for this job
            await supabase
              .from('applications')
              .update({ status: 'REJECTED' })
              .eq('job_id', id)
              .neq('id', applicationId);

            Alert.alert("Success", "Applicant hired!");
            router.back(); // Return to previous screen
          } catch (error) {
            Alert.alert("Error", error.message);
            setLoading(false);
          }
        }
      }
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Applications</Text>
        </View>

        {/* Job Card */}
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

        <FlatList
          data={applicants}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 50 }}
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

                {/* Only show Hire button if job is OPEN and this app is PENDING */}
                {job?.status === 'OPEN' && item.status === 'PENDING' && (
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
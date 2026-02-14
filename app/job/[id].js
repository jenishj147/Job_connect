import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking, // 👈 IMPORTED LINKING
    Platform,
    SafeAreaView,
    ScrollView,
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
  
  // Applicant State
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && id) {
          fetchData(id, session.user.id);
      }
    });
  }, [id]);

  async function fetchData(jobId, userId) {
    try {
        // 1. Get Job Info
        const { data: jobData, error: jobError } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', jobId) 
            .single();
        
        if (jobError) throw jobError;
        setJob(jobData);

        // 2. Logic Split: Owner vs Applicant
        if (jobData.user_id === userId) {
            // A. I AM THE OWNER -> Fetch Applicants
            const { data: appData } = await supabase
                .from('applications')
                .select('*, profiles(username, full_name, avatar_url)')
                .eq('job_id', jobId);
            setApplicants(appData || []);
        } else {
            // B. I AM AN APPLICANT -> Check if I applied
            const { data: myApp } = await supabase
                .from('applications')
                .select('*')
                .eq('job_id', jobId)
                .eq('applicant_id', userId)
                .single();
            
            if (myApp) setHasApplied(true);
        }

    } catch (error) {
        console.log("Fetch Error:", error.message);
    } finally {
        setLoading(false);
    }
  }

  // 🟢 NEW FUNCTION: Open Google Maps
  const openGoogleMaps = (location) => {
    if (!location) return;
    
    // Create a query URL for Google Maps
    const encodedLocation = encodeURIComponent(location);
    const url = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;

    Linking.openURL(url).catch(err => 
      Alert.alert("Error", "Could not open map.")
    );
  };

  // --- APPLICANT ACTION: Apply ---
  async function handleApply() {
    if (!session) return;
    setApplying(true);

    try {
        const { error } = await supabase
            .from('applications')
            .insert({
                job_id: id,
                applicant_id: session.user.id,
                status: 'PENDING'
            });

        if (error) throw error;

        setHasApplied(true);
        if (Platform.OS === 'web') {
            alert("Success: Application Sent!");
        } else {
            Alert.alert("Success", "Application Sent! The employer will be notified.");
        }
    } catch (error) {
        if (Platform.OS === 'web') {
            alert("Error: " + error.message);
        } else {
            Alert.alert("Error", "Could not apply: " + error.message);
        }
    } finally {
        setApplying(false);
    }
  }

  // --- OWNER ACTION: Hire Candidate ---
  async function handleHire(applicationId, applicantName) {
    
    const executeHireLogic = async () => {
        try {
            const { error } = await supabase
              .from('applications')
              .update({ status: 'ACCEPTED' })
              .eq('id', applicationId);

            if (error) throw error;

            setApplicants(prev => prev.map(app => 
              app.id === applicationId ? { ...app, status: 'ACCEPTED' } : app
            ));

            if (Platform.OS === 'web') {
                alert(`${applicantName} has been hired!`);
            } else {
                Alert.alert("Success", `${applicantName} has been hired!`);
            }
        } catch (err) {
            Alert.alert("Error", "Could not update status.");
        }
    };

    if (Platform.OS === 'web') {
        const confirmed = window.confirm(`Do you want to accept ${applicantName} for this job?`);
        if (confirmed) executeHireLogic();
    } else {
        Alert.alert(
            "Confirm Hire",
            `Do you want to accept ${applicantName} for this job?`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Yes, Hire", onPress: executeHireLogic }
            ]
        );
    }
  }

  const openChat = (targetUserId) => {
    if (!targetUserId) return;
    router.push({ pathname: "/chat/[id]", params: { id: targetUserId } });
  };

  if (loading) return <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 50}} />;
  if (!job) return <View style={styles.center}><Text>Job not found</Text></View>;

  const isOwner = session?.user?.id === job?.user_id;

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isOwner ? "Manage Job" : "Job Details"}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* 1. JOB CARD (Details) */}
        <View style={styles.jobCard}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobPrice}>₹{job.amount}</Text>
            
            <View style={[styles.statusBadge, { backgroundColor: job.status === 'OPEN' ? '#e1f5fe' : '#ffebee' }]}>
                <Text style={{ color: job.status === 'OPEN' ? '#0288d1' : '#c62828', fontWeight: 'bold' }}>
                    {job.status}
                </Text>
            </View>

            <View style={styles.divider} />

            {/* Details List */}
            <View style={styles.detailsContainer}>
                {job.job_date && (
                    <View style={styles.detailRow}>
                        <FontAwesome name="calendar" size={18} color="#666" style={styles.iconWidth} />
                        <Text style={styles.detailText}>{job.job_date}</Text>
                    </View>
                )}
                
                {/* 🟢 CLICKABLE LOCATION */}
                {job.location && (
                    <TouchableOpacity 
                        style={styles.detailRow} 
                        onPress={() => openGoogleMaps(job.location)}
                        activeOpacity={0.7}
                    >
                        <FontAwesome name="map-marker" size={20} color="#007AFF" style={styles.iconWidth} />
                        <Text style={[styles.detailText, styles.linkText]}>
                            {job.location}
                        </Text>
                        <FontAwesome name="external-link" size={14} color="#007AFF" style={{marginLeft: 8}} />
                    </TouchableOpacity>
                )}

                 <View style={styles.detailRow}>
                    <FontAwesome name="clock-o" size={20} color="#666" style={styles.iconWidth} />
                    <Text style={styles.detailText}>{job.shift_start || "--"} to {job.shift_end || "--"}</Text>
                </View>
                <View style={styles.detailRow}>
                    <FontAwesome name="cutlery" size={18} color="#666" style={styles.iconWidth} />
                    <Text style={styles.detailText}>{job.has_food ? "Food Provided" : "No Food"}</Text>
                </View>
            </View>
        </View>

        {/* 2. OWNER OR APPLICANT VIEW */}
        {isOwner && (
            <View style={{paddingHorizontal: 15}}>
                <Text style={styles.sectionTitle}>Applicants ({applicants.length})</Text>
                {applicants.map((item) => {
                    const isHired = item.status === 'ACCEPTED';
                    return (
                        <View key={item.id} style={styles.applicantCard}>
                            <View style={styles.row}>
                                <Image 
                                    source={{ uri: item.profiles?.avatar_url || 'https://via.placeholder.com/150' }} 
                                    style={styles.avatar} 
                                />
                                <View>
                                    <Text style={styles.name}>{item.profiles?.full_name || "User"}</Text>
                                    <Text style={{color: isHired ? '#34C759' : 'gray', fontSize: 12, fontWeight: isHired ? 'bold' : 'normal'}}>
                                        {item.status}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.actionRow}>
                                <TouchableOpacity 
                                    onPress={() => openChat(item.applicant_id)} 
                                    style={[styles.smBtn, {backgroundColor: '#E3F2FD', marginRight: 8}]}
                                >
                                    <FontAwesome name="comment" size={16} color="#1976D2" />
                                </TouchableOpacity>

                                {isHired ? (
                                    <View style={[styles.smBtn, {backgroundColor: '#E8F5E9'}]}>
                                         <FontAwesome name="check" size={16} color="#34C759" />
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        onPress={() => handleHire(item.id, item.profiles?.full_name)} 
                                        style={[styles.smBtn, {backgroundColor: '#007AFF'}]}
                                    >
                                        <Text style={{color:'white', fontSize: 12, fontWeight: 'bold'}}>Hire</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    );
                })}
                {applicants.length === 0 && <Text style={{textAlign:'center', color:'#999', marginTop: 20}}>No applicants yet.</Text>}
            </View>
        )}

        {!isOwner && (
            <View style={styles.footerContainer}>
                <TouchableOpacity style={styles.chatButton} onPress={() => openChat(job.user_id)}>
                    <FontAwesome name="comment-o" size={20} color="#007AFF" />
                    <Text style={styles.chatText}>Chat</Text>
                </TouchableOpacity>

                {hasApplied ? (
                    <View style={styles.appliedButton}>
                        <FontAwesome name="check-circle" size={20} color="white" />
                        <Text style={styles.applyText}>Applied</Text>
                    </View>
                ) : (
                    <TouchableOpacity 
                        style={styles.applyButton} 
                        onPress={handleApply}
                        disabled={applying}
                    >
                        {applying ? <ActivityIndicator color="white" /> : (
                            <Text style={styles.applyText}>Apply Now</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 15 },
  backBtn: { padding: 5 },
  
  jobCard: { backgroundColor: 'white', margin: 15, padding: 20, borderRadius: 12, elevation: 2 },
  jobTitle: { fontSize: 22, fontWeight: 'bold' },
  jobPrice: { fontSize: 20, color: '#34C759', fontWeight: 'bold', marginTop: 5 },
  statusBadge: { alignSelf: 'flex-start', padding: 5, borderRadius: 5, marginTop: 10 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  
  detailsContainer: { gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  iconWidth: { width: 30, textAlign: 'center' },
  detailText: { fontSize: 16, color: '#444', marginLeft: 10 },
  linkText: { color: '#007AFF', fontWeight: '600', textDecorationLine: 'underline' }, // 👈 New Style for Link

  footerContainer: { 
    flexDirection: 'row', padding: 20, gap: 15, 
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', 
    borderTopWidth: 1, borderColor: '#eee' 
  },
  chatButton: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#007AFF', backgroundColor: 'white' 
  },
  chatText: { color: '#007AFF', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
  applyButton: { 
    flex: 2, alignItems: 'center', justifyContent: 'center', 
    padding: 15, borderRadius: 12, backgroundColor: '#007AFF' 
  },
  appliedButton: { 
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    padding: 15, borderRadius: 12, backgroundColor: '#34C759' 
  },
  applyText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  applicantCard: { 
    backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, elevation: 2
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor:'#eee' },
  name: { fontWeight: 'bold', fontSize: 15 },
  smBtn: { 
    paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, 
    alignItems: 'center', justifyContent: 'center'
  },
});
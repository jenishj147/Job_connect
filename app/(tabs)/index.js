import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import JobCard from '../../components/JobCard';
import PostJobForm from '../../components/PostJobForm';
import { supabase } from '../../supabase';

export default function MyJobsScreen() {
  const router = useRouter();
  const flatListRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [session, setSession] = useState(null);
  const [editingJob, setEditingJob] = useState(null);

  // 1. Check Auth & Load Jobs
  useFocusEffect(
    useCallback(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) fetchMyJobs(session.user.id);
      });
    }, [])
  );

  // 2. Fetch Jobs (Simpler & Stronger)
  async function fetchMyJobs(userId) {
    if (!userId) return;
    try {
      // 🟢 FIX: using simple select('*') guarantees we get the data
      // We removed the complex join for now to ensure jobs show up
      const { data, error } = await supabase
        .from('jobs')
        .select('*') 
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.log("Fetch Error:", error.message);
    } finally {
      setLoading(false);
    }
  }

  // 3. Handle Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    if (session) await fetchMyJobs(session.user.id);
    setRefreshing(false);
  };

  // 4. Delete Function
  async function deleteJob(jobId) {
    // Optimistic Update (Remove from screen immediately)
    const previousJobs = [...jobs];
    setJobs(current => current.filter(job => job.id !== jobId));

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      if (Platform.OS !== 'web') {
        Alert.alert("Success", "Job deleted.");
      }
    } catch (error) {
      console.error("Delete Failed:", error.message);
      // Put it back if failed
      setJobs(previousJobs);
      Alert.alert("Error", "Could not delete job.");
    }
  }

  function confirmDelete(id) {
    if (Platform.OS === 'web') {
      if (window.confirm("Delete this job?")) deleteJob(id);
      return;
    }
    Alert.alert("Delete Job", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteJob(id) }
    ]);
  }

  // 5. Sign Out
  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>My Jobs</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={onRefresh} style={styles.iconBtn}>
            <FontAwesome name="refresh" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={styles.iconBtn}>
            <FontAwesome name="sign-out" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main List */}
      <FlatList
        ref={flatListRef}
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        
        // The "Post Job" Form sits at the top
        ListHeaderComponent={
          <PostJobForm
            initialValues={editingJob}
            onCancelEdit={() => setEditingJob(null)}
            onJobPosted={() => {
              setEditingJob(null);
              fetchMyJobs(session?.user?.id);
            }}
          />
        }

        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 15, marginBottom: 15 }}>
            <JobCard
              title={item.title}
              amount={item.amount}
              // Pass the raw job data so JobCard can use it if needed
              jobData={item} 
              isOwner={true}
              
              onPress={() => router.push({ pathname: "/job/[id]", params: { id: item.id } })}
              
              onDelete={() => confirmDelete(item.id)}
              
              onEdit={() => {
                setEditingJob(item);
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
              }}
            />
          </View>
        )}

        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <FontAwesome name="folder-open-o" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No jobs posted yet.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerText: { fontSize: 28, fontWeight: '800', color: '#000' },
  headerIcons: { flexDirection: 'row', gap: 20 },
  iconBtn: { padding: 5 },
  emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.8 },
  emptyText: { color: '#8E8E93', fontSize: 16, marginTop: 10 }
});
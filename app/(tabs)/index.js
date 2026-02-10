import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform // 👈 Import Platform
  ,
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

  // 1. Initial Auth Check & Auto-Refresh on Focus
  useFocusEffect(
    useCallback(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) fetchMyJobs(session.user.id);
      });
    }, [])
  );

  // 2. Fetch Jobs
  async function fetchMyJobs(userId) {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`*, profiles:user_id(username, full_name, avatar_url)`)
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

  // 4. ✅ ROBUST DELETE FUNCTION
  async function deleteJob(jobId) {
    console.log("🚀 Starting Delete for Job ID:", jobId);

    // A. Optimistic Update: Remove from UI immediately
    const previousJobs = [...jobs];
    setJobs(current => current.filter(job => job.id !== jobId));

    try {
      // B. Delete the job directly
      const { error, count } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)
        .select();

      if (error) throw error;

      if (count === 0) {
        throw new Error("Database permission denied or Item not found.");
      }

      console.log("✅ Delete Successful on Server");
      
      // Only show success alert on mobile to avoid blocking flow
      if (Platform.OS !== 'web') {
        Alert.alert("Success", "Job post deleted.");
      }

    } catch (error) {
      console.error("❌ Delete Failed:", error.message);
      
      // C. Rollback UI if failed
      setJobs(previousJobs);
      Alert.alert(
        "Delete Failed", 
        "Could not delete this job. Ensure you have internet connection."
      );
    }
  }

  // 5. ✅ WEB-COMPATIBLE CONFIRMATION
  function confirmDelete(id) {
    console.log("👉 Confirm Dialog Open for ID:", id);

    // 🌐 WEB: Use browser native confirm
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Are you sure you want to delete this job? This cannot be undone.");
      if (confirmed) {
        deleteJob(id);
      }
      return;
    }

    // 📱 MOBILE: Use Native Alert
    Alert.alert(
      "Delete Job",
      "Are you sure? This will remove the job and all its applications.",
      [
        { text: "Cancel", style: "cancel", onPress: () => console.log("❌ User Cancelled") },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            console.log("✅ User Confirmed Delete");
            deleteJob(id);
          } 
        }
      ]
    );
  }

  function handleEdit(job) {
    setEditingJob(job);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  async function handleSignOut() {
    // 🌐 WEB: Confirm logout on web too
    if (Platform.OS === 'web') {
        const confirmed = window.confirm("Are you sure you want to sign out?");
        if (!confirmed) return;
    }
    
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
        
        // Form is the Header
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

        // Render Cards
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 15, marginBottom: 15 }}>
            <JobCard
              title={item.title}
              amount={item.amount}
              profile={item.profiles}
              isOwner={true}
              
              // ✅ 1. Navigation Logic
              onPress={() => router.push({ pathname: "/job/[id]", params: { id: item.id } })}
              
              // ✅ 2. Delete Logic
              onDelete={() => {
                console.log("🗑️ Parent received DELETE request for:", item.id);
                confirmDelete(item.id);
              }}
              
              // ✅ 3. Edit Logic
              onEdit={() => handleEdit(item)}
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
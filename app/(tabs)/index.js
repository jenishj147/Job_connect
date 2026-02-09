import { StyleSheet, View, FlatList, Text, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../supabase';
import JobCard from '../../components/JobCard';
import PostJobForm from '../../components/PostJobForm';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function MyJobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [session, setSession] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const flatListRef = useRef(null);

  // 1. Initial Setup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchMyJobs(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        // Handle logout state if needed, though _layout usually handles redirect
        setJobs([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) fetchMyJobs(session.user.id);
    }, [session])
  );

  async function fetchMyJobs(userId) {
    if (!userId) return;

    try {
      // 1. We look for jobs belonging to the user.
      // 2. We use a "Left Join" approach so jobs load even if the profile is missing.
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Error:", error.message);
        // Fallback fetch
        if (error.code === 'PGRST200' || error.message.includes("relationship")) { // Common code for relationship errors
          console.log("Attempting fallback fetch...");
          const { data: fallbackData } = await supabase
            .from('jobs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          setJobs(fallbackData || []);
          return;
        }
        throw error;
      }

      setJobs(data || []);
    } catch (error) {
      console.log("Fetch Error:", error.message);
      // Optional: Alert.alert("Error fetching jobs", error.message);
    }
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) Alert.alert("Error", error.message);
          // Router redirect handled in _layout.js
        }
      }
    ]);
  }

  function confirmDelete(id) {
    Alert.alert(
      "Delete Job",
      "Are you sure you want to delete this job?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteJob(id) }
      ]
    );
  }

  const [lastError, setLastError] = useState(null);

  async function deleteJob(id) {
    setLastError(null);
    console.log("Attempting to delete job:", id);

    // 1. Delete from Supabase
    const { error } = await supabase.from('jobs').delete().eq('id', id);

    if (error) {
      console.error("Delete Error:", error);
      setLastError(error.message); // Show on screen
      Alert.alert("Delete Failed", error.message);
    } else {
      console.log("Delete Success");

      // 2. Optimistic Update
      setJobs(current => current.filter(job => job.id !== id));

      // 3. Verify with Server
      if (session) fetchMyJobs(session.user.id);
    }
  }

  function handleEdit(job) {
    setEditingJob(job);
    // Scroll to top to show form
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  async function onRefresh() {
    setRefreshing(true);
    if (session) await fetchMyJobs(session.user.id);
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>My Jobs</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => fetchMyJobs(session?.user?.id)} style={styles.iconBtn}>
            <FontAwesome name="refresh" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={styles.iconBtn}>
            <FontAwesome name="sign-out" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Debug Error Message */}
      {lastError && (
        <View style={{ backgroundColor: '#FFCCCC', padding: 10, margin: 10, borderRadius: 8 }}>
          <Text style={{ color: 'red', fontWeight: 'bold' }}>Error: {lastError}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}

        // 1. THE INPUT FORM (Extracted Component)
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

        // 2. RENDER JOB CARDS
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: "/job/[id]", params: { id: item.id } })}
          >
            <JobCard
              title={item.title}
              amount={item.amount}
              profile={item.profiles}
              isOwner={true}
              onDelete={() => confirmDelete(item.id)}
              onEdit={() => handleEdit(item)}
            />
          </TouchableOpacity>
        )}

        // 3. EMPTY STATE
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <FontAwesome name="folder-open-o" size={48} color="#ccc" />
              <Text style={styles.emptyText}>You haven't posted any jobs yet.</Text>
            </View>
          )
        }

        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
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
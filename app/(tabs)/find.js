import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView
} from 'react-native';
// 👇 Check this path: it assumes find.js is in app/(tabs)/
import { supabase } from '../../supabase';
import * as Location from 'expo-location';
import JobCard from '../../components/JobCard';

export default function FindJobsScreen() {
  const [jobs, setJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Track if the component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  const sessionRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    initialLoad();
    return () => { isMounted.current = false; };
  }, []);

  async function initialLoad() {
    setLoading(true);

    try {
      // 1. Get Auth Session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert("Login Required", "Please log in to view jobs.");
        setLoading(false);
        return;
      }
      sessionRef.current = session;

      // 2. Handle Location
      let coords = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = location.coords;
          setUserLocation(coords);
        }
      } catch (e) {
        console.log("Location error (optional):", e);
      }

      // 3. Fetch Data
      if (isMounted.current) {
        await Promise.all([
          fetchMyApplications(session.user.id),
          fetchJobs(coords, session.user.id)
        ]);
      }

    } catch (e) {
      console.error("Initial Load Error:", e);
      Alert.alert("Error", "Failed to connect to the server.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }

  /* 
   * FETCH MY APPLICATIONS
   * Returns a Map: { [jobId]: 'PENDING' | 'ACCEPTED' | ... }
   */
  const fetchMyApplications = async (userId) => {
    const { data, error } = await supabase
      .from('applications')
      .select('job_id, status') // Fetch status too
      .eq('applicant_id', userId);

    if (!error && isMounted.current && data) {
      // Create a map for O(1) lookups: { 123: 'PENDING', 124: 'ACCEPTED' }
      const appMap = {};
      data.forEach(app => {
        appMap[app.job_id] = app.status;
      });
      setMyApplications(appMap);
    }
  };

  const fetchJobs = async (coords, userId) => {
    // Fetch jobs that are OPEN and NOT created by me
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url
        )
      `)
      .neq('user_id', userId)
      .eq('status', 'OPEN');

    if (error) {
      console.error('Fetch Jobs Error:', error);
      return;
    }

    // Calculate distances
    const processedJobs = (data || []).map(job => {
      let distance = null;
      if (coords && job.latitude && job.longitude) {
        distance = calculateDistance(
          coords.latitude,
          coords.longitude,
          job.latitude,
          job.longitude
        );
      }
      return { ...job, distance };
    });

    // Sort: Nearest first
    processedJobs.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    if (isMounted.current) setJobs(processedJobs);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const userId = sessionRef.current?.user?.id;
    if (userId) {
      await Promise.all([
        fetchMyApplications(userId),
        fetchJobs(userLocation, userId)
      ]);
    }
    setRefreshing(false);
  }, [userLocation]);

  // Helper: Haversine Formula for km distance
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async function applyForJob(jobId) {
    const userId = sessionRef.current?.user?.id;
    if (!userId) return;

    // Optimistic Update: Mark as applied immediately (default to PENDING)
    setMyApplications(prev => ({ ...prev, [jobId]: 'PENDING' }));

    const { error } = await supabase.from('applications').insert([
      { job_id: jobId, applicant_id: userId, status: 'PENDING' }
    ]);

    if (error) {
      // Revert if failed
      setMyApplications(prev => {
        const newState = { ...prev };
        delete newState[jobId];
        return newState;
      });
      Alert.alert('Application Failed', error.message);
    } else {
      Alert.alert('Success', 'Application sent!');
    }
  }

  const renderItem = ({ item }) => {
    const status = myApplications[item.id]; // Get status like 'PENDING'
    const isApplied = !!status;

    // Create a display string like "5.2 km away"
    const distanceStr = item.distance
      ? `${item.distance.toFixed(1)} km`
      : "";

    // Combine amount with distance for the subtitle
    const subText = distanceStr ? `${item.amount} • ${distanceStr}` : item.amount;

    return (
      <JobCard
        title={item.title}
        amount={subText}
        profile={item.profiles}
        isOwner={false}
        onDelete={() => { }}
        onApply={() => applyForJob(item.id)} // Always pass the function
        applicationStatus={status} // Pass the actual status text
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Find Work Nearby</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Finding jobs...</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>
                {userLocation ? "No open jobs found nearby." : "No jobs found. (Try enabling location)"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  headerText: { fontSize: 24, fontWeight: '800', color: '#1C1C1E' },
  listContent: { paddingBottom: 40, paddingTop: 10 },
  loadingText: { marginTop: 10, color: '#8E8E93' },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  empty: { textAlign: 'center', color: '#8E8E93', fontSize: 16, lineHeight: 22 }
});
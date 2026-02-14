import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function JobCard({ 
  title, 
  amount, 
  profile, 
  onPress, 
  isOwner, 
  onDelete, 
  onEdit, 
  jobData,
  distance // 🟢 NEW PROP
}) {
  
  const dateStr = jobData?.created_at 
    ? new Date(jobData.created_at).toLocaleDateString() 
    : 'Recently';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      
      {/* 🟢 1. Header Row */}
      <View style={styles.headerRow}>
        <View style={{flex: 1}}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            
            {/* Location + Distance Row */}
            <View style={styles.locationRow}>
                
                {/* 🟢 NEW: Distance Badge */}
                {distance && (
                    <View style={styles.distanceBadge}>
                        <FontAwesome name="location-arrow" size={10} color="#007AFF" style={{marginRight: 4}} />
                        <Text style={styles.distanceText}>{distance} km</Text>
                    </View>
                )}

                {/* Location Text */}
                {jobData?.location && (
                    <View style={styles.textRow}>
                        {distance && <Text style={styles.dot}>•</Text>}
                        <Text style={styles.locationText} numberOfLines={1}>{jobData.location}</Text>
                    </View>
                )}
            </View>
        </View>
        <Text style={styles.amount}>₹{amount}</Text>
      </View>

      {/* 🟢 2. Middle Section */}
      {isOwner ? (
        <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: jobData?.status === 'OPEN' ? '#E1F5FE' : '#F5F5F5' }]}>
                <Text style={{ color: jobData?.status === 'OPEN' ? '#0288D1' : '#666', fontSize: 12, fontWeight: 'bold' }}>
                    {jobData?.status || 'OPEN'}
                </Text>
            </View>
            <Text style={styles.date}>{dateStr}</Text>
        </View>
      ) : (
        <View style={styles.profileRow}>
            {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <FontAwesome name="user" size={14} color="#666" />
                </View>
            )}
            <Text style={styles.employerName}>
                {profile?.full_name || profile?.username || "Employer"}
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.date}>{dateStr}</Text>
        </View>
      )}

      {/* 🟢 3. Action Buttons (Owner Only) */}
      {isOwner && (
        <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
                <FontAwesome name="pencil" size={16} color="#007AFF" />
                <Text style={styles.btnTextEdit}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                <FontAwesome name="trash" size={16} color="#FF3B30" />
                <Text style={styles.btnTextDelete}>Delete</Text>
            </TouchableOpacity>
        </View>
      )}

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  
  // Location & Distance
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap'
  },
  distanceBadge: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#E1F5FE', 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    borderRadius: 12, 
    marginRight: 6
  },
  distanceText: { fontSize: 11, color: '#007AFF', fontWeight: 'bold' },
  textRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 14, color: '#888' },
  
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  avatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: '#eee' },
  avatarPlaceholder: { width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  employerName: { fontSize: 14, fontWeight: '600', color: '#555' },
  dot: { marginHorizontal: 6, color: '#ccc' },
  date: { fontSize: 12, color: '#999' },

  actionRow: {
    flexDirection: 'row',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    gap: 15,
  },
  editBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, backgroundColor: '#F0F9FF', borderRadius: 8 },
  deleteBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, backgroundColor: '#FFF0F0', borderRadius: 8 },
  btnTextEdit: { color: '#007AFF', fontWeight: '600', marginLeft: 6 },
  btnTextDelete: { color: '#FF3B30', fontWeight: '600', marginLeft: 6 },
});
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function JobCard({ 
  title, 
  amount, 
  profile, 
  isOwner, 
  onDelete, 
  onEdit, 
  onApply,
  onPress, // Navigation action (Go to Details)
  applicationStatus, // 'APPLIED', 'HIRED', 'PENDING'
  distanceText // Optional: '5.4 km'
}) {

  // Helper to render the button based on status (for Non-Owners)
  const renderApplyButton = () => {
    const status = applicationStatus ? applicationStatus.toUpperCase() : null;

    if (status === 'HIRED' || status === 'APPROVED') {
        return (
            <View style={[styles.statusBadge, { backgroundColor: '#34C759' }]}>
                <FontAwesome name="check" size={14} color="white" />
                <Text style={styles.statusText}>Hired</Text>
            </View>
        );
    }
    if (status === 'PENDING' || status === 'APPLIED') {
        return (
            <View style={[styles.statusBadge, { backgroundColor: '#FF9500' }]}>
                <FontAwesome name="clock-o" size={14} color="white" />
                <Text style={styles.statusText}>Applied</Text>
            </View>
        );
    }
    
    // Default: Show Apply Button
    return (
        <TouchableOpacity style={styles.applyBtn} onPress={onApply}>
            <Text style={styles.applyBtnText}>Apply Now</Text>
        </TouchableOpacity>
    );
  };

  return (
    // 🟢 1. Main Container is a VIEW (Not a Button) to prevent touch conflicts
    <View style={styles.card}>
      
      {/* 🟢 2. Top Content Area (Triggers Navigation) */}
      <TouchableOpacity 
        style={styles.contentArea} 
        activeOpacity={0.7}
        onPress={() => {
          console.log("👉 Navigating to Job Details...");
          if (onPress) onPress();
        }}
      >
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {/* Avatar Handling */}
            {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <FontAwesome name="user" size={20} color="#fff" />
                </View>
            )}
            
            <View>
              <Text style={styles.username}>
                {profile?.full_name || profile?.username || 'Unknown'}
              </Text>
              <Text style={styles.subText}>
                {distanceText || 'View Details'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.amount}>{amount}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>{title}</Text>
      </TouchableOpacity>

      {/* 🟢 3. Footer Area (Action Buttons) */}
      <View style={styles.footer}>
        {isOwner ? (
          <View style={styles.ownerActions}>
            
            {/* DELETE BUTTON (Left Side - Explicitly separated) */}
            <TouchableOpacity 
              onPress={() => {
                console.log("🗑️ DELETE BUTTON PRESSED");
                if (onDelete) {
                    onDelete();
                } else {
                    console.log("❌ Error: onDelete prop is missing");
                }
              }} 
              style={[styles.actionBtn, { marginRight: 15 }]} 
              // Removed hitSlop to ensure no overlap
            >
              <View style={styles.deleteBtnInternal}>
                 <FontAwesome name="trash" size={18} color="#FF3B30" />
                 <Text style={styles.deleteText}>Delete</Text>
              </View>
            </TouchableOpacity>

            {/* EDIT BUTTON */}
            <TouchableOpacity 
              onPress={() => {
                console.log("✏️ EDIT BUTTON PRESSED");
                if (onEdit) onEdit();
              }} 
              style={styles.actionBtn}
            >
               <View style={styles.editBtnInternal}>
                 <FontAwesome name="edit" size={18} color="#007AFF" />
                 <Text style={styles.editText}>Edit</Text>
              </View>
            </TouchableOpacity>

          </View>
        ) : (
          renderApplyButton()
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white', 
    borderRadius: 16, 
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: 'hidden' // Keeps the ripple/touch effect contained
  },
  contentArea: {
    padding: 16,
    paddingBottom: 8 // Less padding at bottom so footer sits closer
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarPlaceholder: { backgroundColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
  
  username: { fontWeight: '700', fontSize: 14, color: '#1C1C1E' },
  subText: { color: '#8E8E93', fontSize: 12, marginTop: 2 },
  amount: { fontWeight: '700', fontSize: 16, color: '#34C759' }, 
  title: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 5, lineHeight: 24 },
  
  // Footer Container
  footer: { 
    paddingHorizontal: 16, 
    paddingBottom: 16,
    paddingTop: 0,
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    alignItems: 'center'
  },
  
  // Owner Actions
  ownerActions: { flexDirection: 'row' },
  actionBtn: { padding: 0 },
  
  // Internal Button Styling
  deleteBtnInternal: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF5F5', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEEEE'
  },
  deleteText: { color: '#FF3B30', marginLeft: 6, fontWeight: '700', fontSize: 14 },

  editBtnInternal: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F0F5FF', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEF0FF'
  },
  editText: { color: '#007AFF', marginLeft: 6, fontWeight: '700', fontSize: 14 },

  // Apply Button (Non-Owner)
  applyBtn: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  applyBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },

  // Status Badges
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  statusText: { color: 'white', fontWeight: '700', fontSize: 12 }
});
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function JobCard({ title, amount, profile, onDelete, onEdit, onApply, isOwner, applicationStatus }) {
  // Handle case where profile might be null or missing
  const username = profile?.username || profile?.full_name || 'Anonymous';
  const avatarUrl = profile?.avatar_url;

  return (
    <View style={styles.card}>
      {/* Header: Profile Pic & Name */}
      <View style={styles.header}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.placeholder}>
            <FontAwesome name="user" size={16} color="#666" />
          </View>
        )}
        <Text style={styles.username}>{username}</Text>
      </View>

      {/* Job Info */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.amount}>${amount}</Text>

      {/* Action Buttons */}
      <View style={styles.actions}>

        {/* EDIT Button (Only for Owner) */}
        {isOwner && onEdit && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <FontAwesome name="pencil" size={16} color="white" style={{ marginRight: 5 }} />
            <Text style={styles.btnText}>Edit</Text>
          </TouchableOpacity>
        )}

        {/* DELETE Button (Only for Owner) */}
        {isOwner && onDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <FontAwesome name="trash" size={16} color="white" style={{ marginRight: 5 }} />
            <Text style={styles.btnText}>Delete</Text>
          </TouchableOpacity>
        )}

        {/* APPLY Button (Only for Non-Owners) */}
        {!isOwner && onApply && (
          <TouchableOpacity
            style={[
              styles.applyBtn,
              applicationStatus === 'PENDING' ? styles.pendingBtn : {},
              applicationStatus === 'ACCEPTED' ? styles.acceptedBtn : {},
              applicationStatus === 'REJECTED' ? styles.rejectedBtn : {},
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onApply();
            }}
            // Disable if ANYTHING is in status (PENDING, ACCEPTED, REJECTED, etc.)
            disabled={!!applicationStatus}
          >
            <Text style={styles.btnText}>
              {!applicationStatus && "Apply Now"}
              {applicationStatus === 'PENDING' && "Pending ⏳"}
              {applicationStatus === 'ACCEPTED' && "Accepted 🎉"}
              {applicationStatus === 'REJECTED' && "Cruel World 💔"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    backgroundColor: '#eee'
  },
  placeholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  username: {
    fontWeight: '600',
    color: '#555',
    fontSize: 14
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000'
  },
  amount: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: 'bold',
    marginBottom: 15
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10
  },
  deleteBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  editBtn: {
    backgroundColor: '#FF9500', // Orange
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  applyBtn: {
    backgroundColor: '#007AFF', // Blue for default apply
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  pendingBtn: {
    backgroundColor: '#FF9500' // Orange for pending
  },
  acceptedBtn: {
    backgroundColor: '#34C759' // Green for accepted
  },
  rejectedBtn: {
    backgroundColor: '#FF3B30' // Red for rejected
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14
  }
});
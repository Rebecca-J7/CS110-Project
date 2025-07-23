<template>
  <div class="invite-notifications">
    <h3>Invitations</h3>
    
    <div v-if="loading" class="loading">Loading invitations...</div>
    
    <div v-else-if="invitations.length === 0" class="no-invitations">
      <p>No pending invitations</p>
    </div>
    
    <div v-else class="invitations-list">
      <div
        v-for="invitation in invitations"
        :key="invitation.id"
        class="invitation-item"
      >
        <div class="invitation-content">
          <p class="invitation-text">
            <strong>{{ invitation.fromUserName }}</strong> invited you to shared folder 
            <strong>"{{ invitation.folderName || 'Unknown Folder' }}"</strong>
          </p>
          <div class="invitation-actions">
            <button
              @click="acceptInvitation(invitation)"
              :disabled="processingInvite === invitation.id"
              class="accept-btn"
            >
              {{ processingInvite === invitation.id ? 'Accepting...' : 'Accept' }}
            </button>
            <button
              @click="declineInvitation(invitation)"
              :disabled="processingInvite === invitation.id"
              class="decline-btn"
            >
              {{ processingInvite === invitation.id ? 'Declining...' : 'Decline' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted } from 'vue'
import { firestore } from '@/firebaseResources'
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, getDoc, getDocs, addDoc, deleteDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const userId = inject('userId')
const isLoggedIn = inject('isLoggedIn')
const auth = getAuth()

const invitations = ref([])
const loading = ref(true)
const processingInvite = ref(null)
let unsubscribeInvitations = null

// Set up invitations listener
function setupInvitationsListener() {
  if (!isLoggedIn.value || !userId.value) {
    loading.value = false
    return
  }

  try {
    const invitationsQuery = query(
      collection(firestore, 'invitations'),
      where('toUserId', '==', userId.value),
      where('status', '==', 'pending')
    )

    unsubscribeInvitations = onSnapshot(invitationsQuery, (snapshot) => {
      invitations.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      console.log('Invitations loaded:', invitations.value)
      loading.value = false
    }, (error) => {
      console.error('Error listening to invitations:', error)
      loading.value = false
    })
  } catch (error) {
    console.error('Error setting up invitations listener:', error)
    loading.value = false
  }
}

// Accept invitation
async function acceptInvitation(invitation) {
  processingInvite.value = invitation.id
  
  try {
    // Update invitation status to accepted
    await updateDoc(doc(firestore, 'invitations', invitation.id), {
      status: 'accepted',
      acceptedAt: new Date()
    })

    // Check if shared folder exists
    let sharedFolderDoc = await getDoc(doc(firestore, 'sharedFolders', invitation.folderId))
    
    if (sharedFolderDoc.exists()) {
      // Shared folder already exists, just add user to sharedWith array
      await updateDoc(doc(firestore, 'sharedFolders', invitation.folderId), {
        sharedWith: arrayUnion(userId.value)
      })
    } else {
      console.error('Shared folder not found:', invitation.folderId)
    }

    console.log('Invitation accepted successfully')
  } catch (error) {
    console.error('Error accepting invitation:', error)
  } finally {
    processingInvite.value = null
  }
}

// Decline invitation
async function declineInvitation(invitation) {
  processingInvite.value = invitation.id
  
  try {
    // Update invitation status to declined
    await updateDoc(doc(firestore, 'invitations', invitation.id), {
      status: 'declined',
      declinedAt: new Date()
    })

    console.log('Invitation declined')
  } catch (error) {
    console.error('Error declining invitation:', error)
  } finally {
    processingInvite.value = null
  }
}

onMounted(() => {
  setupInvitationsListener()
})

onUnmounted(() => {
  if (unsubscribeInvitations) {
    unsubscribeInvitations()
  }
})
</script>

<style scoped>
.invite-notifications {
  width: 300px;
  padding: 1rem;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  background-color: #f5f9f8;
  box-sizing: border-box;
  margin-bottom: 1rem;
}

.invite-notifications h3 {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: black;
}

.loading, .no-invitations {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 1rem 0;
}

.invitations-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.invitation-item {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.75rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.invitation-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.invitation-text {
  margin: 0;
  font-size: 0.9rem;
  color: #333;
  line-height: 1.4;
}

.invitation-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.accept-btn, .decline-btn {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.accept-btn {
  background-color: #4caf50;
  color: white;
}

.accept-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.decline-btn {
  background-color: #f44336;
  color: white;
}

.decline-btn:hover:not(:disabled) {
  background-color: #da190b;
}

.accept-btn:disabled, .decline-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<template>
  <div class="invite-notifications">
    <h3>Invitations</h3>
    
    <div v-if="loading" class="loading">Loading invitations...</div>
    
    <!-- Decline Notifications -->
    <div v-if="declineNotifications.length > 0" class="decline-notifications-section">
      <div
        v-for="notification in declineNotifications"
        :key="notification.id"
        class="decline-notification-item"
      >
        <div class="notification-content">
          <p class="notification-text" v-if="notification.type === 'invitation_declined'">
            <strong>{{ notification.declinedByUserName }}</strong> declined your invitation to 
            <strong>"{{ notification.folderName || 'Unknown Folder' }}"</strong>
          </p>
          <p class="notification-text" v-else-if="notification.type === 'folder_converted_back'">
            {{ notification.message }}
          </p>
          <div class="notification-actions">
            <button
              @click="dismissDeclineNotification(notification)"
              class="okay-btn"
            >
              Okay
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Regular Invitations -->
    <div v-if="invitations.length === 0 && declineNotifications.length === 0" class="no-invitations">
      <p>No pending invitations</p>
    </div>
    
    <div v-if="invitations.length > 0" class="invitations-list">
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
const declineNotifications = ref([])
const loading = ref(true)
const processingInvite = ref(null)
let unsubscribeInvitations = null
let unsubscribeDeclineNotifications = null

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

// Set up decline notifications listener
function setupDeclineNotificationsListener() {
  if (!isLoggedIn.value || !userId.value) {
    return
  }

  try {
    console.log('Setting up decline notifications listener for user:', userId.value)
    
    const declineNotificationsQuery = query(
      collection(firestore, 'declineNotifications'),
      where('fromUserId', '==', userId.value)
    )

    unsubscribeDeclineNotifications = onSnapshot(declineNotificationsQuery, (snapshot) => {
      console.log('Decline notifications snapshot received, documents found:', snapshot.docs.length)
      
      const notificationList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Sort by createdAt (most recent first)
      notificationList.sort((a, b) => {
        const aTime = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0)
        const bTime = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0)
        return bTime - aTime
      })

      declineNotifications.value = notificationList
      console.log('Decline notifications loaded:', declineNotifications.value)
    }, (error) => {
      console.error('Error in decline notifications listener:', error)
    })
  } catch (error) {
    console.error('Error setting up decline notifications listener:', error)
  }
}

// Function to dismiss decline notification
async function dismissDeclineNotification(notification) {
  try {
    await deleteDoc(doc(firestore, 'declineNotifications', notification.id))
    console.log('Decline notification dismissed')
  } catch (error) {
    console.error('Error dismissing decline notification:', error)
  }
}

// Activity logging function for shared folder activities
async function logActivity(folderId, activityType, activityData = {}) {
  if (!folderId || !isLoggedIn.value || !userId.value) return
  
  try {
    const auth = getAuth()
    const currentUser = auth.currentUser
    
    if (!currentUser) return
    
    await addDoc(collection(firestore, 'activities'), {
      folderId: folderId,
      activityType: activityType,
      userId: userId.value,
      userName: currentUser.displayName || currentUser.email,
      userEmail: currentUser.email,
      timestamp: new Date(),
      ...activityData
    })
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}

// Accept invitation
async function acceptInvitation(invitation) {
  processingInvite.value = invitation.id
  
  try {
    console.log('Accepting invitation:', invitation.id)
    
    // Check if shared folder exists
    let sharedFolderDoc = await getDoc(doc(firestore, 'sharedFolders', invitation.folderId))
    
    if (sharedFolderDoc.exists()) {
      // Add user to sharedWith array first
      await updateDoc(doc(firestore, 'sharedFolders', invitation.folderId), {
        sharedWith: arrayUnion(userId.value)
      })
      
      console.log('Added user to shared folder')
      
      // Then update invitation status to accepted
      await updateDoc(doc(firestore, 'invitations', invitation.id), {
        status: 'accepted',
        acceptedAt: new Date()
      })
      
      console.log('Updated invitation status to accepted')
      
      // Log activity for user joining shared folder
      logActivity(invitation.folderId, 'user_added', { 
        invitationId: invitation.id,
        fromUserId: invitation.fromUserId,
        fromUserName: invitation.fromUserName
      })
      
      console.log('Invitation accepted successfully')
    } else {
      console.error('Shared folder not found:', invitation.folderId)
    }
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
    console.log('Declining invitation:', invitation.id)
    
    // Update invitation status to declined
    await updateDoc(doc(firestore, 'invitations', invitation.id), {
      status: 'declined',
      declinedAt: new Date()
    })

    console.log('Invitation declined')
    
    // Create a decline notification for the folder owner
    await createDeclineNotification(invitation)
    
    // Check if this shared folder should be converted back to regular folder
    await checkAndConvertBackToRegularFolder(invitation)
    
    // Set a timer to delete the declined invitation after 5 seconds
    // This ensures the owner sees the decline status briefly before cleanup
    setTimeout(async () => {
      try {
        await deleteDoc(doc(firestore, 'invitations', invitation.id))
        console.log('Cleaned up declined invitation document')
      } catch (error) {
        console.error('Error cleaning up declined invitation:', error)
      }
    }, 5000)
    
  } catch (error) {
    console.error('Error declining invitation:', error)
  } finally {
    processingInvite.value = null
  }
}

// Create a decline notification for the folder owner
async function createDeclineNotification(invitation) {
  try {
    console.log('Creating decline notification for invitation:', invitation.id)
    
    await addDoc(collection(firestore, 'declineNotifications'), {
      fromUserId: invitation.fromUserId, // The owner who sent the invitation
      fromUserEmail: invitation.fromUserEmail,
      declinedByUserId: invitation.toUserId, // The user who declined
      declinedByUserName: invitation.toUserName,
      declinedByUserEmail: invitation.toUserEmail,
      folderName: invitation.folderName,
      folderId: invitation.folderId,
      originalInvitationId: invitation.id,
      createdAt: new Date(),
      read: false,
      type: 'invitation_declined'
    })
    
    console.log('Decline notification created successfully')
  } catch (error) {
    console.error('Error creating decline notification:', error)
  }
}

// Check if shared folder should be converted back to regular folder
async function checkAndConvertBackToRegularFolder(declinedInvitation) {
  try {
    const folderId = declinedInvitation.folderId
    
    // Check if there are any other pending invitations for this folder
    const otherInvitationsQuery = query(
      collection(firestore, 'invitations'),
      where('folderId', '==', folderId),
      where('status', '==', 'pending')
    )
    
    const otherInvitationsSnapshot = await getDocs(otherInvitationsQuery)
    
    // Also check for any other declined invitations that haven't been cleaned up yet
    const declinedInvitationsQuery = query(
      collection(firestore, 'invitations'),
      where('folderId', '==', folderId),
      where('status', '==', 'declined')
    )
    
    const declinedInvitationsSnapshot = await getDocs(declinedInvitationsQuery)
    
    // If there are no other pending invitations, convert back to regular folder
    if (otherInvitationsSnapshot.empty) {
      console.log('No other pending invitations, converting back to regular folder')
      
      // Get the shared folder data
      const sharedFolderDoc = await getDoc(doc(firestore, 'sharedFolders', folderId))
      if (!sharedFolderDoc.exists()) {
        console.log('Shared folder not found, may have already been converted')
        return
      }
      
      const sharedFolderData = sharedFolderDoc.data()
      const ownerId = sharedFolderData.ownerId
      
      // Check if anyone is actually in the shared folder (sharedWith array)
      const sharedWith = sharedFolderData.sharedWith || []
      if (sharedWith.length > 0) {
        console.log('Shared folder still has members, not converting back')
        return
      }
      
      // Create a new regular folder for the owner
      const newRegularFolderRef = await addDoc(collection(firestore, 'folders'), {
        name: sharedFolderData.name,
        userId: ownerId,
        isDefault: false,
        createdAt: new Date(),
        convertedFromShared: true,
        originalSharedFolderId: folderId
      })
      
      console.log('Created new regular folder:', newRegularFolderRef.id)
      
      // Move all saved posts back to regular folder structure
      const savedPostsQuery = query(
        collection(firestore, 'savedPosts'),
        where('folderId', '==', folderId),
        where('userId', '==', ownerId)
      )
      
      const savedPostsSnapshot = await getDocs(savedPostsQuery)
      
      // Update all posts to point to the new regular folder
      const updatePostPromises = savedPostsSnapshot.docs.map(async (postDoc) => {
        const postData = postDoc.data()
        
        // Create new saved post in regular folder
        await addDoc(collection(firestore, 'savedPosts'), {
          ...postData,
          folderId: newRegularFolderRef.id,
          folderName: sharedFolderData.name,
          convertedFromShared: true,
          convertedAt: new Date()
        })
        
        // Delete the old post from shared folder
        await deleteDoc(postDoc.ref)
      })
      
      await Promise.all(updatePostPromises)
      console.log(`Migrated ${savedPostsSnapshot.docs.length} posts to regular folder`)
      
      // Clean up any comments related to posts in this shared folder
      const commentsQuery = query(collection(firestore, 'comments'))
      const allCommentsSnapshot = await getDocs(commentsQuery)
      
      const sharedFolderComments = []
      for (const commentDoc of allCommentsSnapshot.docs) {
        const commentData = commentDoc.data()
        if (commentData.postId) {
          // Check if this comment belongs to any post that was in the shared folder
          const wasInSharedFolder = savedPostsSnapshot.docs.some(postDoc => 
            postDoc.data().postId === commentData.postId
          )
          if (wasInSharedFolder) {
            sharedFolderComments.push(commentDoc)
          }
        }
      }
      
      // Delete all comments related to the shared folder posts
      const deleteCommentsPromises = sharedFolderComments.map(async (commentDoc) => {
        await deleteDoc(commentDoc.ref)
      })
      
      await Promise.all(deleteCommentsPromises)
      console.log(`Cleaned up ${sharedFolderComments.length} comments from shared folder`)
      
      // Delete all activities related to this shared folder
      const activitiesQuery = query(
        collection(firestore, 'activities'),
        where('folderId', '==', folderId)
      )
      
      const activitiesSnapshot = await getDocs(activitiesQuery)
      const deleteActivitiesPromises = activitiesSnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deleteActivitiesPromises)
      console.log(`Cleaned up ${activitiesSnapshot.docs.length} activities from shared folder`)
      
      // Finally, delete the shared folder document
      await deleteDoc(doc(firestore, 'sharedFolders', folderId))
      console.log('Deleted shared folder document')
      
      // Clean up all declined invitations for this folder
      const cleanupDeclinedPromises = declinedInvitationsSnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(cleanupDeclinedPromises)
      console.log(`Cleaned up ${declinedInvitationsSnapshot.docs.length} declined invitation documents`)
      
      // Create a summary notification for the folder owner about the conversion
      await addDoc(collection(firestore, 'declineNotifications'), {
        fromUserId: ownerId,
        fromUserEmail: '',
        declinedByUserId: 'system',
        declinedByUserName: 'System',
        declinedByUserEmail: '',
        folderName: sharedFolderData.name,
        folderId: newRegularFolderRef.id, // Point to the new regular folder
        originalInvitationId: '',
        createdAt: new Date(),
        read: false,
        type: 'folder_converted_back',
        message: `Your folder "${sharedFolderData.name}" was converted back to a regular folder because all invitations were declined.`
      })
      
      console.log('Successfully converted shared folder back to regular folder')
    } else {
      console.log(`Found ${otherInvitationsSnapshot.docs.length} other pending invitations, keeping as shared folder`)
    }
    
  } catch (error) {
    console.error('Error checking and converting shared folder:', error)
  }
}

onMounted(() => {
  setupInvitationsListener()
  setupDeclineNotificationsListener()
})

onUnmounted(() => {
  if (unsubscribeInvitations) {
    unsubscribeInvitations()
  }
  if (unsubscribeDeclineNotifications) {
    unsubscribeDeclineNotifications()
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

/* Decline Notifications Styles */
.decline-notifications-section {
  margin-bottom: 1rem;
}

.decline-notification-item {
  background: #f5f9f8;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.notification-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notification-text {
  margin: 0;
  color: #333;
  line-height: 1.4;
}

.notification-actions {
  display: flex;
  justify-content: flex-end;
}

.okay-btn {
  background-color: rgb(123, 154, 213);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.okay-btn:hover {
  background-color: #3a6c97;
}
</style>

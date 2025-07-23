<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted, inject, watch, onUnmounted, nextTick, computed } from 'vue'
import { firestore } from '@/firebaseResources'
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import SavedPostItem from '@/components/SavedPostItem.vue'

const route = useRoute()
const router = useRouter()
const folderId = route.params.id
const folderName = ref('Folder')
const savedPosts = ref([])
const loading = ref(true)
const lastPostSavedAt = ref(null)

const userId = inject('userId')
const isLoggedIn = inject('isLoggedIn')
const following = inject('following', ref([]))
const followingUsers = ref([]) // Store user details for followed users with invitation status
let unsubscribeSavedPosts = null // To store the unsubscribe function
let unsubscribeInvitations = null // To store the invitations listener

// Function to fetch user details for followed users
async function fetchFollowingUserDetails() {
  if (!following.value || following.value.length === 0) {
    followingUsers.value = []
    return
  }
  
  if (!userId.value) {
    console.error('No user ID available for fetching following details')
    followingUsers.value = []
    return
  }
  
  try {
    const currentUserId = userId.value // Store current user ID to avoid variable shadowing
    
    const userPromises = following.value.map(async (followedUserId) => {
      const userDoc = await getDoc(doc(firestore, 'users', followedUserId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        
        // Check if user is already invited to this folder
        const invitationsQuery = query(
          collection(firestore, 'invitations'),
          where('toUserId', '==', followedUserId),
          where('folderId', '==', folderId),
          where('fromUserId', '==', currentUserId)
        )
        const invitationDocs = await getDocs(invitationsQuery)
        
        let invitationStatus = null
        if (!invitationDocs.empty) {
          const latestInvitation = invitationDocs.docs[0].data()
          invitationStatus = latestInvitation.status
        }
        
        return {
          id: followedUserId,
          email: userData.email,
          username: userData.username || userData.email,
          displayName: userData.username || userData.email,
          invitationStatus: invitationStatus, // 'pending', 'accepted', 'declined', or null
          declineTimer: null // For managing decline status timeout
        }
      } else {
        return {
          id: followedUserId,
          email: 'Unknown User',
          username: 'Unknown User',
          displayName: 'Unknown User',
          invitationStatus: null,
          declineTimer: null
        }
      }
    })
    
    followingUsers.value = await Promise.all(userPromises)
    
    // Set up invitations listener after users are loaded
    setupInvitationsListener()
  } catch (error) {
    console.error('Error fetching following user details:', error)
    followingUsers.value = []
  }
}

// Watch for changes in following list and fetch user details
watch(following, () => {
  fetchFollowingUserDetails()
}, { immediate: true })

// Function to navigate to user profile
function goToUserProfile(userId) {
  router.push(`/users/${userId}`)
}

// Function to set up invitations listener to track status changes
function setupInvitationsListener() {
  if (!isLoggedIn.value || !userId.value) return

  try {
    const invitationsQuery = query(
      collection(firestore, 'invitations'),
      where('folderId', '==', folderId),
      where('fromUserId', '==', userId.value)
    )

    unsubscribeInvitations = onSnapshot(invitationsQuery, (snapshot) => {
      const invitationStatuses = {}
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        invitationStatuses[data.toUserId] = data.status
      })

      // Update user statuses based on invitations
      followingUsers.value.forEach(user => {
        const status = invitationStatuses[user.id]
        user.invitationStatus = status || null
        
        // If declined, set a timer to clear the status after 3 seconds
        if (status === 'declined' && !user.declineTimer) {
          user.declineTimer = setTimeout(() => {
            user.invitationStatus = null
            user.declineTimer = null
          }, 3000)
        }
      })
    })
  } catch (error) {
    console.error('Error setting up invitations listener:', error)
  }
}

// Function to convert regular folder to shared folder and invite user
async function inviteUser(user) {
  try {
    const auth = getAuth()
    const currentUser = auth.currentUser
    if (!currentUser) {
      console.error('User not authenticated')
      return
    }

    console.log('Inviting user to folder:', user.displayName)
    console.log('Current folderName.value:', folderName.value)
    
    // First, convert the regular folder to a shared folder
    const sharedFolderId = await convertToSharedFolder()
    if (!sharedFolderId) {
      console.error('Failed to convert folder to shared')
      return
    }
    
    // Create invitation document in Firestore using the new shared folder ID
    await addDoc(collection(firestore, 'invitations'), {
      fromUserId: currentUser.uid,
      fromUserEmail: currentUser.email,
      fromUserName: currentUser.displayName || currentUser.email,
      toUserId: user.id,
      toUserEmail: user.email,
      toUserName: user.displayName,
      folderId: sharedFolderId,
      folderName: folderName.value,
      status: 'pending', // pending, accepted, declined
      createdAt: new Date(),
      type: 'shared_folder_invite'
    })
    console.log('Invitation created with folderName:', folderName.value)

    // Update UI to show invited status
    const userIndex = followingUsers.value.findIndex(u => u.id === user.id)
    if (userIndex !== -1) {
      followingUsers.value[userIndex].invitationStatus = 'pending'
    }

    // Redirect to the new shared folder view
    router.push(`/shared-folder/${sharedFolderId}`)

    console.log('Invitation sent successfully')
  } catch (error) {
    console.error('Error sending invitation:', error)
  }
}

// Function to convert regular folder to shared folder
async function convertToSharedFolder() {
  try {
    // Get the current folder data
    const folderDoc = await getDoc(doc(firestore, 'folders', folderId))
    if (!folderDoc.exists()) {
      console.error('Folder not found')
      return null
    }
    
    const folderData = folderDoc.data()
    const isDefaultFolder = folderData.isDefault
    
    // Create a new shared folder with the same data
    const sharedFolderRef = await addDoc(collection(firestore, 'sharedFolders'), {
      name: folderData.name,
      ownerId: folderData.userId,
      sharedWith: [], // Array of user IDs who have access
      isDefault: false, // Shared folders are never default
      createdAt: new Date(),
      convertedFrom: folderId // Keep reference to original folder
    })
    
    // Update all savedPosts to reference the new shared folder
    const savedPostsQuery = query(
      collection(firestore, 'savedPosts'),
      where('folderId', '==', folderId),
      where('userId', '==', userId.value)
    )
    
    const savedPostsSnapshot = await getDocs(savedPostsQuery)
    const updatePromises = savedPostsSnapshot.docs.map(async (postDoc) => {
      // Update the folderId to point to the new shared folder
      await updateDoc(postDoc.ref, {
        folderId: sharedFolderRef.id,
        isSharedFolderPost: true
      })
    })
    
    await Promise.all(updatePromises)
    
    // Delete the original folder
    await deleteDoc(doc(firestore, 'folders', folderId))
    
    // If we just converted the default folder, create a new default folder
    if (isDefaultFolder) {
      await addDoc(collection(firestore, 'folders'), {
        name: 'Default Folder',
        userId: userId.value,
        isDefault: true
      })
    }
    
    console.log('Folder converted to shared folder successfully')
    return sharedFolderRef.id
  } catch (error) {
    console.error('Error converting folder to shared:', error)
    return null
  }
}

// Function to get localStorage key for this folder's last update
function getLastUpdateKey() {
  return `lastPostSaved_${folderId}_${userId.value || 'anonymous'}`
}

// Function to save last update timestamp to localStorage
function saveLastUpdateToStorage(timestamp) {
  if (timestamp) {
    localStorage.setItem(getLastUpdateKey(), JSON.stringify({
      timestamp: timestamp.seconds ? timestamp.seconds * 1000 : timestamp,
      folderId: folderId
    }))
  }
}

// Function to load last update timestamp from localStorage
function loadLastUpdateFromStorage() {
  try {
    // First try with current user
    const userSpecificKey = `lastPostSaved_${folderId}_${userId.value || 'anonymous'}`
    let stored = localStorage.getItem(userSpecificKey)
    
    // If no user-specific data and user is logged in, try to find any previous data for this folder
    if (!stored && userId.value) {
      // Check if there's any data for this folder from previous sessions
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(`lastPostSaved_${folderId}_`) && key !== userSpecificKey) {
          const oldData = localStorage.getItem(key)
          if (oldData) {
            // Migrate old data to new user-specific key
            localStorage.setItem(userSpecificKey, oldData)
            stored = oldData
            break
          }
        }
      }
    }
    
    if (stored) {
      const data = JSON.parse(stored)
      // Convert back to Firestore timestamp-like object
      return {
        seconds: Math.floor(data.timestamp / 1000),
        toDate: () => new Date(data.timestamp)
      }
    }
  } catch (error) {
    console.error('Error loading last update from storage:', error)
  }
  return null
}

// Function to format date/time
function formatDate(timestamp) {
  if (!timestamp) return ''
  let date
  // If it's a Firestore Timestamp object (has a toDate method)
  if (timestamp.toDate) {
    date = timestamp.toDate()
  } else if (timestamp.seconds) {
    // If it's a plain Timestamp object from Firestore (e.g., after JSON serialization)
    date = new Date(timestamp.seconds * 1000)
  } else {
    // Fallback for strings or Date objects
    date = new Date(timestamp)
  }
  return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString()
}

// Function to set up saved posts listener
function setupSavedPostsListener() {
  // Clean up existing listener
  if (unsubscribeSavedPosts) {
    unsubscribeSavedPosts()
    unsubscribeSavedPosts = null
  }

  // Reset posts and loading state
  savedPosts.value = []
  
  // Always load last update from localStorage to preserve update info
  if (!lastPostSavedAt.value) {
    lastPostSavedAt.value = loadLastUpdateFromStorage()
  }

  // Only set up listener if user is logged in and we have a userId
  if (!isLoggedIn.value || !userId.value) {
    loading.value = false
    return
  }

  loading.value = true

  try {
    const savedPostsQuery = query(
      collection(firestore, 'savedPosts'),
      where('folderId', '==', folderId),
      where('userId', '==', userId.value),
      orderBy('savedAt', 'desc')
    )

    unsubscribeSavedPosts = onSnapshot(savedPostsQuery, (snapshot) => {
      const posts = snapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() }
        return data
      })

      savedPosts.value = posts

  // Find the most recent savedAt timestamp
  if (posts.length > 0) {
    const mostRecent = posts.reduce((latest, post) => {
      if (!latest || (post.savedAt && (!latest.savedAt || post.savedAt.seconds > latest.savedAt.seconds))) {
        return post
      }
      return latest
    })
    
    // Only update if this is actually more recent than what we have stored
    const currentStored = loadLastUpdateFromStorage()
    const newTimestamp = mostRecent.savedAt
    
    if (!currentStored || 
        (newTimestamp && newTimestamp.seconds > currentStored.seconds)) {
      lastPostSavedAt.value = newTimestamp
      saveLastUpdateToStorage(newTimestamp)
    }
  } else {
    // If no posts but we don't have a lastPostSavedAt, try to load from storage
    if (!lastPostSavedAt.value) {
      lastPostSavedAt.value = loadLastUpdateFromStorage()
    }
  }

      loading.value = false
    }, (error) => {
      console.error('Error listening to saved posts:', error)
      // If orderBy fails, try without ordering
      if (error.code === 'failed-precondition' || error.code === 'unimplemented') {
        const simpleQuery = query(
          collection(firestore, 'savedPosts'),
          where('folderId', '==', folderId),
          where('userId', '==', userId.value)
        )

        unsubscribeSavedPosts = onSnapshot(simpleQuery, (snapshot) => {
          const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          savedPosts.value = posts
          
          // Handle last update timestamp for fallback query too
          if (posts.length > 0) {
            const mostRecent = posts.reduce((latest, post) => {
              if (!latest || (post.savedAt && (!latest.savedAt || post.savedAt.seconds > latest.savedAt.seconds))) {
                return post
              }
              return latest
            })
            
            // Only update if this is actually more recent than what we have stored
            const currentStored = loadLastUpdateFromStorage()
            const newTimestamp = mostRecent.savedAt
            
            if (!currentStored || 
                (newTimestamp && newTimestamp.seconds > currentStored.seconds)) {
              lastPostSavedAt.value = newTimestamp
              saveLastUpdateToStorage(newTimestamp)
            }
          } else {
            // If no posts but we don't have a lastPostSavedAt, try to load from storage
            if (!lastPostSavedAt.value) {
              lastPostSavedAt.value = loadLastUpdateFromStorage()
            }
          }
          
          loading.value = false
        })
      } else {
        loading.value = false
      }
    })
  } catch (error) {
    console.error('Error setting up saved posts query:', error)
    loading.value = false
  }
}

// Watch for changes in userId or login status and re-setup the listener
watch([userId, isLoggedIn], ([newUserId, newIsLoggedIn], [oldUserId, oldIsLoggedIn]) => {
  // Only reset lastPostSavedAt if the actual user changed (not just login state)
  if (oldUserId !== newUserId && oldUserId !== undefined && oldUserId !== null) {
    lastPostSavedAt.value = null
  }
  
  // Use nextTick to ensure all reactive updates are processed
  nextTick(() => {
    setTimeout(() => {
      setupSavedPostsListener()
    }, 100)
  })
}, { immediate: true, flush: 'post' })

// Fetch folder name from Firestore
onMounted(async () => {
  if (!folderId) {
    console.error('No folderId provided')
    return
  }
  
  // Load last update from storage immediately on mount to show in Updates section
  lastPostSavedAt.value = loadLastUpdateFromStorage()
  
  // Get folder details
  try {
    const folderDoc = await getDoc(doc(firestore, 'folders', folderId))
    if (folderDoc.exists()) {
      folderName.value = folderDoc.data().name
    } else {
      console.error('Folder not found:', folderId)
    }
  } catch (error) {
    console.error('Error loading folder:', error)
  }
  
  // The watcher with immediate: true will handle setting up the listener
})

// Clean up listener when component unmounts
onUnmounted(() => {
  if (unsubscribeSavedPosts) {
    unsubscribeSavedPosts()
  }
  if (unsubscribeInvitations) {
    unsubscribeInvitations()
  }
})

// Handle post deletion from folder
function handlePostDeleted(deletedPostId) {
  // Remove the deleted post from the local array
  savedPosts.value = savedPosts.value.filter(post => post.id !== deletedPostId)
  
  // Note: The Firestore listener will also update the list automatically,
  // but removing it locally provides immediate UI feedback
}
</script>

<template>
    <h2 class="folder-title">{{ folderName }}</h2>

  <div class="folder-row">

    <!-- Updates List -->
    <div class="updates-list">
      <h3>Updates</h3>
      <ul>
        <li v-if="lastPostSavedAt" class="last-saved">
          Last post saved {{ formatDate(lastPostSavedAt) }}
        </li>
        <li v-else class="no-updates">
          No updates in this folder yet
        </li>
      </ul>
    </div>

    <!-- Saved Posts Section -->
    <div class="saved-posts-section">
      <h3>Saved Posts</h3>
      <div v-if="loading" class="loading">Loading saved posts...</div>
      <div v-else-if="savedPosts.length === 0" class="no-posts">
        <p>No posts saved to this folder yet.</p>
      </div>
      <div v-else class="posts-list">
        <SavedPostItem
          v-for="savedPost in savedPosts"
          :key="savedPost.id"
          :savedPost="savedPost"
          @postDeleted="handlePostDeleted"
        />
      </div>
    </div>

    <!-- Invite Users List -->
    <div class="followers-list">
      <h3>Invite Users</h3>
      <ul>
        <li v-if="followingUsers.length === 0" class="no-following">
          <span>You're not following anyone to invite</span>
        </li>
        <li v-else v-for="user in followingUsers" :key="user.id" class="follower-row">
          <div class="user-info">
            <span class="user-name">{{ user.displayName }}</span>
            <div v-if="user.invitationStatus" class="status-indicator">
              <span 
                v-if="user.invitationStatus === 'pending'"
                class="status-pending"
              >
                Pending
              </span>
              <span 
                v-else-if="user.invitationStatus === 'accepted'"
                class="status-accepted"
              >
                Invite Accepted
              </span>
              <span 
                v-else-if="user.invitationStatus === 'declined'"
                class="status-declined"
              >
                Invite Declined
              </span>
            </div>
          </div>
          <button 
            v-if="!user.invitationStatus || user.invitationStatus === 'declined'"
            @click="inviteUser(user)" 
            class="invite-btn"
          >
            {{ user.invitationStatus === 'declined' ? 'Invite Again' : 'Invite' }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>

.folder-title {
  font-size: 1.7rem;
  font-weight: bold;
  color: black;
  margin-bottom: 2rem;
}

.folder-row {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  align-items: flex-start;
}

.updates-list, .followers-list, .saved-posts-section {
  background: #f5f9f8;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  padding: 1rem;
  min-width: 300px;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
  color: black;
}

.saved-posts-section {
  flex: 2;
  width: 550px;
}

.updates-list h3, .followers-list h3, .saved-posts-section h3 {
  margin-bottom: 0.5rem;
  color: black;
  font-size: 1.1rem;
    font-weight: bold;
}

.updates-list ul, .followers-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.last-saved {
  font-style: italic;
  color: #7b9ad5;
  border-top: 1px solid #e0e0e0;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}

.no-updates {
  font-style: italic;
  color: #999;
  border-top: 1px solid #e0e0e0;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}

.follower-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8rem;
  padding: 0.5rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.user-name {
  font-size: 0.95rem;
  color: #333;
  font-weight: 500;
}

.status-indicator {
  font-size: 0.8rem;
}

.status-pending {
  color: #ff9800;
  font-weight: 600;
}

.status-accepted {
  color: #4caf50;
  font-weight: 600;
}

.status-declined {
  color: #f44336;
  font-weight: 600;
}

.invite-btn {
  background-color: #7b9ad5;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.3rem 0.8rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.invite-btn:hover {
  background-color: #3a6c97;
}

.user-profile-btn {
  background: none;
  border: none;
  color: #7b9ad5;
  cursor: pointer;
  text-decoration: underline;
  font-size: 1rem;
  font-family: inherit;
  padding: 0;
  transition: color 0.2s;
}

.user-profile-btn:hover {
  color: #3a6c97;
}

.no-following {
  font-style: italic;
  color: #999;
  padding: 0.5rem 0;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading, .no-posts {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 2rem;
}

.demo-post {
  background: #f5f9f8;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  padding: 1rem;
  min-width: 500px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
}

.post-content h3 {
    margin-bottom: 0.5rem;
    color: black;
    font-size: 1.1rem;
    font-weight: bold;
}

.post-content p {
  margin: 0;
  color: #222;
}

.comment-section {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.comment-input {
  flex: 1;
  padding: 0.5rem;
  border-radius: 5px;
  border: 1px solid #7b9ad5;
  font-size: 1rem;
}

.comment-btn {
  background-color: #7b9ad5;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.5rem 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.comment-btn:hover {
  background-color: #3a6c97;
}
</style>
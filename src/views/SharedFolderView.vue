<script setup>
import { useRoute } from 'vue-router'
import { ref, onMounted, inject, watch, onUnmounted, nextTick } from 'vue'
import { firestore } from '@/firebaseResources'
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, getDocs, addDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import SavedPostItem from '@/components/SavedPostItem.vue'

const route = useRoute()
const folderId = route.params.id
const folderName = ref('Loading...')
const savedPosts = ref([])
const loading = ref(true)
const lastPostSavedAt = ref(null)

const userId = inject('userId')
const isLoggedIn = inject('isLoggedIn')
const following = inject('following', ref([]))
const followingUsers = ref([]) // Store user details for followed users
const isOwner = ref(false) // Track if current user is the folder owner
let unsubscribeSavedPosts = null // To store the unsubscribe function
let unsubscribeInvitations = null // To store the invitations listener

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

// Function to fetch user details for followed users
async function fetchFollowingUserDetails() {
  console.log('Fetching following user details...')
  console.log('Following array:', following.value)
  console.log('Current user ID:', userId.value)
  
  if (!userId.value) {
    console.error('No user ID available for fetching following details')
    followingUsers.value = []
    return
  }
  
  if (!following.value || following.value.length === 0) {
    console.log('No following users found')
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
    console.log('Following users loaded:', followingUsers.value)
    
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

// Function to invite user to shared folder
async function inviteUser(user) {
  try {
    const auth = getAuth()
    const currentUser = auth.currentUser
    if (!currentUser) {
      console.error('User not authenticated')
      return
    }

    console.log('Inviting user to shared folder:', user.displayName)
    console.log('Current folderName.value:', folderName.value)
    
    // Create invitation document in Firestore
    await addDoc(collection(firestore, 'invitations'), {
      fromUserId: currentUser.uid,
      fromUserEmail: currentUser.email,
      fromUserName: currentUser.displayName || currentUser.email,
      toUserId: user.id,
      toUserEmail: user.email,
      toUserName: user.displayName,
      folderId: folderId,
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

    console.log('Invitation sent successfully')
  } catch (error) {
    console.error('Error sending invitation:', error)
  }
}

// Function to get localStorage key for this folder's last update
function getLastUpdateKey() {
  return `lastPostSaved_shared_${folderId}_${userId.value || 'anonymous'}`
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
    const userSpecificKey = `lastPostSaved_shared_${folderId}_${userId.value || 'anonymous'}`
    let stored = localStorage.getItem(userSpecificKey)
    
    // If no user-specific data and user is logged in, try to find any previous data for this folder
    if (!stored && userId.value) {
      // Check if there's any data for this folder from previous sessions
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(`lastPostSaved_shared_${folderId}_`) && key !== userSpecificKey) {
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

// Function to set up saved posts listener for shared folders
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
    // For shared folders, query the sharedSavedPosts collection or regular savedPosts
    // For now, using the same query structure but filtering for shared folder posts
    const savedPostsQuery = query(
      collection(firestore, 'savedPosts'),
      where('folderId', '==', folderId),
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
      }

      loading.value = false
    }, (error) => {
      console.error('Error listening to saved posts:', error)
      // If orderBy fails, try without ordering
      if (error.code === 'failed-precondition' || error.code === 'unimplemented') {
        const simpleQuery = query(
          collection(firestore, 'savedPosts'),
          where('folderId', '==', folderId)
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
  console.log('SharedFolderView mounted, current userId:', userId.value)
  console.log('isLoggedIn:', isLoggedIn.value)
  console.log('Following users injection:', following.value)
  console.log('folderId from route:', folderId)
  
  if (!isLoggedIn.value || !userId.value) {
    console.error('User not authenticated. isLoggedIn:', isLoggedIn.value, 'userId:', userId.value)
    folderName.value = 'Authentication Required'
    return
  }
  
  if (!folderId) {
    console.error('No folderId provided')
    folderName.value = 'No Folder ID'
    return
  }
  
  // Load last update from storage immediately on mount to show in Updates section
  lastPostSavedAt.value = loadLastUpdateFromStorage()
  
  // Get folder details from Firestore (check both regular folders and shared folders)
  try {
    console.log('Loading folder details for folderId:', folderId)
    console.log('User authenticated:', !!userId.value, 'User ID:', userId.value)
    
    // First try the sharedFolders collection
    let folderDoc = await getDoc(doc(firestore, 'sharedFolders', folderId))
    if (folderDoc.exists()) {
      const folderData = folderDoc.data()
      console.log('Found in sharedFolders:', folderData)
      if (folderData.name) {
        folderName.value = folderData.name
        // Check if current user is the owner
        isOwner.value = folderData.ownerId === userId.value
        console.log('✅ Folder name set to:', folderName.value, 'isOwner:', isOwner.value)
      } else {
        console.warn('⚠️ Folder found but no name field')
        folderName.value = 'Unnamed Shared Folder'
      }
    } else {
      console.log('Not found in sharedFolders, trying folders collection')
      // Fallback to regular folders collection
      folderDoc = await getDoc(doc(firestore, 'folders', folderId))
      if (folderDoc.exists()) {
        const folderData = folderDoc.data()
        console.log('Found in folders:', folderData)
        if (folderData.name) {
          folderName.value = folderData.name
          // Check if current user is the owner (for regular folders, check userId)
          isOwner.value = folderData.userId === userId.value
          console.log('✅ Folder name set to:', folderName.value, 'isOwner:', isOwner.value)
        } else {
          console.warn('⚠️ Folder found but no name field')
          folderName.value = 'Unnamed Folder'
        }
      } else {
        console.error('❌ Shared folder not found in either collection:', folderId)
        folderName.value = 'Folder Not Found'
      }
    }
    console.log('Final folderName.value:', folderName.value)
  } catch (error) {
    console.error('❌ Error loading shared folder:', error)
    folderName.value = 'Error Loading Folder'
  }
  
  // After folder name is loaded, load following users (only for owners)
  if (isOwner.value) {
    await fetchFollowingUserDetails()
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
  <div v-if="!isLoggedIn || !userId" class="auth-required">
    <h2>Authentication Required</h2>
    <p>Please log in to access this shared folder.</p>
    <router-link to="/login" class="login-link">Go to Login</router-link>
  </div>
  
  <div v-else>
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

  <!-- Saved Posts Section - Full Width Below -->
  <div class="saved-posts-full-width">
    <div class="saved-posts-header">
      <h3>Saved Posts</h3>
    </div>
    
    <div v-if="loading" class="loading">Loading saved posts...</div>
    <div v-else-if="savedPosts.length === 0" class="no-posts">
      <p>No posts saved to this shared folder yet.</p>
    </div>
    <div v-else class="posts-list">
      <SavedPostItem
        v-for="savedPost in savedPosts"
        :key="savedPost.id"
        :savedPost="savedPost"
        :showComments="true"
        @postDeleted="handlePostDeleted"
      />
    </div>
    </div>

    <!-- Manage Users List with Invite Functionality (Only for Owners) -->
    <div v-if="isOwner" class="collaborators-list">
      <h3>Manage Users</h3>
      <ul>
        <li v-if="followingUsers.length === 0" class="no-users">
          <span>You're not following anyone to invite</span>
        </li>
        <li v-else v-for="user in followingUsers" :key="user.id" class="collaborator-row">
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
    
    <!-- Message for Non-Owners -->
    <div v-else-if="!isOwner && isLoggedIn && userId" class="non-owner-message">
      <h3>Shared Folder</h3>
      <p>You have access to view, add posts, remove posts, and comment in this shared folder.</p>
    </div>
  </div>
  </div> <!-- Close the v-else div -->
</template>

<style scoped>

.auth-required {
  text-align: center;
  padding: 2rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin: 2rem auto;
  max-width: 500px;
}

.auth-required h2 {
  color: #495057;
  margin-bottom: 1rem;
}

.auth-required p {
  color: #6c757d;
  margin-bottom: 1.5rem;
}

.login-link {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 600;
  transition: background-color 0.2s;
}

.login-link:hover {
  background-color: #0056b3;
}

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

.updates-list, .collaborators-list, .non-owner-message {
  background: #f5f9f8;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  padding: 1rem;
  width: 300px;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
  color: black;
}

.saved-posts-full-width {
  width: 570px;
}

.saved-posts-header {
  background: #f5f9f8;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
  color: black;
  margin-bottom: 1rem;
}



.updates-list h3, .collaborators-list h3, .saved-posts-header h3, .non-owner-message h3 {
  margin-bottom: 0.5rem;
  color: black;
  font-size: 1.1rem;
  font-weight: bold;
}

.updates-list ul, .collaborators-list ul {
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

.collaborator-row {
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

.no-users {
  font-style: italic;
  color: #999;
  padding: 0.5rem 0;
  text-align: center;
}

.invited-status {
  background-color: #e8f5e8;
  border: 1px solid #4caf50;
  color: #2e7d32;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
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
  background: #f5f9f8;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
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

.non-owner-message {
  text-align: center;
  background: #e8f4fd;
  border: 2px solid #b3d9f7;
  color: #2c5aa0;
}

.non-owner-message p {
  margin: 0;
  font-style: italic;
  color: #5a7ba8;
}
</style>

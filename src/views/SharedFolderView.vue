<script setup>
import { useRoute } from 'vue-router'
import { ref, onMounted, inject, watch, onUnmounted, nextTick } from 'vue'
import { firestore } from '@/firebaseResources'
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, getDocs, addDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import SavedPostItem from '@/components/SavedPostItem.vue'

const route = useRoute()
const folderId = route.params.id
const folderName = ref('Shared Folder')
const savedPosts = ref([])
const loading = ref(true)
const lastPostSavedAt = ref(null)

const userId = inject('userId')
const isLoggedIn = inject('isLoggedIn')
let unsubscribeSavedPosts = null // To store the unsubscribe function

// State for adding new posts
const newPostContent = ref('')
const isAddingPost = ref(false)

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
  if (!folderId) {
    console.error('No folderId provided')
    return
  }
  
  // Load last update from storage immediately on mount to show in Updates section
  lastPostSavedAt.value = loadLastUpdateFromStorage()
  
  // Get folder details from Firestore (check both regular folders and shared folders)
  try {
    // First try the sharedFolders collection
    let folderDoc = await getDoc(doc(firestore, 'sharedFolders', folderId))
    if (folderDoc.exists()) {
      folderName.value = folderDoc.data().name
    } else {
      // Fallback to regular folders collection with shared suffix
      folderDoc = await getDoc(doc(firestore, 'folders', folderId))
      if (folderDoc.exists()) {
        folderName.value = folderDoc.data().name
      } else {
        console.error('Shared folder not found:', folderId)
        folderName.value = 'Shared Folder'
      }
    }
  } catch (error) {
    console.error('Error loading shared folder:', error)
    folderName.value = 'Shared Folder'
  }
  
  // The watcher with immediate: true will handle setting up the listener
})

// Clean up listener when component unmounts
onUnmounted(() => {
  if (unsubscribeSavedPosts) {
    unsubscribeSavedPosts()
  }
})

// Function to add a new post to the shared folder
async function addPost() {
  if (!newPostContent.value.trim() || !userId.value || isAddingPost.value) return
  
  isAddingPost.value = true
  
  try {
    const auth = getAuth()
    const currentUser = auth.currentUser
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'Anonymous User'
    
    const postData = {
      postContent: newPostContent.value.trim(),
      postAuthor: userDisplayName,
      postTimestamp: new Date(),
      savedAt: new Date(),
      folderId: folderId,
      userId: userId.value, // User who added the post
      postId: `shared-post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique post ID
      isSharedFolderPost: true // Mark as shared folder post
    }
    
    await addDoc(collection(firestore, 'savedPosts'), postData)
    
    // Clear the input
    newPostContent.value = ''
    
    console.log('Post added to shared folder successfully')
  } catch (error) {
    console.error('Error adding post to shared folder:', error)
  } finally {
    isAddingPost.value = false
  }
}

// Handle keyboard shortcuts for posting
function handleKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    addPost()
  }
}

// Handle post deletion from folder
function handlePostDeleted(deletedPostId) {
  // Remove the deleted post from the local array
  savedPosts.value = savedPosts.value.filter(post => post.id !== deletedPostId)
  
  // Note: The Firestore listener will also update the list automatically,
  // but removing it locally provides immediate UI feedback
}

// Mock data for updates and collaborators (different from followers for shared folders)
const collaborators = [
  { name: 'Alice' },
  { name: 'Bob' },
  { name: 'Charlie' },
]
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
    
    <!-- Add Post Section - Moved below saved posts -->
    <div v-if="isLoggedIn" class="add-post-section">
      <h3>Add a Post</h3>
      <div class="add-post-input">
        <textarea 
          v-model="newPostContent"
          placeholder="What's on your mind?"
          rows="3"
          :disabled="isAddingPost"
          @keydown="handleKeydown"
        ></textarea>
        <button 
          @click="addPost"
          :disabled="!newPostContent.trim() || isAddingPost"
          class="add-post-btn"
        >
          {{ isAddingPost ? 'Adding...' : 'Post' }}
        </button>
      </div>
    </div>
    </div>

    <!-- Collaborators List with Invite Button -->
    <div class="collaborators-list">
      <h3>Manage Users</h3>
      <ul>
        <li v-for="(collaborator, idx) in collaborators" :key="idx" class="collaborator-row">
          <span>{{ collaborator.name }}</span>
          <button class="invite-btn">Invite</button>
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

.updates-list, .collaborators-list {
  background: #f5f9f8;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  padding: 1rem;
  min-width: 300px;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
  color: black;
}

.saved-posts-full-width {
  width: 550px;
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

.add-post-section {
  background: #f5f9f8;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
  margin-bottom: 1rem;
}

.add-post-input {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.add-post-input textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #7b9ad5;
  border-radius: 5px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  box-sizing: border-box;
}

.add-post-input textarea:focus {
  outline: none;
  border-color: #3a6c97;
  box-shadow: 0 0 0 2px rgba(123, 154, 213, 0.2);
}

.add-post-btn {
  align-self: flex-end;
  background-color: #7b9ad5;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.add-post-btn:hover:not(:disabled) {
  background-color: #3a6c97;
}

.add-post-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.updates-list h3, .collaborators-list h3, .saved-posts-header h3, .add-post-section h3 {
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
  margin-bottom: 0.5rem;
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
</style>

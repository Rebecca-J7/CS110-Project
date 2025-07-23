<script setup>
import { ref, inject, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { firestore } from '@/firebaseResources'
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const userFolders = inject('userFolders', ref([]))
const userId = inject('userId', ref(''))
const isLoggedIn = inject('isLoggedIn', ref(false))
const auth = getAuth()
const sharedFolders = ref([]) // Add shared folders state
const sharedFoldersLoaded = ref(false) // Track if shared folders have been loaded
let unsubscribeOwnedFolders = null // Store unsubscribe function
let unsubscribeSharedWithFolders = null // Store unsubscribe function

defineProps({
  post: {
    type: Object,
    required: true
  }
})

const showMenu = ref(false)
const savingToFolder = ref(null) // Track which folder is being saved to

// Compute all available folders (regular + shared)
const allFolders = computed(() => {
  // If user is logged in but shared folders haven't loaded yet, wait for them
  if (isLoggedIn.value && !sharedFoldersLoaded.value) {
    return [...userFolders.value] // Only show regular folders for now
  }
  const combined = [...userFolders.value, ...sharedFolders.value]
  return combined
})

// Set up shared folders listener
function setupSharedFoldersListener() {
  if (!isLoggedIn.value || !userId.value) {
    sharedFoldersLoaded.value = true // No shared folders to load
    return
  }

  try {
    let ownedFoldersLoaded = false
    let sharedWithFoldersLoaded = false
    
    // Function to check if both queries have completed their initial load
    const checkLoadComplete = () => {
      if (ownedFoldersLoaded && sharedWithFoldersLoaded) {
        sharedFoldersLoaded.value = true
      }
    }
    
    // Set up real-time listener for owned folders
    const ownedQuery = query(
      collection(firestore, 'sharedFolders'),
      where('ownerId', '==', userId.value)
    )
    
    unsubscribeOwnedFolders = onSnapshot(ownedQuery, (ownedSnapshot) => {
      try {
        // Process owned folders
        const ownedFolders = ownedSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            isShared: true,
            isOwner: true,
            name: doc.data().name + ' (Shared)'
          }))
          .filter(folder => folder.ownerId === userId.value)
        
        // Update shared folders with owned folders and preserve any shared folders
        updateSharedFolders(ownedFolders, 'owned')
        
        // Mark owned folders as loaded
        if (!ownedFoldersLoaded) {
          ownedFoldersLoaded = true
          checkLoadComplete()
        }
      } catch (error) {
        console.error('PostItem - Error processing owned folders:', error)
        if (!ownedFoldersLoaded) {
          ownedFoldersLoaded = true
          checkLoadComplete()
        }
      }
    }, (error) => {
      console.error('PostItem - Error in owned folders listener:', error)
      if (!ownedFoldersLoaded) {
        ownedFoldersLoaded = true
        checkLoadComplete()
      }
    })
    
    // Set up real-time listener for shared folders - this will catch new invitations
    const sharedWithQuery = query(
      collection(firestore, 'sharedFolders'),
      where('sharedWith', 'array-contains', userId.value)
    )
    
    unsubscribeSharedWithFolders = onSnapshot(sharedWithQuery, (sharedSnapshot) => {
      try {
        // Process shared folders
        const sharedWithFolders = sharedSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            isShared: true,
            isOwner: false,
            name: doc.data().name + ' (Shared)'
          }))
          .filter(folder => 
            folder.sharedWith && 
            Array.isArray(folder.sharedWith) && 
            folder.sharedWith.includes(userId.value)
          )
        
        // Update shared folders with shared folders and preserve any owned folders
        updateSharedFolders(sharedWithFolders, 'shared')
        
        // Mark shared folders as loaded
        if (!sharedWithFoldersLoaded) {
          sharedWithFoldersLoaded = true
          checkLoadComplete()
        }
      } catch (error) {
        console.error('PostItem - Error processing shared folders:', error)
        if (!sharedWithFoldersLoaded) {
          sharedWithFoldersLoaded = true
          checkLoadComplete()
        }
      }
    }, (error) => {
      console.error('PostItem - Error in shared folders listener:', error)
      if (!sharedWithFoldersLoaded) {
        sharedWithFoldersLoaded = true
        checkLoadComplete()
      }
    })
    
  } catch (error) {
    console.error('PostItem - Error setting up shared folders listener:', error)
    sharedFolders.value = []
    sharedFoldersLoaded.value = true
  }
}

// Helper function to update shared folders without losing existing data
function updateSharedFolders(newFolders, type) {
  const currentFolders = [...sharedFolders.value]
  
  if (type === 'owned') {
    // Remove existing owned folders and add new ones
    const filteredFolders = currentFolders.filter(folder => !folder.isOwner)
    sharedFolders.value = [...filteredFolders, ...newFolders]
  } else if (type === 'shared') {
    // Remove existing shared folders and add new ones
    const filteredFolders = currentFolders.filter(folder => folder.isOwner)
    sharedFolders.value = [...filteredFolders, ...newFolders]
  }
  
  // Remove any duplicates based on ID
  const uniqueFolders = sharedFolders.value.filter((folder, index, arr) => 
    arr.findIndex(f => f.id === folder.id) === index
  )
  
  sharedFolders.value = uniqueFolders
}

// Initialize listener when component mounts
onMounted(() => {
  if (isLoggedIn.value && userId.value) {
    setupSharedFoldersListener()
  }
})

// Watch for authentication state changes
watch([isLoggedIn, userId], ([newIsLoggedIn, newUserId]) => {
  // Clean up existing listeners first
  if (unsubscribeOwnedFolders) {
    unsubscribeOwnedFolders()
    unsubscribeOwnedFolders = null
  }
  if (unsubscribeSharedWithFolders) {
    unsubscribeSharedWithFolders()
    unsubscribeSharedWithFolders = null
  }
  
  // Reset shared folders state
  sharedFolders.value = []
  sharedFoldersLoaded.value = false
  
  if (newIsLoggedIn && newUserId) {
    setupSharedFoldersListener()
  } else {
    sharedFoldersLoaded.value = true // No need to load if not logged in
  }
}, { immediate: false })

// Cleanup listeners when component unmounts
onUnmounted(() => {
  if (unsubscribeOwnedFolders) {
    unsubscribeOwnedFolders()
  }
  if (unsubscribeSharedWithFolders) {
    unsubscribeSharedWithFolders()
  }
  // Clean up click outside listener
  document.removeEventListener('click', handleClickOutside)
})

function toggleMenu() {
  // If shared folders haven't loaded yet and user is logged in, ensure they're loaded
  if (isLoggedIn.value && userId.value && !sharedFoldersLoaded.value) {
    setupSharedFoldersListener()
  }
  
  showMenu.value = !showMenu.value
  
  // Add click outside listener when menu opens
  if (showMenu.value) {
    // Use nextTick to ensure the menu is rendered before adding the listener
    nextTick(() => {
      document.addEventListener('click', handleClickOutside)
    })
  } else {
    // Remove listener when menu closes
    document.removeEventListener('click', handleClickOutside)
  }
}

function closeMenu() {
  showMenu.value = false
  // Remove the click outside listener
  document.removeEventListener('click', handleClickOutside)
}

// Handle clicks outside the menu to close it
function handleClickOutside(event) {
  // Find the menu container element
  const menuContainer = event.target.closest('.menu-container')
  
  // If the click was not inside any menu container, close the menu
  if (!menuContainer) {
    closeMenu()
  }
}

// Activity logging function for shared folder activities
async function logActivity(folderId, activityType, activityData = {}) {
  // Only log activities for shared folders
  if (!folderId || !isLoggedIn.value || !userId.value) return
  
  try {
    const auth = getAuth()
    const currentUser = auth.currentUser
    
    if (!currentUser) return
    
    // Check if this is a shared folder by looking it up
    const isSharedFolder = sharedFolders.value.some(folder => folder.id === folderId)
    if (!isSharedFolder) return // Only log for shared folders
    
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

async function saveToFolder(folderId, folderName, post) {
  const user = auth.currentUser
  if (!user) {
    console.error('User not authenticated')
    return
  }

  if (!folderId || !post.id) {
    console.error('Missing required data:', { folderId, postId: post.id })
    return
  }

  savingToFolder.value = folderId

  try {
    // Check if post is already saved to this folder
    const existingQuery = query(
      collection(firestore, 'savedPosts'),
      where('userId', '==', user.uid),
      where('folderId', '==', folderId),
      where('postId', '==', post.id)
    )
    
    const existingDocs = await getDocs(existingQuery)
    if (!existingDocs.empty) {
      closeMenu()
      savingToFolder.value = null
      return
    }

    // Before adding the post, clean up any old comments and activities for this post in this folder
    await cleanupOldPostData(folderId, post.id)

    const docRef = await addDoc(collection(firestore, 'savedPosts'), {
      userId: user.uid,
      folderId: folderId,
      folderName: folderName,
      postId: post.id,
      postContent: post.content,
      postAuthor: post.authorEmail || 'unknown@example.com',
      postTimestamp: post.timestamp,
      savedAt: serverTimestamp(),
      // Add a unique identifier for this specific saved post instance
      savedPostInstanceId: `${folderId}_${post.id}_${Date.now()}`
    })
    
    // Log activity for post added to shared folder
    logActivity(folderId, 'post_added', { 
      postId: post.id,
      postContent: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
      postAuthor: post.authorEmail || 'unknown@example.com',
      savedPostInstanceId: `${folderId}_${post.id}_${Date.now()}`
    })
    
    closeMenu()
  } catch (error) {
    console.error('Error saving post to folder:', error)
  } finally {
    savingToFolder.value = null
  }
}

// Function to clean up old comments and activities when a post is re-added to a folder
async function cleanupOldPostData(folderId, postId) {
  try {
    // Clean up comments for this post that are folder-specific or general
    const commentsQuery = query(
      collection(firestore, 'comments'),
      where('postId', '==', postId)
    )
    
    const commentsSnapshot = await getDocs(commentsQuery)
    const deleteCommentPromises = commentsSnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    )
    
    // Clean up activities related to this post in this folder
    const activitiesQuery = query(
      collection(firestore, 'activities'),
      where('folderId', '==', folderId)
    )
    
    const activitiesSnapshot = await getDocs(activitiesQuery)
    // Filter activities related to this specific post
    const postRelatedActivities = activitiesSnapshot.docs.filter(doc => {
      const data = doc.data()
      return data.postId === postId || 
            (data.activityData && data.activityData.postId === postId)
    })
    
    const deleteActivityPromises = postRelatedActivities.map(doc => 
      deleteDoc(doc.ref)
    )
    
    // Execute all deletions
    await Promise.all([...deleteCommentPromises, ...deleteActivityPromises])
    
    console.log('Cleaned up old data for post', postId, 'in folder', folderId)
  } catch (error) {
    console.error('Error cleaning up old post data:', error)
  }
}

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
</script>

<template>
  <div class="post-header">
    <p><strong>@{{ post.authorEmail || 'unknown@example.com' }}</strong> on {{ formatDate(post.timestamp) }}</p>
    <div class="menu-container" v-if="isLoggedIn">
      <button class="dots-btn" @click="toggleMenu" aria-label="Post options">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </button>
      <div v-if="showMenu" class="dropdown-menu">
        <div v-if="isLoggedIn && !sharedFoldersLoaded" class="dropdown-item loading-item">
          Loading shared folders...
        </div>
        <button
          v-for="folder in allFolders"
          :key="folder.id"
          class="dropdown-item"
          @click="saveToFolder(folder.id, folder.name, post)"
          :disabled="savingToFolder === folder.id"
          >
            {{ savingToFolder === folder.id ? 'Saving...' : `Save to ${folder.name}` }}
        </button>
        <div v-if="isLoggedIn && sharedFoldersLoaded && allFolders.length === 0" class="dropdown-item no-folders-item">
          No folders available
        </div>
      </div>
    </div>
  </div>
  <p class="post-content">{{ post.content }}</p>
</template>

<style scoped>
.post-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  margin: 0.5rem;
  color: #555;
  line-height: 0.5rem;
}

.post-content {
  font-family: Arial, sans-serif;
  font-size: 1rem;
  padding-left: 1rem;
  color: black;
}

.menu-container {
  position: relative;
  display: flex;
  align-items: center;
}

.dots-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.3rem;
  display: flex;
  flex-direction: row;
  gap: 3px;
  align-items: center;
}

.dot {
  width: 5px;
  height: 5px;
  background:black;
  border-radius: 50%;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  top: 120%;
  right: 0;
  background:#f5f9f8;
  border: 2px solid #7b9ad5;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
  min-width: 160px;
  z-index: 10;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column; /* ensures vertical column */
  gap: 0.2rem;  
}

.dropdown-item {
  background: none;
  border: none;
  width:200px;
  text-align: center;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  color: black;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #e3eaf7;
}

.loading-item, .no-folders-item {
  color: #666;
  font-style: italic;
  cursor: default !important;
}

.loading-item:hover, .no-folders-item:hover {
  background: transparent !important;
}
</style>
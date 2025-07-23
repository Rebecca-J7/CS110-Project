<script setup>
import { ref, inject, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { firestore } from '@/firebaseResources'
import { collection, addDoc, deleteDoc, updateDoc, doc, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const folders = inject('userFolders', ref([]))
const userId = inject('userId', ref(''))
const isLoggedIn = inject('isLoggedIn', ref(false))
const sharedFolders = ref([]) // Track shared folders from Firestore
const sharedFoldersLoaded = ref(false) // Track if shared folders have been loaded
let unsubscribeOwnedFolders = null // Store unsubscribe function
let unsubscribeSharedWithFolders = null // Store unsubscribe function

const newFolderName = ref('')
const openMenuId = ref(null)
const auth = getAuth()
const selectedFilter = ref('all') // 'all', 'your', or 'shared'

// Computed property to filter folders based on selected filter
const filteredFolders = computed(() => {
  if (selectedFilter.value === 'shared') {
    return sharedFolders.value
  } else if (selectedFilter.value === 'your') {
    return folders.value // Show only user's own folders
  } else {
    // 'all' - combine both regular and shared folders
    return [...folders.value, ...sharedFolders.value]
  }
})

// Computed property to determine the route path based on filter
const folderRoutePath = computed(() => {
  return selectedFilter.value === 'shared' ? '/shared-folder' : '/folder'
})

// Computed property to determine if folder creation should be allowed
const canCreateFolder = computed(() => {
  return selectedFilter.value !== 'shared'
})

function selectFilter(filterType) {
  selectedFilter.value = filterType
}

// Function to get the correct route based on folder type
function getFolderRoute(folder) {
  // If folder has ownerId, it's a shared folder
  return folder.ownerId ? '/shared-folder' : '/folder'
}

// Function to determine if user can delete a folder
function canDeleteFolder(folder) {
  // User can delete if:
  // 1. It's a regular folder (no ownerId) and they own it (userId matches)
  // 2. It's a shared folder (has ownerId) and they are the owner (ownerId matches userId)
  if (folder.ownerId) {
    // Shared folder - only owner can delete
    return folder.ownerId === userId.value
  } else {
    // Regular folder - only owner can delete
    return folder.userId === userId.value
  }
}

// Set up Firestore listener for shared folders
function setupSharedFoldersListener() {
  console.log('SavedPostsView setupSharedFoldersListener called', { isLoggedIn: isLoggedIn.value, userId: userId.value })
  
  if (!isLoggedIn.value || !userId.value) {
    console.log('SavedPostsView - User not ready, marking folders as loaded')
    sharedFoldersLoaded.value = true // No shared folders to load
    return
  }

  try {
    let ownedFoldersLoaded = false
    let sharedWithFoldersLoaded = false
    
    // Function to check if both queries have completed their initial load
    const checkLoadComplete = () => {
      if (ownedFoldersLoaded && sharedWithFoldersLoaded) {
        console.log('SavedPostsView - Both folder queries completed')
        sharedFoldersLoaded.value = true
      }
    }
    
    console.log('SavedPostsView - Setting up owned folders listener')
    // Set up real-time listener for owned folders
    const ownedQuery = query(
      collection(firestore, 'sharedFolders'),
      where('ownerId', '==', userId.value)
    )
    
    unsubscribeOwnedFolders = onSnapshot(ownedQuery, (ownedSnapshot) => {
      try {
        console.log('SavedPostsView - Owned folders snapshot:', ownedSnapshot.docs.length, 'documents')
        // Process owned folders
        const ownedFolders = ownedSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isShared: true,
          isOwner: true
        }))
        
        console.log('SavedPostsView - Processed owned folders:', ownedFolders)
        
        // Update shared folders with owned folders and preserve any shared folders
        updateSharedFolders(ownedFolders, 'owned')
        
        // Mark owned folders as loaded
        if (!ownedFoldersLoaded) {
          ownedFoldersLoaded = true
          console.log('SavedPostsView - Owned folders marked as loaded')
          checkLoadComplete()
        }
      } catch (error) {
        console.error('SavedPostsView - Error processing owned folders:', error)
        if (!ownedFoldersLoaded) {
          ownedFoldersLoaded = true
          checkLoadComplete()
        }
      }
    }, (error) => {
      console.error('SavedPostsView - Error in owned folders listener:', error)
      if (!ownedFoldersLoaded) {
        ownedFoldersLoaded = true
        checkLoadComplete()
      }
    })
    
    console.log('SavedPostsView - Setting up shared folders listener')
    // Set up real-time listener for shared folders
    const sharedWithQuery = query(
      collection(firestore, 'sharedFolders'),
      where('sharedWith', 'array-contains', userId.value)
    )
    
    unsubscribeSharedWithFolders = onSnapshot(sharedWithQuery, (sharedSnapshot) => {
      try {
        console.log('SavedPostsView - Shared folders snapshot:', sharedSnapshot.docs.length, 'documents')
        // Process shared folders
        const sharedWithFolders = sharedSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isShared: true,
          isOwner: false
        }))
        
        console.log('SavedPostsView - Processed shared folders:', sharedWithFolders)
        
        // Update shared folders with shared folders and preserve any owned folders
        updateSharedFolders(sharedWithFolders, 'shared')
        
        // Mark shared folders as loaded
        if (!sharedWithFoldersLoaded) {
          sharedWithFoldersLoaded = true
          console.log('SavedPostsView - Shared folders marked as loaded')
          checkLoadComplete()
        }
      } catch (error) {
        console.error('SavedPostsView - Error processing shared folders:', error)
        if (!sharedWithFoldersLoaded) {
          sharedWithFoldersLoaded = true
          checkLoadComplete()
        }
      }
    }, (error) => {
      console.error('SavedPostsView - Error in shared folders listener:', error)
      if (!sharedWithFoldersLoaded) {
        sharedWithFoldersLoaded = true
        checkLoadComplete()
      }
    })
    
  } catch (error) {
    console.error('SavedPostsView - Error setting up shared folders listener:', error)
    sharedFolders.value = []
    sharedFoldersLoaded.value = true
  }
}

// Helper function to update shared folders without losing existing data
function updateSharedFolders(newFolders, type) {
  console.log('SavedPostsView updateSharedFolders called:', { type, newFolders, currentSharedFolders: sharedFolders.value })
  
  const currentFolders = [...sharedFolders.value]
  
  if (type === 'owned') {
    // Remove existing owned folders and add new ones
    const filteredFolders = currentFolders.filter(folder => !folder.isOwner)
    sharedFolders.value = [...filteredFolders, ...newFolders]
    console.log('SavedPostsView - Updated with owned folders:', sharedFolders.value)
  } else if (type === 'shared') {
    // Remove existing shared folders and add new ones
    const filteredFolders = currentFolders.filter(folder => folder.isOwner)
    sharedFolders.value = [...filteredFolders, ...newFolders]
    console.log('SavedPostsView - Updated with shared folders:', sharedFolders.value)
  }
  
  // Remove any duplicates based on ID
  const uniqueFolders = sharedFolders.value.filter((folder, index, arr) => 
    arr.findIndex(f => f.id === folder.id) === index
  )
  
  sharedFolders.value = uniqueFolders
  console.log('SavedPostsView - Final shared folders after dedup:', sharedFolders.value)
}

// Initialize listeners when component mounts
onMounted(() => {
  // Setup with a small delay to ensure user data is available
  nextTick(() => {
    if (isLoggedIn.value && userId.value) {
      console.log('SavedPostsView mounted - setting up shared folders listener')
      setupSharedFoldersListener()
    } else {
      console.log('SavedPostsView mounted - user not ready, waiting for auth')
      sharedFoldersLoaded.value = true
    }
  })
})

// Cleanup listeners when component unmounts
onUnmounted(() => {
  if (unsubscribeOwnedFolders) {
    unsubscribeOwnedFolders()
  }
  if (unsubscribeSharedWithFolders) {
    unsubscribeSharedWithFolders()
  }
})

// Watch for authentication state changes
watch([isLoggedIn, userId], ([newIsLoggedIn, newUserId], [oldIsLoggedIn, oldUserId]) => {
  console.log('SavedPostsView auth state changed:', { newIsLoggedIn, newUserId, oldIsLoggedIn, oldUserId })
  
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
    console.log('SavedPostsView - Setting up shared folders listener for user:', newUserId)
    setupSharedFoldersListener()
  } else {
    console.log('SavedPostsView - User not logged in, skipping shared folders setup')
    sharedFoldersLoaded.value = true // No need to load if not logged in
  }
}, { immediate: true }) // Add immediate: true to run on mount

async function createFolder() {
  if (!newFolderName.value.trim()) return
  if (!isLoggedIn.value || !userId.value) {
    console.error('User not authenticated')
    return
  }
  
  try {
    if (selectedFilter.value === 'shared') {
      // Cannot create folders in shared view
      console.error('Cannot create folders in shared view')
      return
    } else {
      // Check if user has any folders to determine if this should be the default
      const userFoldersQuery = query(
        collection(firestore, 'folders'),
        where('userId', '==', userId.value)
      )
      const userFoldersSnapshot = await getDocs(userFoldersQuery)
      const hasExistingFolders = !userFoldersSnapshot.empty
      
      // Create a regular folder (it becomes default only if it's the user's first folder)
      await addDoc(collection(firestore, 'folders'), {
        name: newFolderName.value.trim(),
        userId: userId.value,
        isDefault: !hasExistingFolders // First folder becomes default
      })
    }
    
    newFolderName.value = ''
  } catch (error) {
    console.error('Error creating folder:', error)
  }
}

async function deleteFolder(id) {
  // Determine if this is a shared folder by finding it in our filtered list
  const folderToDelete = filteredFolders.value.find(folder => folder.id === id)
  const isSharedFolder = folderToDelete && folderToDelete.ownerId
  const isDefaultFolder = folderToDelete && folderToDelete.isDefault
  
  try {
    // First, get all saved posts in this folder
    const savedPostsQuery = query(
      collection(firestore, 'savedPosts'),
      where('folderId', '==', id)
    )
    
    const savedPostsSnapshot = await getDocs(savedPostsQuery)
    
    // Delete all saved posts in this folder
    const deletePromises = savedPostsSnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    )
    
    // Wait for all saved posts to be deleted
    await Promise.all(deletePromises)
    
    // Then delete the folder itself from the appropriate collection
    if (isSharedFolder) {
      await deleteDoc(doc(firestore, 'sharedFolders', id))
    } else {
      await deleteDoc(doc(firestore, 'folders', id))
    }
    
    // If we just deleted a default folder, create a new one
    // Also check if this was the user's last regular folder
    if (!isSharedFolder) {
      const remainingUserFoldersQuery = query(
        collection(firestore, 'folders'),
        where('userId', '==', userId.value)
      )
      const remainingUserFoldersSnapshot = await getDocs(remainingUserFoldersQuery)
      
      if (remainingUserFoldersSnapshot.empty) {
        // No folders left, create a new default folder
        await addDoc(collection(firestore, 'folders'), {
          name: 'Default Folder',
          userId: userId.value,
          isDefault: true
        })
      } else if (isDefaultFolder) {
        // Still have folders but deleted the default, make the first remaining one default
        const firstRemainingFolder = remainingUserFoldersSnapshot.docs[0]
        await updateDoc(firstRemainingFolder.ref, {
          isDefault: true
        })
      }
    }
  } catch (error) {
    console.error('Error deleting folder and saved posts:', error)
  }
  
  closeMenu()
}

function toggleMenu(id) {
  const wasOpen = openMenuId.value === id
  
  // Close all menus first
  closeMenu()
  
  // If it wasn't open, open this one
  if (!wasOpen) {
    openMenuId.value = id
    
    // Add click outside listener when menu opens
    nextTick(() => {
      document.addEventListener('click', handleClickOutside)
    })
  }
}

function closeMenu() {
  openMenuId.value = null
  // Remove the click outside listener
  document.removeEventListener('click', handleClickOutside)
}

// Handle clicks outside the menu to close it
function handleClickOutside(event) {
  // Find the folder menu container element
  const menuContainer = event.target.closest('.folder-menu-container')
  
  // If the click was not inside any menu container, close the menu
  if (!menuContainer) {
    closeMenu()
  }
}

// Cleanup listeners when component unmounts
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="header-row">
    <div>
      <h2 class="title">Saved Posts</h2>
      <div class="filters-bar">
        <label>
          <input 
            type="radio" 
            name="filter" 
            :checked="selectedFilter === 'all'"
            @change="selectFilter('all')"
          />
          All Folders
        </label>
        <label>
          <input 
            type="radio" 
            name="filter"
            :checked="selectedFilter === 'your'"
            @change="selectFilter('your')"
          />
          Your Folders
        </label>
        <label>
          <input 
            type="radio" 
            name="filter"
            :checked="selectedFilter === 'shared'"
            @change="selectFilter('shared')"
          />
          Shared Folders
        </label>
      </div>
    </div>
    <div v-if="canCreateFolder" class="create-folder">
      <input 
        v-model="newFolderName" 
        placeholder="Enter new folder name" 
      />
      <button @click="createFolder">
        Create Folder
      </button>
    </div>
  </div>
  
  <div class="folders-bar">
    <div v-if="isLoggedIn && !sharedFoldersLoaded && selectedFilter !== 'your'" class="loading-folders">
      <p>Loading folders...</p>
    </div>
    <div v-else-if="filteredFolders.length === 0 && selectedFilter === 'shared'" class="no-shared-folders">
      <p>No shared folders yet. Invite someone to one of your folders to make it shared.</p>
    </div>
    <div v-else-if="filteredFolders.length === 0 && selectedFilter === 'all'" class="no-folders">
      <p>No folders found. Create your first folder above.</p>
    </div>
    <div
      v-for="folder in filteredFolders"
      :key="folder.id"
      class="folder"
      tabindex="0"
    >
      <RouterLink :to="`${getFolderRoute(folder)}/${folder.id}`">
        <img src="@/assets/folder.png" alt="Folder" class="folder-img" />
        <div class="folder-name">{{ folder.name }}</div>
        <div v-if="folder.isDefault && !folder.ownerId" class="shared-by">
        </div>
        <div v-else-if="selectedFilter === 'all' && folder.ownerId" class="shared-by">
          {{ folder.ownerId === userId ? 'Shared Folder (Owner)' : 'Shared Folder (Member)' }}
        </div>
        <div v-else-if="selectedFilter === 'shared'" class="shared-by">
          {{ folder.ownerId === userId ? 'Owner' : 'Member' }}
        </div>
      </RouterLink>
      <div v-if="canDeleteFolder(folder)" class="folder-menu-container">
        <button class="dots-btn" @click="toggleMenu(folder.id)" aria-label="Folder options">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </button>
        <div v-if="openMenuId === folder.id" class="dropdown-menu">
          <button class="dropdown-item" @click="deleteFolder(folder.id)">
            Delete Folder
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-left: 2rem;
  margin-right: 2rem;
  margin-top: 0.2rem;
  margin-bottom: 2rem;
}

.title {
  font-size: 1.7rem;
  font-weight: bold;
  color: black;
  margin-bottom: 1rem;
}

.top-bar {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
  cursor: pointer;
  margin-top: 2rem;
}

.filters-bar {
  display: flex;
  gap: 2rem;
  font-size: 1rem;
  color: black;
  margin-bottom: 0.5rem;
}

.filters-bar input[type="radio"]:hover {
  cursor: pointer;
}

.folders-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  margin-top: 2rem;
  margin-left: 2rem;
  width: calc(100vw - 12rem);
  max-width: 1600px;  
}

.folder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 160px;
  height: 180px;
  padding: 1rem 0.5rem;
  border-radius: 5px;
  background-color: rgb(123, 154, 213);
  color: #fff;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
  outline: none;
  box-sizing: border-box;
}

.folder:hover {
  background-color: rgb(58, 108, 151);
  color: #fff;
}

.folder-img {
  width: 55px;
  height: 55px;
  color:white;
  margin: 0 auto 0.5rem auto;
  display: block;
}

.folder-name {
  font-size: 1rem;
  color: #fff;
  text-align: center;
  width: 100%;
  word-break: break-word;
  margin-top: 0.3rem;
}

.shared-by {
  font-size: 0.8rem;
  color: #e0e8f0;
  text-align: center;
  width: 100%;
  margin-top: 0.2rem;
  font-style: italic;
}

.folder-menu-container {
  position: relative;
  margin-top: 0.5rem;
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
  background: #fff;
  border-radius: 50%;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  top: 120%;
  right: 0;
  background: #f5f9f8;
  border: 1px solid #7b9ad5;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
  min-width: 160px;
  z-index: 10;
  padding: 0.5rem 0;
}

.dropdown-item {
  background: none;
  border: none;
  width: 100%;
  text-align: center;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  color: black;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #fcb0b0;
}
.create-folder {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  margin-top: 3rem;
}
.create-folder input {
  padding: 0.3rem 0.7rem;
  border-radius: 5px;
  border: 2px solid #7b9ad5;
  font-size: 1rem;
}

.create-folder button {
  background-color: #7b9ad5;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.3rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.create-folder button:hover {
  background-color: #3a6c97;
}

.no-shared-folders {
  grid-column: 1 / -1;
  text-align: center;
  padding: 2rem;
  background: #f5f9f8;
  border: 2px dashed #7b9ad5;
  border-radius: 8px;
  color: #666;
  font-style: italic;
  margin: 1rem;
}

.no-shared-folders p {
  margin: 0;
  font-size: 1.1rem;
}

.loading-folders, .no-folders {
  grid-column: 1 / -1;
  text-align: center;
  padding: 2rem;
  background: #f5f9f8;
  border: 2px dashed #7b9ad5;
  border-radius: 8px;
  color: #666;
  font-style: italic;
  margin: 1rem;
}

.loading-folders p, .no-folders p {
  margin: 0;
  font-size: 1.1rem;
}
</style>
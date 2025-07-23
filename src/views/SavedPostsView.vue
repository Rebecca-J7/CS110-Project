<script setup>
import { ref, inject, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { firestore } from '@/firebaseResources'
import { collection, addDoc, deleteDoc, doc, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const folders = inject('userFolders', ref([]))
const sharedFolders = ref([]) // Track shared folders from Firestore

const newFolderName = ref('')
const openMenuId = ref(null)
const auth = getAuth()
const selectedFilter = ref('all') // 'all' or 'shared'

// Computed property to filter folders based on selected filter
const filteredFolders = computed(() => {
  if (selectedFilter.value === 'shared') {
    // Show shared folders from Firestore
    return sharedFolders.value
  }
  return folders.value // Show all folders
})

// Computed property to determine the route path based on filter
const folderRoutePath = computed(() => {
  return selectedFilter.value === 'shared' ? '/shared-folder' : '/folder'
})

function selectFilter(filterType) {
  selectedFilter.value = filterType
}

// Set up Firestore listener for shared folders
function setupSharedFoldersListener() {
  const user = auth.currentUser
  if (!user) return

  try {
    // Listen for shared folders where the user is the owner or has access
    const sharedFoldersQuery = query(
      collection(firestore, 'sharedFolders'),
      where('ownerId', '==', user.uid)
    )

    onSnapshot(sharedFoldersQuery, (snapshot) => {
      sharedFolders.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isShared: true,
        isDefault: false,
        sharedBy: 'You'
      }))
    })
  } catch (error) {
    console.error('Error setting up shared folders listener:', error)
  }
}

// Initialize listeners when component mounts
onMounted(() => {
  setupSharedFoldersListener()
})

async function createFolder() {
  if (!newFolderName.value.trim()) return
  const user = auth.currentUser
  if (!user) return
  
  try {
    if (selectedFilter.value === 'shared') {
      // Create a shared folder in Firestore
      await addDoc(collection(firestore, 'sharedFolders'), {
        name: newFolderName.value.trim(),
        ownerId: user.uid,
        sharedWith: [], // Array of user IDs who have access
        isDefault: false,
        createdAt: new Date()
      })
    } else {
      // Create a regular folder
      await addDoc(collection(firestore, 'folders'), {
        name: newFolderName.value.trim(),
        userId: user.uid,
        isDefault: false
      })
    }
    
    newFolderName.value = ''
    console.log(`${selectedFilter.value === 'shared' ? 'Shared folder' : 'Folder'} created successfully`)
  } catch (error) {
    console.error('Error creating folder:', error)
  }
}

async function deleteFolder(id) {
  console.log('deleteFolder called with id:', id)
  
  // Determine if this is a shared folder based on the current filter
  const isSharedFolder = selectedFilter.value === 'shared'
  
  // Get folder name for confirmation
  let folderToDelete
  if (isSharedFolder) {
    // For shared folders, find in the filtered list
    folderToDelete = filteredFolders.value.find(folder => folder.id === id)
  } else {
    folderToDelete = folders.value.find(folder => folder.id === id)
  }
  const folderName = folderToDelete ? folderToDelete.name : 'this folder'
  
  console.log('Found folder:', folderToDelete)
  
  // Skip confirmation and proceed with deletion
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
    
    console.log(`Deleted ${isSharedFolder ? 'shared ' : ''}folder ${id} and ${savedPostsSnapshot.docs.length} saved posts`)
  } catch (error) {
    console.error('Error deleting folder and saved posts:', error)
  }
  
  openMenuId.value = null
}

function toggleMenu(id) {
  openMenuId.value = openMenuId.value === id ? null : id
}
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
    <div class="create-folder">
      <input 
        v-model="newFolderName" 
        :placeholder="selectedFilter === 'shared' ? 'Enter new folder name' : 'Enter new folder name'" 
      />
      <button @click="createFolder">
        {{ selectedFilter === 'shared' ? 'Create Shared' : 'Create' }}
      </button>
    </div>
  </div>
  
  <div class="folders-bar">
    <div v-if="filteredFolders.length === 0 && selectedFilter === 'shared'" class="no-shared-folders">
      <p>No shared folders yet. Create a new shared folder to collaborate with others.</p>
    </div>
    <div
      v-for="folder in filteredFolders"
      :key="folder.id"
      class="folder"
      tabindex="0"
    >
      <RouterLink :to="`${folderRoutePath}/${folder.id}`">
        <img src="@/assets/folder.png" alt="Folder" class="folder-img" />
        <div class="folder-name">{{ folder.name }}</div>
        <div v-if="selectedFilter === 'shared'" class="shared-by">
          Shared Folder
        </div>
      </RouterLink>
      <div v-if="!folder.isDefault" class="folder-menu-container">
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
</style>
<template>
  <div class="saved-post">
    <div class="post-header">
      <p><strong>@{{ savedPost.postAuthor }}</strong> on {{ formatDate(savedPost.postTimestamp) }}</p>
      <div class="menu-container" v-if="isLoggedIn">
        <button class="dots-btn" @click="toggleMenu" aria-label="Post options">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </button>
        <div v-if="showMenu" class="dropdown-menu">
          <button
            class="dropdown-item delete-item"
            @click="deleteFromFolder"
            :disabled="isDeleting"
          >
            {{ isDeleting ? 'Removing...' : 'Remove from folder' }}
          </button>
          <hr class="dropdown-divider">
          <button
            v-for="folder in otherFolders"
            :key="folder.id"
            class="dropdown-item"
            @click="saveToFolder(folder.id, folder.name)"
            :disabled="savingToFolder === folder.id"
          >
            {{ savingToFolder === folder.id ? 'Saving...' : `Save to ${folder.name}` }}
          </button>
        </div>
      </div>
    </div>
    <p class="post-content">{{ savedPost.postContent }}</p>
  </div>
</template>

<script setup>
import { ref, inject, computed } from 'vue'
import { firestore } from '@/firebaseResources'
import { collection, addDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentFolderId = route.params.id

const userFolders = inject('userFolders', ref([]))
const userId = inject('userId', ref(''))
const isLoggedIn = inject('isLoggedIn', ref(false))
const auth = getAuth()

const showMenu = ref(false)
const savingToFolder = ref(null)
const isDeleting = ref(false)

const props = defineProps({
  savedPost: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['postDeleted'])

// Compute folders excluding the current folder
const otherFolders = computed(() => {
  return userFolders.value.filter(folder => folder.id !== currentFolderId)
})

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function closeMenu() {
  showMenu.value = false
}

async function deleteFromFolder() {
  const user = auth.currentUser
  if (!user) {
    console.error('User not authenticated')
    alert('Please log in to remove posts')
    return
  }

  if (!props.savedPost.id) {
    console.error('Missing saved post ID')
    alert('Error: Missing post information')
    return
  }

  isDeleting.value = true

  try {
    // Delete the saved post document
    await deleteDoc(doc(firestore, 'savedPosts', props.savedPost.id))
    
    alert('Post removed from folder successfully!')
    closeMenu()
    
    // Emit event to parent to refresh the list
    emit('postDeleted', props.savedPost.id)
  } catch (error) {
    console.error('Error removing post from folder:', error)
    alert(`Failed to remove post: ${error.message}`)
  } finally {
    isDeleting.value = false
  }
}

async function saveToFolder(folderId, folderName) {
  const user = auth.currentUser
  if (!user) {
    console.error('User not authenticated')
    alert('Please log in to save posts')
    return
  }

  if (!folderId || !props.savedPost.postId) {
    console.error('Missing required data:', { folderId, postId: props.savedPost.postId })
    alert('Error: Missing folder or post information')
    return
  }

  savingToFolder.value = folderId

  try {
    // Check if post is already saved to this folder
    const existingQuery = query(
      collection(firestore, 'savedPosts'),
      where('userId', '==', user.uid),
      where('folderId', '==', folderId),
      where('postId', '==', props.savedPost.postId)
    )
    
    const existingDocs = await getDocs(existingQuery)
    if (!existingDocs.empty) {
      alert(`Post already saved to ${folderName}`)
      closeMenu()
      savingToFolder.value = null
      return
    }

    // Create new saved post document
    await addDoc(collection(firestore, 'savedPosts'), {
      userId: user.uid,
      folderId: folderId,
      folderName: folderName,
      postId: props.savedPost.postId,
      postContent: props.savedPost.postContent,
      postAuthor: props.savedPost.postAuthor,
      postTimestamp: props.savedPost.postTimestamp,
      savedAt: serverTimestamp()
    })
    
    alert(`Post successfully saved to ${folderName}!`)
    closeMenu()
  } catch (error) {
    console.error('Error saving post to folder:', error)
    alert(`Failed to save post: ${error.message}`)
  } finally {
    savingToFolder.value = null
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

<style scoped>
.saved-post {
  background: #f5f9f8;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: #555;
}

.post-content {
  font-family: Arial, sans-serif;
  font-size: 1rem;
  color: black;
  margin: 0;
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
  background: black;
  border-radius: 50%;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  top: 120%;
  right: 0;
  background: #f5f9f8;
  border: 2px solid #7b9ad5;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
  min-width: 180px;
  z-index: 10;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.dropdown-item {
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  color: black;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #e3eaf7;
}

.dropdown-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.delete-item {
  color: #d32f2f;
  font-weight: 500;
}

.delete-item:hover {
  background: #ffebee;
}

.dropdown-divider {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 0.5rem 0;
}
</style>

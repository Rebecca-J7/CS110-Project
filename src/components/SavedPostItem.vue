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
    
    <!-- Comments Section for Shared Folders -->
    <div v-if="showComments" class="comments-section">
      <div class="comments-header">
        <h4>Comments</h4>
      </div>
      
      <!-- Add new comment -->
      <div class="add-comment">
        <input 
          type="text" 
          placeholder="Add a comment... (functionality coming soon)"
          class="comment-input"
          v-model="newComment"
          @keydown="handleCommentKeydown"
        />
        <button class="comment-btn" :disabled="!newComment.trim()" @click="addComment">
          Comment
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, onMounted, watch } from 'vue'
import { firestore } from '@/firebaseResources'
import { collection, addDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore'
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
const newComment = ref('')
const sharedFolders = ref([]) // Add shared folders state

const props = defineProps({
  savedPost: {
    type: Object,
    required: true
  },
  showComments: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['postDeleted'])

// Set up shared folders listener
function setupSharedFoldersListener() {
  const user = auth.currentUser
  if (!user || !userId.value) {
    console.log('User not authenticated, skipping shared folders listener setup')
    return
  }

  try {
    console.log('Setting up shared folders listener for user:', user.uid)
    // For now, get ALL shared folders since we don't have access control implemented yet
    // TODO: Later implement proper access control with sharedWith array
    const sharedFoldersQuery = query(collection(firestore, 'sharedFolders'))

    onSnapshot(sharedFoldersQuery, (snapshot) => {
      console.log('Shared folders snapshot received:', snapshot.docs.length, 'folders')
      sharedFolders.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isShared: true,
        name: doc.data().name + ' (Shared)'
      }))
      console.log('Updated shared folders:', sharedFolders.value)
    }, (error) => {
      console.error('Error in shared folders listener:', error)
    })
  } catch (error) {
    console.error('Error setting up shared folders listener:', error)
  }
}

// Initialize listener when component mounts and when authentication state changes
onMounted(() => {
  console.log('SavedPostItem mounted, isLoggedIn:', isLoggedIn.value, 'userId:', userId.value)
  if (isLoggedIn.value && userId.value) {
    setupSharedFoldersListener()
  }
})

// Watch for authentication state changes
watch([isLoggedIn, userId], ([newIsLoggedIn, newUserId]) => {
  console.log('Auth state changed - isLoggedIn:', newIsLoggedIn, 'userId:', newUserId)
  if (newIsLoggedIn && newUserId) {
    setupSharedFoldersListener()
  } else {
    sharedFolders.value = []
  }
}, { immediate: false })

// Compute folders excluding the current folder (include both regular and shared folders)
const otherFolders = computed(() => {
  const regularFolders = userFolders.value.filter(folder => folder.id !== currentFolderId)
  const availableSharedFolders = sharedFolders.value.filter(folder => folder.id !== currentFolderId)
  
  const combined = [...regularFolders, ...availableSharedFolders]
  console.log('Computing otherFolders:')
  console.log('- Regular folders:', regularFolders.length)
  console.log('- Shared folders:', availableSharedFolders.length)
  console.log('- Total combined:', combined.length)
  console.log('- Current folder ID:', currentFolderId)
  
  return combined
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
    return
  }

  if (!props.savedPost.id) {
    console.error('Missing saved post ID')
    return
  }

  isDeleting.value = true

  try {
    // Delete the saved post document
    await deleteDoc(doc(firestore, 'savedPosts', props.savedPost.id))
    
    closeMenu()
    
    // Emit event to parent to refresh the list
    emit('postDeleted', props.savedPost.id)
  } catch (error) {
    console.error('Error removing post from folder:', error)
  } finally {
    isDeleting.value = false
  }
}

async function saveToFolder(folderId, folderName) {
  const user = auth.currentUser
  if (!user) {
    console.error('User not authenticated')
    return
  }

  if (!folderId || !props.savedPost.postId) {
    console.error('Missing required data:', { folderId, postId: props.savedPost.postId })
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
    
    closeMenu()
  } catch (error) {
    console.error('Error saving post to folder:', error)
  } finally {
    savingToFolder.value = null
  }
}

// Handle adding comments (for now just clears the input)
function addComment() {
  if (!newComment.value.trim()) return
  
  // For now, just clear the comment input and show a brief feedback
  // In the future, this would save the comment to Firestore
  const commentText = newComment.value.trim()
  console.log('Comment would be added:', commentText)
  
  // Provide brief visual feedback (could be expanded to show a toast notification)
  newComment.value = ''
  
  // TODO: Implement actual comment storage and display
}

// Handle keyboard shortcuts for commenting
function handleCommentKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    addComment()
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

/* Comments Section Styles */
.comments-section {
  margin-top: 1rem;
  border-top: 1px solid #e0e0e0;
  padding-top: 1rem;
}

.comments-header h4 {
  margin: 0 0 0.8rem 0;
  font-size: 1rem;
  color: #333;
  font-weight: 600;
}

.add-comment {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.comment-input {
  flex: 1;
  padding: 0.6rem;
  border: 1px solid #7b9ad5;
  border-radius: 4px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.comment-input:focus {
  border-color: #3a6c97;
  box-shadow: 0 0 0 2px rgba(123, 154, 213, 0.1);
}

.comment-btn {
  background-color: #7b9ad5;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.comment-btn:hover:not(:disabled) {
  background-color: #3a6c97;
}

.comment-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>

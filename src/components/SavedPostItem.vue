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
      
      <!-- Existing Comments -->
      <div v-if="comments.length > 0" class="comments-list">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-header">
            <span class="comment-author">{{ comment.authorName }}</span>
            <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
            <button 
              v-if="comment.authorId === userId && isLoggedIn"
              @click="deleteComment(comment.id, comment.authorId)"
              class="delete-comment-btn"
              title="Delete comment"
            >
              ×
            </button>
          </div>
          <p class="comment-content">{{ comment.content }}</p>
        </div>
      </div>
      
      <!-- Add new comment -->
      <div class="add-comment">
        <input 
          type="text" 
          placeholder="Add a comment..."
          class="comment-input"
          v-model="newComment"
          @keydown="handleCommentKeydown"
          :disabled="isAddingComment"
        />
        <button 
          class="comment-btn" 
          :disabled="!newComment.trim() || isAddingComment" 
          @click="addComment"
        >
          {{ isAddingComment ? 'Adding...' : 'Comment' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
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
const comments = ref([]) // Store comments for this post
const isAddingComment = ref(false) // Track comment adding state
const sharedFolders = ref([]) // Add shared folders state
let unsubscribeOwnedFolders = null // Store unsubscribe function
let unsubscribeSharedWithFolders = null // Store unsubscribe function
let unsubscribeComments = null // Store comments listener unsubscribe function

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
  if (!isLoggedIn.value || !userId.value) {
    return
  }

  try {
    
    // Create a combined query function to get both owned and shared folders
    async function fetchAccessibleFolders() {
      try {
        // Get folders owned by user
        const ownedQuery = query(
          collection(firestore, 'sharedFolders'),
          where('ownerId', '==', userId.value)
        )
        
        // Get folders where user is in sharedWith array
        const sharedWithQuery = query(
          collection(firestore, 'sharedFolders'),
          where('sharedWith', 'array-contains', userId.value)
        )
        
        const [ownedSnapshot, sharedSnapshot] = await Promise.all([
          getDocs(ownedQuery),
          getDocs(sharedWithQuery)
        ])
        
        const ownedFolders = ownedSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            isShared: true,
            isOwner: true,
            name: doc.data().name + ' (Shared)'
          }))
          .filter(folder => folder.ownerId === userId.value) // Double-check ownership
        
        const sharedWithFolders = sharedSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            isShared: true,
            isOwner: false,
            name: doc.data().name + ' (Shared)'
          }))
          .filter(folder => 
            // Ensure user is still in sharedWith array and folder still exists
            folder.sharedWith && 
            Array.isArray(folder.sharedWith) && 
            folder.sharedWith.includes(userId.value)
          )
        
        // Combine and remove duplicates
        const allFolders = [...ownedFolders, ...sharedWithFolders]
        const uniqueFolders = allFolders.filter((folder, index, arr) => 
          arr.findIndex(f => f.id === folder.id) === index
        )
        
        // Debug logging to see what folders are being included
        console.log('Current userId:', userId.value)
        console.log('All accessible folders:', uniqueFolders.map(f => ({
          id: f.id,
          name: f.name,
          ownerId: f.ownerId,
          sharedWith: f.sharedWith,
          isOwner: f.isOwner
        })))
        
        sharedFolders.value = uniqueFolders
      } catch (error) {
        console.error('Error fetching accessible folders:', error)
      }
    }
    
    // Initial fetch
    fetchAccessibleFolders()
    
    // Set up real-time listener for owned folders
    const ownedQuery = query(
      collection(firestore, 'sharedFolders'),
      where('ownerId', '==', userId.value)
    )
    
    unsubscribeOwnedFolders = onSnapshot(ownedQuery, () => {
      fetchAccessibleFolders() // Refetch when owned folders change
    }, (error) => {
      console.error('Error in owned folders listener:', error)
    })
    
    // Set up real-time listener for shared folders
    const sharedWithQuery = query(
      collection(firestore, 'sharedFolders'),
      where('sharedWith', 'array-contains', userId.value)
    )
    
    unsubscribeSharedWithFolders = onSnapshot(sharedWithQuery, () => {
      fetchAccessibleFolders() // Refetch when shared folders change
    }, (error) => {
      console.error('Error in shared folders listener:', error)
    })
    
  } catch (error) {
    console.error('Error setting up shared folders listener:', error)
  }
}

// Set up comments listener for this post
function setupCommentsListener() {
  if (!props.showComments || !props.savedPost.postId) {
    return
  }

  try {
    const commentsQuery = query(
      collection(firestore, 'comments'),
      where('postId', '==', props.savedPost.postId) // Use original post ID, not saved post ID
    )

    unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      comments.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        // Sort by timestamp (oldest first)
        const aTime = a.createdAt?.seconds || 0
        const bTime = b.createdAt?.seconds || 0
        return aTime - bTime
      })
    }, (error) => {
      console.error('Error in comments listener:', error)
    })
  } catch (error) {
    console.error('Error setting up comments listener:', error)
  }
}

// Initialize listener when component mounts and when authentication state changes
onMounted(() => {
  if (isLoggedIn.value && userId.value) {
    setupSharedFoldersListener()
  }
  // Always setup comments listener if comments should be shown
  if (props.showComments) {
    setupCommentsListener()
  }
})

// Watch for authentication state changes
watch([isLoggedIn, userId], ([newIsLoggedIn, newUserId]) => {
  if (newIsLoggedIn && newUserId) {
    setupSharedFoldersListener()
  } else {
    sharedFolders.value = []
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
  if (unsubscribeComments) {
    unsubscribeComments()
  }
  // Clean up click outside listener
  document.removeEventListener('click', handleClickOutside)
})

// Compute folders excluding the current folder (include both regular and shared folders)
const otherFolders = computed(() => {
  const regularFolders = userFolders.value.filter(folder => folder.id !== currentFolderId)
  
  // Add extra validation for shared folders at display time
  const availableSharedFolders = sharedFolders.value.filter(folder => {
    // Exclude current folder
    if (folder.id === currentFolderId) return false
    
    // Double-check access rights
    const hasAccess = folder.ownerId === userId.value || 
                     (folder.sharedWith && 
                      Array.isArray(folder.sharedWith) && 
                      folder.sharedWith.includes(userId.value))
    
    if (!hasAccess) {
      console.log('Filtering out folder due to no access:', {
        folderId: folder.id,
        folderName: folder.name,
        ownerId: folder.ownerId,
        currentUserId: userId.value,
        sharedWith: folder.sharedWith
      })
    }
    
    return hasAccess
  })
  
  const combined = [...regularFolders, ...availableSharedFolders]
  console.log('Final otherFolders:', combined.map(f => ({ id: f.id, name: f.name })))
  return combined
})

function toggleMenu() {
  showMenu.value = !showMenu.value
  
  // Add debugging when menu opens
  if (showMenu.value) {
    console.log('SavedPostItem - Menu opened, current folders in dropdown:')
    console.log('Regular folders:', userFolders.value.map(f => ({ id: f.id, name: f.name })))
    console.log('Shared folders:', sharedFolders.value.map(f => ({ 
      id: f.id, 
      name: f.name, 
      ownerId: f.ownerId, 
      sharedWith: f.sharedWith,
      currentUserId: userId.value
    })))
  }
  
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

async function deleteFromFolder() {
  if (!isLoggedIn.value || !userId.value) {
    console.error('User not authenticated')
    return
  }

  if (!props.savedPost.id) {
    console.error('Missing saved post ID')
    return
  }

  isDeleting.value = true

  try {
    // Clean up associated data for this post in this folder
    await cleanupPostData(currentFolderId, props.savedPost.postId)
    
    // Delete the saved post document
    await deleteDoc(doc(firestore, 'savedPosts', props.savedPost.id))
    
    // Log activity for post removal (only for shared folders)
    logActivity('post_removed', { 
      postId: props.savedPost.postId,
      postContent: props.savedPost.postContent.substring(0, 50) + (props.savedPost.postContent.length > 50 ? '...' : ''),
      postAuthor: props.savedPost.postAuthor
    })
    
    closeMenu()
    
    // Emit event to parent to refresh the list
    emit('postDeleted', props.savedPost.id)
  } catch (error) {
    console.error('Error removing post from folder:', error)
  } finally {
    isDeleting.value = false
  }
}

// Function to clean up all data associated with a post in a specific folder
async function cleanupPostData(folderId, postId) {
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
    
    console.log('Cleaned up all data for post', postId, 'in folder', folderId)
  } catch (error) {
    console.error('Error cleaning up post data:', error)
  }
}

async function saveToFolder(folderId, folderName) {
  if (!isLoggedIn.value || !userId.value) {
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
      where('userId', '==', userId.value),
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
      userId: userId.value,
      folderId: folderId,
      folderName: folderName,
      postId: props.savedPost.postId,
      postContent: props.savedPost.postContent,
      postAuthor: props.savedPost.postAuthor,
      postTimestamp: props.savedPost.postTimestamp,
      savedAt: serverTimestamp()
    })
    
    // Log activity for post added to shared folder
    logActivityForFolder(folderId, 'post_added', { 
      postId: props.savedPost.postId,
      postContent: props.savedPost.postContent.substring(0, 50) + (props.savedPost.postContent.length > 50 ? '...' : ''),
      postAuthor: props.savedPost.postAuthor
    })
    
    closeMenu()
  } catch (error) {
    console.error('Error saving post to folder:', error)
  } finally {
    savingToFolder.value = null
  }
}

// Handle adding comments
async function addComment() {
  if (!newComment.value.trim() || !isLoggedIn.value || !userId.value) return
  
  isAddingComment.value = true
  
  try {
    // Get current user info
    const auth = getAuth()
    const currentUser = auth.currentUser
    
    if (!currentUser) {
      console.error('No authenticated user')
      return
    }
    
    // Add comment to Firestore
    await addDoc(collection(firestore, 'comments'), {
      postId: props.savedPost.postId, // Original post ID
      content: newComment.value.trim(),
      authorId: userId.value,
      authorName: currentUser.displayName || currentUser.email,
      authorEmail: currentUser.email,
      createdAt: serverTimestamp()
    })
    
    // Log activity for comment added
    logActivity('comment_added', { 
      postId: props.savedPost.postId,
      commentContent: newComment.value.trim().substring(0, 50) + (newComment.value.trim().length > 50 ? '...' : '')
    })
    
    // Clear the input
    newComment.value = ''
  } catch (error) {
    console.error('Error adding comment:', error)
  } finally {
    isAddingComment.value = false
  }
}

// Handle deleting comments (only allow users to delete their own comments)
async function deleteComment(commentId, commentAuthorId) {
  if (!isLoggedIn.value || !userId.value) return
  
  // Only allow users to delete their own comments
  if (commentAuthorId !== userId.value) {
    console.error('Cannot delete comment: not the author')
    return
  }
  
  try {
    await deleteDoc(doc(firestore, 'comments', commentId))
    
    // Log activity for comment removed
    logActivity('comment_removed', { 
      postId: props.savedPost.postId,
      commentId: commentId
    })
  } catch (error) {
    console.error('Error deleting comment:', error)
  }
}

// Activity logging function for shared folder activities
async function logActivity(activityType, activityData = {}) {
  // Only log activities if we're in a shared folder context
  if (!currentFolderId || !isLoggedIn.value || !userId.value) return
  
  try {
    const auth = getAuth()
    const currentUser = auth.currentUser
    
    if (!currentUser) return
    
    await addDoc(collection(firestore, 'activities'), {
      folderId: currentFolderId,
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

// Activity logging function for any folder (checks if it's a shared folder)
async function logActivityForFolder(folderId, activityType, activityData = {}) {
  if (!folderId || !isLoggedIn.value || !userId.value) return
  
  try {
    const auth = getAuth()
    const currentUser = auth.currentUser
    
    if (!currentUser) return
    
    // Check if this is a shared folder
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

.comments-list {
  margin-bottom: 1rem;
  max-height: 300px;
  overflow-y: auto;
}

.comment-item {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  position: relative;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.comment-author {
  font-weight: 600;
  color: #3a6c97;
}

.comment-date {
  color: #666;
  font-size: 0.8rem;
}

.delete-comment-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #dc3545;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.delete-comment-btn:hover {
  background-color: #f8f9fa;
  color: #c82333;
}

.comment-content {
  margin: 0;
  color: #333;
  font-size: 0.9rem;
  line-height: 1.4;
  word-wrap: break-word;
}
</style>

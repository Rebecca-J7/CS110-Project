<script setup>
import Navbar from './components/Navbar.vue'
import { RouterView } from 'vue-router'
import { ref, reactive, provide, onMounted } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, collection, addDoc, deleteDoc, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { firestore } from './firebaseResources'

const auth = getAuth()
const db = firestore

const userId = ref('')
const userEmail = ref('')
const isLoggedIn = ref(false)
const following = ref([])
const userFolders = ref([])

const stats = reactive({
  posts: 0,
  following: 0,
  followers: 0,
})

const setLoggedIn = (status, email = '', uid = '') => {
  isLoggedIn.value = status
  userEmail.value = email
  userId.value = uid

  if (status) {
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('userEmail', email)
    localStorage.setItem('userId', uid)
  } else {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userId')
    stats.posts = 0
    stats.following = 0
    stats.followers = 0
    following.value = [] // Ensure following is cleared on logout
    userFolders.value = [] // Clear folders on logout
  }
}

async function fetchUserStats(uid) {
  if (!uid) return
  try {
    const userRef = doc(db, 'users', uid)
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) {
      const userData = userSnap.data()
      stats.posts = (userData.posts?.length) || 0
      stats.following = (userData.following?.length) || 0
      stats.followers = (userData.followers?.length) || 0
    } else {
      stats.posts = 0
      stats.following = 0
      stats.followers = 0
    }
  } catch (e) {
    console.error('Error fetching user stats:', e)
    stats.posts = 0
    stats.following = 0
    stats.followers = 0
  }
}

async function fetchFollowing(uid) {
  if (!uid) {
    following.value = []
    return
  }
  try {
    const userRef = doc(db, 'users', uid)
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) {
      following.value = userSnap.data().following || []
    } else {
      following.value = []
    }
  } catch (e) {
    console.error('Error fetching following:', e)
    following.value = []
  }
}

async function fetchUserFolders(uid) {
  if (!uid) {
    userFolders.value = []
    return
  }
  try {
    const foldersCol = collection(db, 'folders')
    const q = query(foldersCol, where('userId', '==', uid))
    
    // First, ensure default folder exists before setting up listener
    await ensureDefaultFolder(uid)
    
    // Then set up the real-time listener
    onSnapshot(q, snapshot => {
      const fetchedFolders = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        isDefault: doc.data().isDefault || false
      }))
      userFolders.value = fetchedFolders
    })
  } catch (e) {
    console.error('Error fetching user folders:', e)
    userFolders.value = []
  }
}

async function ensureDefaultFolder(uid) {
  try {
    const foldersCol = collection(db, 'folders')
    const q = query(foldersCol, where('userId', '==', uid), where('isDefault', '==', true))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      // No default folder exists, create one
      await addDoc(foldersCol, {
        name: 'Default Folder',
        userId: uid,
        isDefault: true
      })
    } else if (snapshot.docs.length > 1) {
      // Multiple default folders exist, keep the first one and remove the rest
      const foldersToDelete = snapshot.docs.slice(1)
      for (const folderDoc of foldersToDelete) {
        // Delete saved posts in this duplicate folder first
        const savedPostsQuery = query(
          collection(db, 'savedPosts'),
          where('folderId', '==', folderDoc.id)
        )
        
        const savedPostsSnapshot = await getDocs(savedPostsQuery)
        const deletePromises = savedPostsSnapshot.docs.map(doc => deleteDoc(doc.ref))
        await Promise.all(deletePromises)
        
        // Then delete the folder
        await deleteDoc(doc(db, 'folders', folderDoc.id))
        console.log(`Removed duplicate default folder: ${folderDoc.id} and ${savedPostsSnapshot.docs.length} saved posts`)
      }
    }
  } catch (e) {
    console.error('Error ensuring default folder:', e)
  }
}

// Provide global state
provide('userId', userId)
provide('userEmail', userEmail)
provide('isLoggedIn', isLoggedIn)
provide('setLoggedIn', setLoggedIn)
provide('stats', stats)
provide('following', following)
provide('userFolders', userFolders)

function incrementPosts() { stats.posts++ }
function incrementFollowing() { stats.following++ }
function incrementFollowers() { stats.followers++ }

provide('incrementPosts', incrementPosts)
provide('incrementFollowing', incrementFollowing)
provide('incrementFollowers', incrementFollowers)

onMounted(async () => {
  // Set up auth state listener with proper initialization handling
  let isInitialLoad = true
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is authenticated
      setLoggedIn(true, user.email, user.uid)
      await fetchUserStats(user.uid)
      await fetchFollowing(user.uid)
      await fetchUserFolders(user.uid)
    } else {
      // User is not authenticated
      if (isInitialLoad) {
        // On initial load, check localStorage before clearing everything
        const storedIsLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
        const storedEmail = localStorage.getItem('userEmail') || ''
        const storedUserId = localStorage.getItem('userId') || ''
        
        if (storedIsLoggedIn && storedUserId) {
          // Restore authentication state properly
          setLoggedIn(true, storedEmail, storedUserId)
          await fetchUserStats(storedUserId)
          await fetchFollowing(storedUserId)
          await fetchUserFolders(storedUserId)
        } else {
          setLoggedIn(false)
        }
      } else {
        // Not initial load, user actually logged out
        setLoggedIn(false)
        following.value = []
        userFolders.value = []
      }
    }
    
    isInitialLoad = false
  })
})
</script>

<template>
  <Navbar />
  <main>
    <RouterView />
  </main>
</template>
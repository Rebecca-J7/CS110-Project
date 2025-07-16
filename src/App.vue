<script setup>
import Navbar from './components/Navbar.vue'
import { RouterView } from 'vue-router'
import { ref, reactive, provide, onMounted } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

const auth = getAuth()
const db = getFirestore()

const userId = ref('')
const userEmail = ref('')
const isLoggedIn = ref(false)

// Reactive stats object shared globally
const stats = reactive({
  posts: 0,
  following: 0,
  followers: 0,
})

// Update login state & persist in localStorage
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
    // Reset stats on logout
    stats.posts = 0
    stats.following = 0
    stats.followers = 0
  }
}

// Fetch user stats from Firestore
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
      // Clear if user doc missing
      stats.posts = 0
      stats.following = 0
      stats.followers = 0
    }
  } catch (e) {
    console.error('Error fetching user stats:', e)
  }
}

// Increment functions update reactive stats object live
function incrementPosts() {
  stats.posts++
}
function incrementFollowing() {
  stats.following++
}
function incrementFollowers() {
  stats.followers++
}

// Provide reactive variables and functions for injection
provide('userId', userId)
provide('userEmail', userEmail)
provide('isLoggedIn', isLoggedIn)
provide('setLoggedIn', setLoggedIn)
provide('stats', stats)
provide('incrementPosts', incrementPosts)
provide('incrementFollowing', incrementFollowing)
provide('incrementFollowers', incrementFollowers)

// On Firebase auth state change: update login info & fetch stats
onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      setLoggedIn(true, user.email, user.uid)
      await fetchUserStats(user.uid)
    } else {
      setLoggedIn(false)
    }
  })

  // Also restore from localStorage in case of page reload without Firebase ready yet
  const storedIsLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  const storedEmail = localStorage.getItem('userEmail') || ''
  const storedUserId = localStorage.getItem('userId') || ''
  if (storedIsLoggedIn && storedUserId) {
    setLoggedIn(true, storedEmail, storedUserId)
    fetchUserStats(storedUserId) // fetch stats from DB on load
  }
})
</script>

<template>
  <Navbar />
  <main>
    <RouterView />
  </main>
</template>
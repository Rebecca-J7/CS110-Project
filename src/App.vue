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
const following = ref([])

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

// Provide global state
provide('userId', userId)
provide('userEmail', userEmail)
provide('isLoggedIn', isLoggedIn)
provide('setLoggedIn', setLoggedIn)
provide('stats', stats)
provide('following', following)

function incrementPosts() { stats.posts++ }
function incrementFollowing() { stats.following++ }
function incrementFollowers() { stats.followers++ }

provide('incrementPosts', incrementPosts)
provide('incrementFollowing', incrementFollowing)
provide('incrementFollowers', incrementFollowers)

onMounted(async () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      setLoggedIn(true, user.email, user.uid)
      await fetchUserStats(user.uid)
      await fetchFollowing(user.uid)
    } else {
      setLoggedIn(false)
      following.value = []
    }
  })

  // Restore from localStorage in case of page reload
  const storedIsLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  const storedEmail = localStorage.getItem('userEmail') || ''
  const storedUserId = localStorage.getItem('userId') || ''
  if (storedIsLoggedIn && storedUserId) {
    setLoggedIn(true, storedEmail, storedUserId)
    await fetchUserStats(storedUserId)
    await fetchFollowing(storedUserId)
  }
})
</script>

<template>
  <Navbar />
  <main>
    <RouterView />
  </main>
</template>
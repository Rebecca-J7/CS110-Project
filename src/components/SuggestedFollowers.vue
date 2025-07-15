<script setup>
import { ref, inject, watchEffect, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  getDocs,
} from 'firebase/firestore'

const auth = getAuth()
const db = getFirestore()

const props = defineProps({
  userId: {
    type: String,
    default: null,
  },
})

const isLoggedIn = inject('isLoggedIn')
const currentUserId = ref(null)
const allUsers = ref([])
const suggestions = ref([])
const following = ref([])
const dataLoaded = ref(false)

// Load all users from Firestore
const loadUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'))
    allUsers.value = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id, // Firebase UID
      email: docSnap.data().email,
      username: docSnap.data().username || docSnap.data().email, // fallback to email
    }))
  } catch (error) {
    console.error('Error loading users:', error)
  }
}

// Load current user's following list
const loadFollowing = async () => {
  if (!currentUserId.value) return
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUserId.value))
    if (userDoc.exists()) {
      following.value = userDoc.data().following || []
    } else {
      console.warn('Current user document not found')
    }
  } catch (error) {
    console.error('Error loading following list:', error)
  }
}

// Follow a user
const followUser = async (targetUserId) => {
  if (!currentUserId.value || following.value.includes(targetUserId)) return

  try {
    const currentUserRef = doc(db, 'users', currentUserId.value)
    const targetUserRef = doc(db, 'users', targetUserId)
    const targetSnap = await getDoc(targetUserRef)

    if (!targetSnap.exists()) {
      console.error('Target user does not exist.')
      return
    }

    const targetPosts = targetSnap.data().posts || []

    // Add target user to current user's following and add their posts to feed
    await updateDoc(currentUserRef, {
      following: arrayUnion(targetUserId),
      feed: arrayUnion(...targetPosts),
    })

    await updateDoc(targetUserRef, {
      followers: arrayUnion(currentUserId.value),
    })

    following.value.push(targetUserId)
  } catch (err) {
    console.error('Error following user:', err)
  }
}

// Watch auth state and load data accordingly
onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUserId.value = user.uid
      await loadUsers()
      await loadFollowing()
    } else {
      currentUserId.value = null
      following.value = []
      await loadUsers()
    }

    dataLoaded.value = true
  })
})

// Update suggestions reactively
watchEffect(() => {
  // Only run if all needed data is available
  if (!dataLoaded.value || !allUsers.value.length) return

  if (!currentUserId.value) {
    // Not logged in: show all users
    suggestions.value = allUsers.value
    return
  }

  if (props.userId) {
    const targetId = props.userId
    suggestions.value =
      targetId !== currentUserId.value && !following.value.includes(targetId)
        ? allUsers.value.filter((u) => u.id === targetId)
        : []
  } else {
    // Show up to 5 users not followed and not yourself
    suggestions.value = allUsers.value.filter(
      (u) => u.id !== currentUserId.value && !following.value.includes(u.id)
    ).sort(() => 0.5 - Math.random()).slice(0, 5)
  }
})
</script>

<template>
  <section class="follow-box">
    <h2 class="title">
      {{ props.userId ? 'Follow This User' : 'Who to Follow:' }}
    </h2>

    <div v-if="suggestions.length === 0" class="no-suggestions">
      <p>No one to follow at the moment.</p>
    </div>

    <div v-for="user in suggestions" :key="user.id" class="suggestion-item">
      <RouterLink :to="`/users/${user.id}`" class="user-link">
        {{ user.username }}
      </RouterLink>
      <button
        v-if="isLoggedIn && currentUserId !== user.id && !following.includes(user.id)"
        class="follow-button"
        @click="followUser(user.id)"
        :disabled="following.includes(user.id)"
      >
        Follow
      </button>
    </div>
  </section>
</template>

<style scoped>
.follow-box {
    width: 350px;
    height: 100px;
    padding: 0.5rem;
    border: 2px solid rgb(123, 154, 213);
    border-radius: 8px;
    background-color: #f5f9f8;
    box-sizing: border-box;
    height: auto;
    overflow-wrap: break-word;
}

.title {
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 0.2rem;
    color:black;
}

.suggestion-item {
    margin: 0.5rem;
    padding: 0.5rem;
    font-family: Arial, sans-serif;
    font-size: 1rem;
    color: black;
}

.user-link {
    font-size: 1rem;
    font-weight: normal;
    color:black;
    line-height: 1.3rem;
}

.user-link:hover {
    text-decoration: underline;
    background-color: transparent;
}

.follow-button {
    align-self: flex-end;
    background-color: rgb(123, 154, 213);
    border: none;
    color: white;
    padding: 0.5rem 1.2rem;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.3s ease;
}

.follow-button:hover {
    background-color: rgb(58, 108, 151);
}

.no-suggestions {
    font-size: 0.9rem;
    color: #555;
    padding: 0.5rem;
}
</style>
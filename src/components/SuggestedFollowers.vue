<script setup>
import { ref, inject, onMounted, watchEffect } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, collection, getDocs } from 'firebase/firestore'

const auth = getAuth()
const db = getFirestore()

const props = defineProps({
  userId: {
    type: String,
    default: null,
  },
})

const isLoggedIn = inject('isLoggedIn')
const following = inject('following')
const incrementFollowing = inject('incrementFollowing')

const currentUserId = ref(null)
const allUsers = ref([])
const suggestions = ref([])
const dataLoaded = ref(false)

const loadUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'))
    allUsers.value = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      email: docSnap.data().email,
      username: docSnap.data().username || docSnap.data().email,
    }))
  } catch (error) {
    console.error('Error loading users:', error)
    allUsers.value = []
  }
}

const loadFollowing = async () => {
  if (!currentUserId.value) return
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUserId.value))
    if (userDoc.exists()) {
      following.value = Array.isArray(userDoc.data().following) ? userDoc.data().following : []
    } else {
      following.value = []
    }
  } catch (error) {
    console.error('Error loading following list:', error)
    following.value = []
  }
}

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

    await updateDoc(currentUserRef, {
      following: arrayUnion(targetUserId),
      feed: arrayUnion(...targetPosts),
    })

    await updateDoc(targetUserRef, {
      followers: arrayUnion(currentUserId.value),
    })

    if (incrementFollowing) incrementFollowing()

    await loadFollowing()
  } catch (err) {
    console.error('Error following user:', err)
  }
}

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

// Robust suggestions logic
watchEffect(() => {
  if (!dataLoaded.value || !allUsers.value.length) {
    suggestions.value = []
    return
  }

  const targetId = props.userId
  const isLoggedOut = !currentUserId.value
  const myId = currentUserId.value
  const followingList = Array.isArray(following.value) ? following.value : []

  if (targetId) {
    suggestions.value = allUsers.value.filter(u => u.id === targetId)
  } else if (isLoggedOut) {
    suggestions.value = allUsers.value.slice(0, 5)
  } else {
    // Show all users except self and already-followed
    suggestions.value = allUsers.value
      .filter(u => u.id !== myId && !followingList.includes(u.id))
      .sort(() => 0.5 - Math.random())
      .slice(0, 5)
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
      <RouterLink :to="{ name: 'UserProfile', params: { userId: user.id } }" class="user-link">
        {{ user.username }}
      </RouterLink>
    <button
    v-if="isLoggedIn && currentUserId.value !== user.id && !(following.value ?? []).includes(user.id)"
    class="follow-button"
    @click="followUser(user.id)"
    >
      Follow
    </button>
    <span
    v-else-if="isLoggedIn && currentUserId.value !== user.id && (following.value ?? []).includes(user.id)"
    class="following-indicator"
    >
      Following
    </span>
</div>
  </section>
</template>

<style scoped>
.follow-box {
    width: 350px;
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
    background-color: rgb(100, 130, 190);
}

.following-indicator {
    align-self: flex-end;
    background-color: #e8f5e8;
    border: 1px solid #4caf50;
    color: #2e7d32;
    padding: 0.5rem 1.2rem;
    border-radius: 5px;
    font-weight: 600;
    font-size: 0.9rem;
}

.no-suggestions {
    font-size: 0.9rem;
    color: #555;
    padding: 0.5rem;
}
</style>
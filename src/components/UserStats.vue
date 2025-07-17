<script setup>
import { ref, watch, inject, onUnmounted } from 'vue'
import { getFirestore, doc, onSnapshot } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const props = defineProps({
  userId: String, // Optional prop for other users' profiles
})

const db = getFirestore()
const auth = getAuth()

// const injectedEmail = inject('userEmail')

const username = ref('')
const userStats = ref({
  posts: 0,
  following: 0,
  followers: 0,
})

let unsubscribe = null

watch(
  () => props.userId,
  (newUserId) => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }

    const targetUserId = newUserId || auth.currentUser?.uid

    if (!targetUserId) {
      username.value = 'Unknown User'
      userStats.value = { posts: 0, following: 0, followers: 0 }
      return
    }

    const userRef = doc(db, 'users', targetUserId)

    unsubscribe = onSnapshot(userRef, (userSnap) => {
      if (userSnap.exists()) {
        const data = userSnap.data()
        userStats.value.posts = (data.posts?.length) || 0
        userStats.value.following = (data.following?.length) || 0
        userStats.value.followers = (data.followers?.length) || 0
        username.value = data.username || data.email || targetUserId
      } else {
        userStats.value = { posts: 0, following: 0, followers: 0 }
        username.value = targetUserId
      }
    })
  },
  { immediate: true }
)

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})
</script>

<template>
  <section class="user-box" v-if="userStats">
    <h2 class="username">{{ username }}</h2>
    <div class="stats">
      <div class="stat-item">
        <span class="stat-number">{{ userStats.posts }}</span>
        <span class="stat-label">Posts</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ userStats.following }}</span>
        <span class="stat-label">Following</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ userStats.followers }}</span>
        <span class="stat-label">Followers</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.user-box {
  width: 300px;
  height: 100px;
  padding: 0.5rem;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  background-color: #f5f9f8;
  text-align: center;
  font-family: Arial, sans-serif;
}

.username {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.2rem;
  color:black;
}

.stats {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-weight: 700;
  font-size: 1rem;
  color: black;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
}
</style>
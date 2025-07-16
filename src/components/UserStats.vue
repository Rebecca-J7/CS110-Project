<script setup>
import { ref, watch, inject, onMounted } from 'vue'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

const props = defineProps({
  userId: String, // Optional userId to show other user's stats
})

const db = getFirestore()

// Inject global logged-in user info and stats
const injectedStats = inject('stats')
const injectedEmail = inject('userEmail')
const injectedUserId = inject('userId')

const username = ref('')
const userStats = ref({
  posts: 0,
  following: 0,
  followers: 0,
})

// Fetch stats for given UID
async function fetchStats(uid) {
  if (!uid) {
    userStats.value = { posts: 0, following: 0, followers: 0 }
    username.value = 'Unknown User'
    return
  }
  try {
    const userRef = doc(db, 'users', uid)
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) {
      const data = userSnap.data()
      userStats.value.posts = (data.posts?.length) || 0
      userStats.value.following = (data.following?.length) || 0
      userStats.value.followers = (data.followers?.length) || 0
      username.value = data.username || data.email || uid
    } else {
      userStats.value = { posts: 0, following: 0, followers: 0 }
      username.value = uid
    }
  } catch (error) {
    console.error('Error fetching user stats:', error)
    userStats.value = { posts: 0, following: 0, followers: 0 }
    username.value = uid
  }
}

// On mounted or when userId prop changes, load appropriate stats
watch(
  () => props.userId,
  async (newUserId) => {
    if (newUserId) {
      await fetchStats(newUserId)
    } else {
      // No userId prop: show logged-in user's injected stats
      username.value = injectedEmail.value || 'You'
      userStats.value.posts = injectedStats.posts
      userStats.value.following = injectedStats.following
      userStats.value.followers = injectedStats.followers
    }
  },
  { immediate: true }
)
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
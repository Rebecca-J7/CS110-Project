<script setup>
import { ref, watchEffect } from 'vue'
import { inject } from 'vue'

const props = defineProps({
  userId: {
    type: String,
    default: null
  }
})

const isLoggedIn = inject('isLoggedIn')
const stats = ref(null)
const username = ref('')

// Simulated API call - replace with real fetch logic
async function fetchUserStats(userId) {
  // Replace with actual API call
  return {
    username: userId === null ? 'cats@gmail.com' : `@${userId}`,
    stats: {
      posts: 42,
      following: 128,
      followers: 560
    }
  }
}

watchEffect(async () => {
  const userData = await fetchUserStats(props.userId)
  username.value = userData.username
  stats.value = userData.stats
})
</script>

<template>
  <section class="user-box" v-if="stats">
    <h2 class="username">{{ username }}</h2>
    <div class="stats">
      <div class="stat-item">
        <span class="stat-number">{{ stats.posts }}</span>
        <span class="stat-label">Posts</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ stats.following }}</span>
        <span class="stat-label">Following</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ stats.followers }}</span>
        <span class="stat-label">Followers</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.user-box {
  width: 300px;
  height: 100px;
  margin: 1rem auto;
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
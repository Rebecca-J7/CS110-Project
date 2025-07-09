<script setup>
import { ref, computed, watchEffect } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  userId: {
    type: String,
    default: null
  }
})

import { inject } from 'vue'
const isLoggedIn = inject('isLoggedIn')
const currentUser = ref('@you')

// All users in the system (simulate user map for profile view)
const allUsers = ref([
  'alice',
  'bob',
  'charlie',
  'dana',
  'eve',
  'frank',
  'grace',
  'heidi',
])

const following = ref(['alice', 'bob'])
const suggestions = ref([])

// Follow action (mocked)
const followUser = (username) => {
  if (!following.value.includes(username)) {
    following.value.push(username)
  }
}

watchEffect(() => {
  if (props.userId) {
    // Profile view: suggest only the viewed user (if not already followed or current user)
    const targetUser = `${props.userId}`
    suggestions.value =
      targetUser !== currentUser.value && !following.value.includes(targetUser)
        ? [targetUser]
        : []
  } else {
    // Home view: suggest up to 5 users not followed and not self
    const followableUsers = allUsers.value.filter(
      u => u !== currentUser.value && !following.value.includes(u)
    )
    const shuffled = [...followableUsers].sort(() => 0.5 - Math.random())
    suggestions.value = shuffled.slice(0, 5)
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

    <div v-for="user in suggestions" :key="user" class="suggestion-item">
      <RouterLink :to="`/users/${user}`" class="user-link">
        @{{ user }}
      </RouterLink>
      <button
        v-if="isLoggedIn"
        class="follow-button"
        @click="followUser(user)"
      >
        Follow
      </button>
    </div>
  </section>
</template>

<style scoped>
.follow-box {
    width: 300px;
    height: 100px;
    margin: 1rem auto;
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
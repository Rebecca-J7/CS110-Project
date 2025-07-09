<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'

// Props or state simulation
import { inject } from 'vue'
const isLoggedIn = inject('isLoggedIn')
const currentUser = ref('@you')

// All users in the system
const allUsers = ref([
    '@alice',
    '@bob',
    '@charlie',
    '@dana',
    '@eve',
    '@frank',
    '@grace',
    '@heidi',
])

// Mock list of people the current user is following
const following = ref(['@alice', '@bob'])

// Filtered list of users not already followed (excluding self)
const followableUsers = computed(() => {
    return allUsers.value
    .filter(u => u !== currentUser.value && !following.value.includes(u))
})

// Shuffle and pick up to 5 users
const suggestions = computed(() => {
    const shuffled = [...followableUsers.value].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 5)
})

// Follow action (mocked)
const followUser = (username) => {
    if (!following.value.includes(username)) {
        following.value.push(username)
    }
}
</script>

<template>
    <section class="follow-box">
        <h2 class = "title">Who to Follow:</h2>

        <div v-if="suggestions.length === 0" class="no-suggestions">
            <p>No one to follow at the moment.</p>
        </div>

        <div v-for="user in suggestions":key="user" class="suggestion-item">
        <RouterLink :to="`/profile/${user}`" class="user-link">{{ user }} </RouterLink>
        <button v-if="isLoggedIn" class="follow-button" @click="followUser(user)"> Follow </button>
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
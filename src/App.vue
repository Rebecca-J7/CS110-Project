<script setup>
import Navbar from './components/Navbar.vue'
import { RouterView } from 'vue-router'
import { ref, provide, onMounted } from 'vue'

const userId = ref('')
const userEmail = ref('')
const isLoggedIn = ref(false)

// Function to update login state & persist to localStorage
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
  }
}

provide('userId', userId)
provide('userEmail', userEmail)
provide('isLoggedIn', isLoggedIn)
provide('setLoggedIn', setLoggedIn)

// Initialize from localStorage on app mount
onMounted(() => {
  const storedIsLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  const storedEmail = localStorage.getItem('userEmail') || ''
  const storedUserId = localStorage.getItem('userId') || ''

  setLoggedIn(storedIsLoggedIn, storedEmail, storedUserId)
})
</script>

<template>
  <Navbar />
  <main>
    <RouterView />
  </main>
</template>
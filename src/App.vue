<script setup>
import Navbar from './components/Navbar.vue'
import { RouterView } from 'vue-router'
import { ref, provide, onMounted } from 'vue'
import { getAuth, onAuthStateChanged } from "firebase/auth"


const isLoggedIn = ref(false)
const userEmail = ref('')

function setLoggedIn(status, email = '') {
  isLoggedIn.value = status
  userEmail.value = email
}

provide('isLoggedIn', isLoggedIn)
provide('userEmail', userEmail)
provide('setLoggedIn', setLoggedIn)

onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, (user) => {
    if (user) {
      setLoggedIn(true, user.email || '')
    } else {
      setLoggedIn(false, '')
    }
  })
})
</script>

<template>
  <Navbar />
  <main>
    <RouterView />
  </main>
</template>
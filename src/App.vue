<script setup>
import Navbar from './components/Navbar.vue'
import { RouterView } from 'vue-router'

import { ref, provide } from 'vue'

const isLoggedIn = ref(false)
const userEmail = ref('')

provide('isLoggedIn', isLoggedIn)
provide('userEmail', userEmail)

function setLoggedIn(status, email = '') {
  isLoggedIn.value = status
  userEmail.value = email
}
provide('setLoggedIn', setLoggedIn)
</script>

<template>
  <Navbar />
  <main>
    <RouterView />
  </main>
</template>
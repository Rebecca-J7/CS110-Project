<script setup>
import Navbar from './components/Navbar.vue'
import { RouterView } from 'vue-router'

import { ref, provide } from 'vue'

const isLoggedIn = ref(false)
setTimeout(() => {
  isLoggedIn.value = true
}, 3000)

provide('isLoggedIn', isLoggedIn)
</script>

<template>
  <Navbar />
  <main>
    <RouterView />
  </main>
</template>
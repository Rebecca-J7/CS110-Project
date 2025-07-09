<script setup>
import Navbar from './components/Navbar.vue'
import { RouterView } from 'vue-router'

import { ref, provide } from 'vue'

const isLoggedIn = ref(false)
const setLoggedIn = (val) => isLoggedIn.value = val
provide('isLoggedIn', isLoggedIn)
provide('setLoggedIn', setLoggedIn)

provide('isLoggedIn', isLoggedIn)
</script>

<template>
  <Navbar />
  <main>
    <RouterView />
  </main>
</template>
<script setup>
import Navbar from './components/Navbar.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <Navbar />
  <main>
    <RouterView />
  </main>
</template>
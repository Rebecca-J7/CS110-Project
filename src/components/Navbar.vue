<script setup>
import { RouterLink } from 'vue-router'
import { inject } from 'vue'

const isLoggedIn = inject('isLoggedIn')
</script>

<template>
  <header class="navbar">
    <div class="nav-container">
      <nav class="nav-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/login">Login</RouterLink>
        <RouterLink v-if ="isLoggedIn" to="/savedposts">Saved Posts</RouterLink>
      </nav>
    </div>
  </header>
</template>

<style>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  height: 60px;
  background-color: rgb(123, 154, 213);
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  align-items: center;
  font-family: Arial, sans-serif;
  font-size: 1rem;
}

.nav-container {
  max-width: 1200px;
  width: 100%;        
  padding: 1rem;
  display: flex;         
  justify-content: space-between;
  align-items: center;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-links a {
  text-decoration: underline;
  color: white;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.nav-links a:hover {
  background-color: rgb(58, 108, 151);
}

.nav-links a.router-link-exact-active {
  background-color: rgb(58, 108, 151);
}
</style>
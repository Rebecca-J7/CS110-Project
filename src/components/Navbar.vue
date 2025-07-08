<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="navbar">
    <div class="nav-container">
      <nav class="nav-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/login">Login</RouterLink>
      </nav>
    </div>
  </header>

  <main>
    <RouterView />
  </main>
</template>

<style>

.navbar {
  position: fixed;      /* fixed to top of viewport */
  top: 0;
  left: 0;
  height: 80px;
  background-color: rgb(123, 154, 213);
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  align-items: center;
}

.nav-container {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;               /* make flex container */
  justify-content: space-between;
  align-items: center;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
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
  color:darkblue;
}
</style>
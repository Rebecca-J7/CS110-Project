<script setup>
import { ref, inject } from 'vue'

const userFolders = inject('userFolders', ref([]))

defineProps({
  post: {
    type: Object,
    required: true
  }
})

const isLoggedIn = inject('isLoggedIn')
const showMenu = ref(false)

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function closeMenu() {
  showMenu.value = false
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  let date
  // If it's a Firestore Timestamp object (has a toDate method)
  if (timestamp.toDate) {
    date = timestamp.toDate()
  } else if (timestamp.seconds) {
    // If it's a plain Timestamp object from Firestore (e.g., after JSON serialization)
    date = new Date(timestamp.seconds * 1000)
  } else {
    // Fallback for strings or Date objects
    date = new Date(timestamp)
  }
  return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString()
}
</script>

<template>
  <div class="post-header">
    <p><strong>@{{ post.authorEmail || 'unknown@example.com' }}</strong> on {{ formatDate(post.timestamp) }}</p>
    <div class="menu-container" v-if="isLoggedIn">
      <button class="dots-btn" @click="toggleMenu" aria-label="Post options">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </button>
      <div v-if="showMenu" class="dropdown-menu">
        <button
          v-for="folder in userFolders"
          :key="folder.id"
          class="dropdown-item"
          @click="closeMenu"
          >
            Save to {{ folder.name }}
        </button>
      </div>
    </div>
  </div>
  <p class="post-content">{{ post.content }}</p>
</template>

<style scoped>
.post-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  margin: 0.5rem;
  color: #555;
  line-height: 0.5rem;
}

.post-content {
  font-family: Arial, sans-serif;
  font-size: 1rem;
  padding-left: 1rem;
  color: black;
}

.menu-container {
  position: relative;
  display: flex;
  align-items: center;
}

.dots-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.3rem;
  display: flex;
  flex-direction: row;
  gap: 3px;
  align-items: center;
}

.dot {
  width: 5px;
  height: 5px;
  background:black;
  border-radius: 50%;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  top: 120%;
  right: 0;
  background:#f5f9f8;
  border: 2px solid #7b9ad5;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
  min-width: 160px;
  z-index: 10;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column; /* ensures vertical column */
  gap: 0.2rem;  
}

.dropdown-item {
  background: none;
  border: none;
  width:200px;
  text-align: center;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  color: black;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #e3eaf7;
}
</style>
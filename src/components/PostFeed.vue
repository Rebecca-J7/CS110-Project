<script setup>
import { ref, computed } from 'vue'
import PostItem from './PostItem.vue'

// Mock login state
import { inject } from 'vue'
const isLoggedIn = inject('isLoggedIn')

// Sample posts
const globalPosts = ref([
  { id: 1, username: '@guest1', date: '7/8/2025', time: '3:29:41 PM', content: 'Hello world!' },
  { id: 2, username: '@guest2', date: '7/8/2025', time: '5:50:56 PM', content: 'Vue is awesome!' },
  { id: 3, username: '@guest3', date: '7/8/2025', time: '4:37:12 PM', content: 'New project!' },
  // Add more sample posts...
])

const userPosts = ref([
  { id: 1, username: '@you', date: '7/8/2025', time: '3:29:41 PM', content: 'This is my personal post feed.' },
  { id: 2, username: '@you', date: '7/8/2025', time: '5:50:56 PM', content: 'Just checking in!' },
  // Add more sample posts...
])

// Select feed based on login state
const feed = computed(() => {
  return isLoggedIn.value ? userPosts.value : globalPosts.value
})
</script>

<template>
  <div class="post-box">
  <section class="post-feed">
    <h2 class = "post-feed">Feed:</h2>
    <div v-if="feed.length === 0" class="no-posts">
      <p>No posts have been made yet.</p>
    </div>
    <PostItem
      v-for="post in feed.slice(0, 10)"
      :key="post.id"
      :post="post"
    />
  </section>
  </div>
</template>

<style scoped>
.post-box {
  width: 500px;
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

.post-feed {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.2rem;
  color:black;
}

.no-posts {
  font-family: Arial, sans-serif;
  font-size: 1rem;
  padding-left: 1rem;
  line-height: 1.4rem;
  color: black;
}

</style>
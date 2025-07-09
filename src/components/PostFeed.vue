<script setup>
import { ref, computed } from 'vue'
import PostItem from './PostItem.vue'
import { inject } from 'vue'

const props = defineProps({
  userId: {
    type: String,
    default: null
  }
})

const isLoggedIn = inject('isLoggedIn')

// Mock posts (replace with API calls in real app)
const globalPosts = ref([
  { id: 1, username: '@alice', date: '7/8/2025', time: '3:29:41 PM', content: 'Hello world!' },
  { id: 2, username: '@bob', date: '7/8/2025', time: '5:50:56 PM', content: 'Vue is awesome!' },
  { id: 3, username: '@charlie', date: '7/8/2025', time: '4:37:12 PM', content: 'New project!' },
  { id: 4, username: '@alice', date: '7/9/2025', time: '9:00:56 AM', content: 'Another day!' },
  { id: 5, username: '@charlie', date: '7/9/2025', time: '11:30:42 AM', content: 'Just launched!' },
  { id: 6, username: '@bob', date: '7/9/2025', time: '1:37:22 AM', content: 'Yayyyyyy!' },
  { id: 7, username: '@dana', date: '7/9/2025', time: '7:06:39 PM', content: 'Studying in South Korea!' },
  { id: 8, username: '@eve', date: '7/10/2025', time: '10:15:03 PM', content: 'I love Javascript!' },
  { id: 7, username: '@frank', date: '7/10/2025', time: '2:58:10 PM', content: 'Shopping in Myeong-dong!!!' },
  { id: 7, username: '@grace', date: '7/10/2025', time: '8:24:01 AM', content: 'I love cats!' },
  { id: 7, username: '@heidi', date: '7/10/2025', time: '1:31:05 PM', content: 'Currently cafe hopping~~' },
])

const userPostsMap = {
  you: [
    { id: 1, username: '@you', date: '7/8/2025', time: '3:29:41 PM', content: 'This is my personal post feed.' },
    { id: 2, username: '@you', date: '7/8/2025', time: '5:50:56 PM', content: 'Just checking in!' }
  ],
  user123: [
    { id: 1, username: '@user123', date: '7/8/2025', time: '1:11:11 PM', content: 'This is user123\'s post!' }
  ]
}

const posts = computed(() => {
  if (props.userId) {
    const handle = `@${props.userId}`
    // Try exact match from map, otherwise fallback to global post filter
    return userPostsMap[props.userId] || globalPosts.value.filter(post => post.username === handle)
  }
  return isLoggedIn.value ? userPostsMap['you'] || [] : globalPosts.value
})
</script>

<template>
  <div class="post-box">
    <section class="post-feed">
      <h2 class="post-feed">{{ props.userId ? "Posts" : "Feed:" }}</h2>
      <div v-if="posts.length === 0" class="no-posts">
        <p>No posts have been made yet.</p>
      </div>
      <PostItem
        v-for="post in posts.slice(0, 10)"
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
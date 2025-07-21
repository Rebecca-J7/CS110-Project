<script setup>
import { ref, inject, watch, onUnmounted } from 'vue'
import PostItem from './PostItem.vue'
import { getFirestore, collection, query, orderBy, limit, where, onSnapshot } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const props = defineProps({
  userId: {
    type: String,
    default: null
  }
})

const posts = ref([])
const loading = ref(true)
const db = getFirestore()
const auth = getAuth()

const currentUserId = ref(null)
const following = inject('following')

let unsubscribePosts = null

function setupPostsListener(postsQuery) {
  if (unsubscribePosts) unsubscribePosts()
  unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
    posts.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    loading.value = false
  })
}

async function loadPosts() {
  loading.value = true
  posts.value = []

  let postsQuery

  if (props.userId) {
    postsQuery = query(
      collection(db, 'posts'),
      where('author', '==', props.userId),
      orderBy('timestamp', 'desc'),
      limit(10)
    )
  } else {
    if (!currentUserId.value) {
      postsQuery = query(
        collection(db, 'posts'),
        orderBy('timestamp', 'desc'),
        limit(10)
      )
    } else {
      // Defensive: always treat following as array
      const followingList = Array.isArray(following.value) ? following.value : []
      if (followingList.length === 0) {
        posts.value = []
        loading.value = false
        if (unsubscribePosts) unsubscribePosts()
        return
      }
      const authorsToQuery = followingList.slice(0, 10)
      postsQuery = query(
        collection(db, 'posts'),
        where('author', 'in', authorsToQuery),
        orderBy('timestamp', 'desc'),
        limit(10)
      )
    }
  }

  setupPostsListener(postsQuery)
}

onUnmounted(() => {
  if (unsubscribePosts) unsubscribePosts()
})

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId.value = user.uid
    loadPosts()
  } else {
    currentUserId.value = null
    // Do NOT clear following.value here; let App.vue handle it!
    loadPosts()
  }
})

// Watch following.value for changes
watch([() => props.userId, currentUserId, () => following.value], () => {
  loadPosts()
})
</script>

<template>
  <div class="post-box">
    <section class="post-feed">
      <h2 class="post-feed">Feed:</h2>

      <div v-if="loading" class="loading">Loading posts...</div>

      <div v-else-if="posts.length === 0" class="no-posts">
        <p>No posts have been made yet.</p>
      </div>

      <PostItem
        v-for="post in posts"
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
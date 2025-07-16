<script setup>
import { ref, onMounted, inject } from 'vue'
import PostItem from './PostItem.vue'
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const props = defineProps({
  userId: {
    type: String,
    default: null
  }
})

const isLoggedIn = inject('isLoggedIn')
const injectedUsername = inject('userEmail') || ref('')

const db = getFirestore()
const auth = getAuth()

const posts = ref([])
const loading = ref(true)

onMounted(async () => {
  const currentUser = auth.currentUser
  if (!currentUser) return

  try {
    if (props.userId) {
      // 🟦 Case: Viewing specific user's posts
      const userRef = doc(db, 'users', props.userId)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists()) {
        const postIds = userSnap.data().posts || []
        await fetchPostsByIds(postIds)
      }
    } else {
      // 🟩 Case: Viewing current user's feed
      const userRef = doc(db, 'users', currentUser.uid)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists()) {
        const feedIds = userSnap.data().feed || []
        await fetchPostsByIds(feedIds)
      }
    }
  } catch (err) {
    console.error('Failed to load posts:', err)
  } finally {
    loading.value = false
  }
})

async function fetchPostsByIds(postIds) {
  if (postIds.length === 0) {
    posts.value = []
    return
  }

  const chunks = []
  const chunkSize = 10

  for (let i = 0; i < postIds.length; i += chunkSize) {
    chunks.push(postIds.slice(i, i + chunkSize))
  }

  const allPosts = []

  for (const chunk of chunks) {
    const postsQuery = query(collection(db, 'posts'), where('__name__', 'in', chunk))
    const snapshot = await getDocs(postsQuery)
    snapshot.forEach(doc => {
      allPosts.push({ id: doc.id, ...doc.data() })
    })
  }

  // Sort by timestamp, newest first
  posts.value = allPosts.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds)
}
</script>

<template>
  <div class="post-box">
    <section class="post-feed">
      <h2 class="post-feed">{{ props.userId ? "User's Posts" : "Feed:" }}</h2>

      <div v-if="loading" class="loading">No posts have been made yet.</div>

      <div v-else-if="posts.length === 0" class="no-posts">
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
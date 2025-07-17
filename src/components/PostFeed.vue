<script setup>
import { ref, watchEffect } from 'vue'
import PostItem from './PostItem.vue'
import { getFirestore, collection, query, orderBy, limit, getDocs, where, doc, getDoc } from 'firebase/firestore'
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
const following = ref([])

async function loadFollowing(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (userDoc.exists()) {
      following.value = userDoc.data().following || []
    } else {
      following.value = []
    }
  } catch (err) {
    console.error('Error loading following list:', err)
    following.value = []
  }
}

async function loadPosts() {
  loading.value = true
  posts.value = []

  console.log('Loading posts for userId:', props.userId)

  try {
    let postsQuery

    if (props.userId) {
      // Viewing another user's profile — show their posts only
      postsQuery = query(
        collection(db, 'posts'),
        where('author', '==', props.userId),
        orderBy('timestamp', 'desc'),
        limit(10)
      )
    } else {
      if (!currentUserId.value) {
        // Logged out — show all posts globally
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('timestamp', 'desc'),
          limit(10)
        )
      } else {
        // Logged in — show posts only from users followed
        if (following.value.length === 0) {
          posts.value = []
          loading.value = false
          return
        }

        // Firestore 'in' operator supports max 10 values
        const authorsToQuery = following.value.slice(0, 10)

        postsQuery = query(
          collection(db, 'posts'),
          where('author', 'in', authorsToQuery),
          orderBy('timestamp', 'desc'),
          limit(10)
        )
      }
    }

    const snapshot = await getDocs(postsQuery)
    console.log('Posts found:', snapshot.size)
    snapshot.docs.forEach(doc => {
      console.log('Post:', doc.id, doc.data())
    })

    posts.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (err) {
    console.error('Error loading posts:', err)
  } finally {
    loading.value = false
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId.value = user.uid
    await loadFollowing(user.uid)
    loadPosts()
  } else {
    currentUserId.value = null
    following.value = []
    // Load global posts when logged out
    loadPosts()
  }
})

// Reload posts when userId or following changes
watchEffect(() => {
  if (props.userId || currentUserId.value !== null) {
    loadPosts()
  }
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
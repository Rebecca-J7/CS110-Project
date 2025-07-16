<script setup>
import { ref, onMounted } from 'vue'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

const username = ref('Unknown')
const date = ref('')
const time = ref('')

const db = getFirestore()

onMounted(async () => {
  // Format timestamp
  if (props.post.timestamp?.seconds) {
    const dateObj = new Date(props.post.timestamp.seconds * 1000)
    date.value = dateObj.toLocaleDateString()
    time.value = dateObj.toLocaleTimeString()
  }

  // Lookup author username from users collection
  try {
    const authorRef = doc(db, 'users', props.post.author)
    const authorSnap = await getDoc(authorRef)
    if (authorSnap.exists()) {
      username.value = authorSnap.data().username || 'Unnamed'
    }
  } catch (err) {
    console.error('Failed to load author info:', err)
  }
})
</script>

<template>
  <div class="post-header">
    <p><strong>@{{ username }}</strong> on {{ date }} at {{ time }}</p>
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
</style>
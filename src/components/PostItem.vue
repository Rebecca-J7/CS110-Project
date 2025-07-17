<script setup>
defineProps({
  post: {
    type: Object,
    required: true
  }
})

// function formatDate(timestamp) {
//   if (!timestamp) return ''
//   const date = new Date(timestamp.seconds * 1000)
//   return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString()
// }

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
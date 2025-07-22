<template>
  <div class="saved-post">
    <div class="post-header">
      <p><strong>@{{ savedPost.postAuthor }}</strong> on {{ formatDate(savedPost.postTimestamp) }}</p>
    </div>
    <p class="post-content">{{ savedPost.postContent }}</p>
  </div>
</template>

<script setup>
defineProps({
  savedPost: {
    type: Object,
    required: true
  }
})

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

<style scoped>
.saved-post {
  background: #f5f9f8;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
}

.post-header {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: #555;
}

.post-content {
  font-family: Arial, sans-serif;
  font-size: 1rem;
  color: black;
  margin: 0;
}
</style>

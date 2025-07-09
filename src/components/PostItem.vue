<script setup>
defineProps({
  post: {
    type: Object,
    required: true
  }
})
</script>

<template>
    <div class="post-header">
      <p><strong> @{{ post.username }}</strong> on {{ post.date }} at {{ post.time }}</p>
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
<script setup>
import { ref } from 'vue'

const postText = ref('')

const handlePost = () => {
  if (postText.value.trim() === '') return
  console.log('Posted:', postText.value)
  postText.value = ''
}
</script>

<template>
    <section class="post-box">
        <h2 class = "title">Create a new Post:</h2>
        <textarea
        v-model="postText"
        placeholder="What's on your mind?"
        class="post-input"
        />
        <button class="button" @click="handlePost">Post</button>
      </section>
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

.post-info {
    font-family: Arial, sans-serif;
    font-size: 1rem;
    padding-left: 1rem;
    line-height: 1.4rem;
    color: black;
}

.post-input {
    width: 100%;
    min-height: 100px;
    padding: 0.75rem;
    font-size: 1rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    resize: vertical;
    box-sizing: border-box;
    font-family: inherit;
}

.title {
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 0.2rem;
    color:black;
}

.button {
    align-self: flex-end;
    background-color: rgb(123, 154, 213);
    border: none;
    color: white;
    padding: 0.5rem 1.2rem;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.3s ease;
}

.button:hover {
    background-color: rgb(58, 108, 151);
}
</style>
<script setup>
import { ref, inject } from 'vue'
import { getFirestore, collection, addDoc, doc, updateDoc, arrayUnion, getDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const incrementPosts = inject('incrementPosts')

const postText = ref('')
const db = getFirestore()
const auth = getAuth()

const handlePost = async () => {
  const user = auth.currentUser
  if (!user || postText.value.trim() === '') return

  const postContent = postText.value.trim()
  postText.value = ''

  const newPost = {
    content: postContent,
    timestamp: serverTimestamp(),
    author: user.uid,
    authorEmail: user.email,
  }

  try {
    const postRef = await addDoc(collection(db, 'posts'), newPost)

    const userRef = doc(db, 'users', user.uid)
    await updateDoc(userRef, {
      posts: arrayUnion(postRef.id),
    })

    const userSnap = await getDoc(userRef)
    const followers = userSnap.data().followers || []

    for (const followerId of followers) {
      const followerRef = doc(db, 'users', followerId)
      await updateDoc(followerRef, {
        feed: arrayUnion(postRef.id),
      })
    }

    // Update stats live
    if (incrementPosts) incrementPosts()

    console.log('Posted:', postContent)
  } catch (err) {
    console.error('Error posting:', err)
  }
}
</script>

<template>
  <section class="post-box">
    <h2 class="title">Create a new Post:</h2>
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
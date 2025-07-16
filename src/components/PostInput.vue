<script setup>
import { ref } from 'vue'
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const postText = ref('')
const db = getFirestore()
const auth = getAuth()


const handlePost = async () => {
    const user = auth.currentUser
  if (!user || postText.value.trim() === '') return

  const content = postText.value.trim()
  const userId = user.uid
  const userDocRef = doc(db, 'users', userId)
  const userSnap = await getDoc(userDocRef)
  const userData = userSnap.data()

  // Create the post
  const newPost = {
    timestamp: new Date(),
    author: userId, // or userDocRef if you want to use document references
    content
  }

  const postRef = await addDoc(collection(db, 'posts'), newPost)

  // 2. Append the post to user's posts array
  await updateDoc(userDocRef, {
    posts: arrayUnion(postRef.id)
  })

  // 3. Add post to each follower's feed array
  const followers = userData.followers || []
  for (const followerId of followers) {
    const followerRef = doc(db, 'users', followerId)
    await updateDoc(followerRef, {
      feed: arrayUnion(postRef.id)
    })
  }

  postText.value = ''
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
<script setup>
import { useRoute } from 'vue-router'
import { ref, onMounted } from 'vue'
import { firestore } from '@/firebaseResources'
import { doc, getDoc } from 'firebase/firestore'

const route = useRoute()
const folderId = route.params.id
const folderName = ref('Folder')

// Fetch folder name from Firestore
onMounted(async () => {
  if (!folderId) return
  const folderDoc = await getDoc(doc(firestore, 'folders', folderId))
  if (folderDoc.exists()) {
    folderName.value = folderDoc.data().name
  }
})

// Mock data for updates and followers
const updates = [
  'User1 added a post',
  'User2 commented',
  'User3 shared the folder',
]
const followers = [
  { name: 'Alice' },
  { name: 'Bob' },
  { name: 'Charlie' },
]
</script>

<template>
    <h2 class="folder-title">{{ folderName }}</h2>

  <div class="folder-row">
    <!-- Updates List -->
    <div class="updates-list">
      <h3>Updates</h3>
      <ul>
        <li v-for="(update, idx) in updates" :key="idx">{{ update }}</li>
      </ul>
    </div>

    <!-- Demo Post -->
    <div class="demo-post">
      <section class="post-content">
        <h3>Demo Post Title</h3>
        <p>This is a demo post inside the folder. You can add real post content here later.</p>
      </section>
      <section class="comment-section">
        <input type="text" class="comment-input" placeholder="Leave a comment..." />
        <button class="comment-btn">Comment</button>
      </section>
    </div>

    <!-- Followers List with Invite Button -->
    <div class="followers-list">
      <h3>Followers</h3>
      <ul>
        <li v-for="(follower, idx) in followers" :key="idx" class="follower-row">
          <span>{{ follower.name }}</span>
          <button class="invite-btn">Invite</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>

.folder-title {
  font-size: 1.7rem;
  font-weight: bold;
  color: black;
  margin-bottom: 2rem;
}

.folder-row {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  align-items: flex-start;
}

.updates-list, .followers-list {
  background: #f5f9f8;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  padding: 1rem;
  min-width: 300px;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
  color: black;
}

.updates-list h3, .followers-list h3 {
  margin-bottom: 0.5rem;
  color: black;
  font-size: 1.1rem;
    font-weight: bold;
}

.updates-list ul, .followers-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.follower-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.demo-post {
  background: #f5f9f8;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  padding: 1rem;
  min-width: 500px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
}

.post-content h3 {
    margin-bottom: 0.5rem;
    color: black;
    font-size: 1.1rem;
    font-weight: bold;
}

.post-content p {
  margin: 0;
  color: #222;
}

.comment-section {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.comment-input {
  flex: 1;
  padding: 0.5rem;
  border-radius: 5px;
  border: 1px solid #7b9ad5;
  font-size: 1rem;
}

.comment-btn {
  background-color: #7b9ad5;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.5rem 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.comment-btn:hover {
  background-color: #3a6c97;
}

.invite-btn {
  background-color: #7b9ad5;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.3rem 0.8rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.invite-btn:hover {
  background-color: #3a6c97;
}
</style>
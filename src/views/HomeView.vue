<script setup>
import { ref } from 'vue'
  const isLoggedIn = ref(false);
  setTimeout(() => {
    isLoggedIn.value = true
  }, 3000)

  const username = '@JohnDoe'
  const stats = {
    posts: 42,
    following: 128,
    followers: 560,
  }

  const posts = ref([
    { id: 1, content: 'Hello world!', author: '@JohnDoe' },
    { id: 2, content: 'Learning Vue.js is fun!', author: '@JohnDoe' },
    { id: 3, content: 'Just completed a project!', author: '@JohnDoe' },
  ])

  const users = ref([
  { id: 1, username: '@alice' },
  { id: 2, username: '@bob' },
  { id: 3, username: '@charlie' },
])

const postText = ref('')
</script>

<template>
  <section class="home">

    <div v-if="isLoggedIn">
      <div style = "display:flex; flex-direction:row; gap:2rem;">
      <section class="user-box">
        <h2 class="username">{{ username }}</h2>
        <div class="stats">
        <div class="stat-item">
          <span class="stat-number">{{ stats.posts }}</span>
          <span class="stat-label">Posts</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ stats.following }}</span>
          <span class="stat-label">Following</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ stats.followers }}</span>
          <span class="stat-label">Followers</span>
        </div>
        </div>
      </section>

      <div style ="display:flex; flex-direction:column; gap:0.2rem;">
      <section class="post-box">
        <h2 class = "username">Recent Posts:</h2>
        <div style = "display:flex; flex-direction: column; gap:1rem;">
        <div v-for="post in posts" :key="post.id" class="post-info">
          <p>{{ post.author }}</p>
          <p>{{ post.content }}</p>
        </div>
        </div>
      </section>
      
      <section class="post-box">
        <h2 class = "username">Create a new Post:</h2>
        <textarea
        v-model="postText"
        placeholder="What's on your mind?"
        class="post-input"
        />
        <button class="button">Post</button>
      </section>
      </div>

      <section class="follow-box">
        <h2 class = "username">Who to Follow:</h2>
        <div style = "display:flex; flex-direction: column; gap: 1rem;">
        <div v-for="user in users" :key="user.id" class="post-info">
          <p>{{ user.username }}</p>
          <button class="button">Follow</button>
        </div>
        </div>
      </section>
      </div>
    </div>

    <div v-else>
      <div style = "display:flex; flex-direction:row; gap:2rem;">
      <section class="login-box">
        <div class="username">
          <RouterLink to="/login">Login</RouterLink>
        </div>
      </section>

      <div style ="display:flex; flex-direction:column; gap:0.2rem;">
      <section class="post-box">
        <h2 class = "username">Recent Posts:</h2>
        <div style = "display:flex; flex-direction: column; gap:1rem;">
        <div v-for="post in posts" :key="post.id" class="post-info">
          <p>{{ post.author }}</p>
          <p>{{ post.content }}</p>
          </div>
        </div>
      </section>
      </div>

      <section class="follow-box">
        <h2 class = "username">Who to Follow:</h2>
        <div style = "display:flex; flex-direction: column; gap: 1rem;">
        <div v-for="user in users" :key="user.id" class="post-info">
          <p>{{ user.username }}</p>
        </div>
        </div>
      </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.login-box {
  width: 300px;
  height: 50px;
  margin: 1rem auto;
  padding: 0.5rem;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  background-color: #f5f9f8;
  box-sizing: border-box;
  text-align: center;
}

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

.follow-box {
  width: 300px;
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

.user-box {
  width: 300px;
  height: 100px;
  margin: 1rem auto;
  padding: 0.5rem;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  background-color: #f5f9f8;
  text-align: center;
  font-family: Arial, sans-serif;
}

.username {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.2rem;
  color:black;
}

.stats {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-weight: 700;
  font-size: 1rem;
  color: black;
}

.stat-label {
  font-size: 0.87rem;
  color: #666;
}
</style>

<script setup>
import { ref } from 'vue'
import { inject } from 'vue'
const isLoggedIn = inject('isLoggedIn')


import PostFeed from '../components/PostFeed.vue'
import SuggestedFollowers from '@/components/SuggestedFollowers.vue'
import PostInput from '@/components/PostInput.vue'
import UserStats from '@/components/UserStats.vue'
</script>

<template>
  <section class="home">

    <div v-if="isLoggedIn">
      <div style = "display:flex; flex-direction:row; gap:2rem;">
      <UserStats />

      <div style ="display:flex; flex-direction:column; gap:0.1rem;">
        <PostFeed />
        <PostInput />
      </div>
      <SuggestedFollowers />
      </div>
    </div>

    <div v-else>
      <div style = "display:flex; flex-direction:row; gap:2rem;">
      <section class="login-box">
        <div class="title">
          <RouterLink to="/login">Login</RouterLink>
        </div>
      </section>

      <div style ="display:flex; flex-direction:column; gap:0.2rem;">
        <PostFeed />
      </div>
      <SuggestedFollowers />
      </div>
    </div>
  </section>
</template>

<style scoped>
.login-box {
  width: 300px;
  height: 70px;
  margin: 1rem auto;
  padding: 0.5rem;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  background-color: #f5f9f8;
  box-sizing: border-box;
  display:flex;
  align-items: center;
  justify-content: center;
}

.title {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.2rem;
  color:black;
}
</style>

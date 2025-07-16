<script setup>

import { inject } from 'vue'
const isLoggedIn = inject('isLoggedIn')

import UserStats from '@/components/UserStats.vue'
import PostFeed from '@/components/PostFeed.vue'
import PostInput from '@/components/PostInput.vue'
import SuggestedFollowers from '@/components/SuggestedFollowers.vue'

</script>

<template>
    <div v-if="isLoggedIn">
      <div style = "display:flex; flex-direction:row; gap:2rem; align-items: flex-start;">
      <UserStats />
      <div style ="display:flex; flex-direction:column; gap:1rem; align-items: flex-start;">
        <PostFeed />
        <PostInput />
      </div>
      <SuggestedFollowers />
      </div>
    </div>
    
    <div v-else>
      <div style = "display:flex; flex-direction:row; gap:2rem; align-items: flex-start;">
        <div class="login-box">
          <div class="title">
            <RouterLink to="/login">Login</RouterLink>
          </div>
        </div>
        <PostFeed />
        <SuggestedFollowers />
      </div>
    </div>
</template>

<style scoped>
.login-box {
  width: 300px;
  height: 70px;
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

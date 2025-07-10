<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const userId = route.params.userId

import PostFeed from '../components/PostFeed.vue'
import SuggestedFollowers from '@/components/SuggestedFollowers.vue'
import UserStats from '@/components/UserStats.vue'
</script>

<template>
    <section class="user">
        <div style="display:flex; flex-direction:row; gap:2rem;">
        <UserStats :userId="userId" />
        <div style="display:flex; flex-direction:column; gap:0.1rem;">
            <PostFeed :userId="userId" />
        </div>
        <SuggestedFollowers :userId="userId" />
        </div>
    </section>
</template>

<style scoped>
.user {
  margin-top: 3rem; /* Adjust as needed */
  /* Optionally add horizontal padding */
  padding-left: 1rem;
  padding-right: 1rem;
}
</style>
<script setup>
import { computed } from 'vue'
import PostFeed from '../components/PostFeed.vue'
import SuggestedFollowers from '@/components/SuggestedFollowers.vue'
import UserStats from '@/components/UserStats.vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const userId = computed(() => route.params.userId)
</script>

<template>
  <div style="display:flex; flex-direction:row; gap:2rem; align-items: flex-start;">
    <UserStats :userId="userId" />
    <div style="display:flex; flex-direction:column; gap:0.1rem; align-items: flex-start;">
      <PostFeed :userId="userId" />
    </div>
    <SuggestedFollowers :userId="userId" />
  </div>
</template>
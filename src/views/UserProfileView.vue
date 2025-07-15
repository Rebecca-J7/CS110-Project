<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const userId = route.params.userId

import PostFeed from '../components/PostFeed.vue'
import SuggestedFollowers from '@/components/SuggestedFollowers.vue'
import UserStats from '@/components/UserStats.vue'
</script>

<template>
    <div class="user">
        <div style="display:flex; flex-direction:row; gap:2rem; align-items: flex-start;">
        <UserStats :userId="userId" />
        <div style="display:flex; flex-direction:column; gap:0.1rem; align-items: flex-start;">
            <PostFeed :userId="userId" />
        </div>
        <SuggestedFollowers :userId="userId" />
        </div>
    </div>
</template>

<style scoped>
.user {
    margin-top: 2.5rem;
    padding-left: 1rem;
    padding-right: 1rem;
    width: 100%;
    box-sizing: border-box;
}
</style>
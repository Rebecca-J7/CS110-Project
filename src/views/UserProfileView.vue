<script setup>
import { inject } from 'vue'
import { useRoute } from 'vue-router'

const isLoggedIn = inject('isLoggedIn')
const route = useRoute()
const userId = route.params.userId

import PostFeed from '../components/PostFeed.vue'
import SuggestedFollowers from '@/components/SuggestedFollowers.vue'
import UserStats from '@/components/UserStats.vue'
</script>

<template>
    <section class="user">
    <div v-if="isLoggedIn">
        <div style="display:flex; flex-direction:row; gap:2rem;">
        <UserStats :userId="userId" />
        <div style="display:flex; flex-direction:column; gap:0.1rem;">
            <PostFeed :userId="userId" />
        </div>
        <SuggestedFollowers :userId="userId" />
        </div>
    </div>
    </section>
</template>
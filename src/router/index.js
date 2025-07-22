import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import UserProfileView from '../views/UserProfileView.vue'
import SavedPostsView from '@/views/SavedPostsView.vue'
import FolderView from '@/views/FolderView.vue'
import SharedFolderView from '@/views/SharedFolderView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      // route level code-splitting
    },

    {
      path: '/savedposts',
      name: 'savedposts',
      component: SavedPostsView,
    },

    {
      path: '/folder/:id',
      name: 'folder',
      component: FolderView,
    },
    
    {
      path: '/shared-folder/:id',
      name: 'shared-folder',
      component: SharedFolderView,
    },
    
    {
      path: '/users/:userId',
      name: 'UserProfile',
      component: UserProfileView,
    }
  ],
})

export default router
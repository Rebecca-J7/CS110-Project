<script setup>
import { ref, inject } from 'vue'
import { RouterLink } from 'vue-router'
import { firestore } from '@/firebaseResources'
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const folders = inject('userFolders', ref([]))

const newFolderName = ref('')
const openMenuId = ref(null)
const auth = getAuth()

async function createFolder() {
  if (!newFolderName.value.trim()) return
  const user = auth.currentUser
  if (!user) return
  await addDoc(collection(firestore, 'folders'), {
    name: newFolderName.value.trim(),
    userId: user.uid,
    isDefault: false
  })
  newFolderName.value = ''
}

async function deleteFolder(id) {
  await deleteDoc(doc(firestore, 'folders', id))
  openMenuId.value = null
}

function toggleMenu(id) {
  openMenuId.value = openMenuId.value === id ? null : id
}
</script>

<template>
  <div class="header-row">
    <div>
      <h2 class="title">Saved Posts</h2>
      <div class="filters-bar">
        <label>
          <input type="radio" name="filter" checked />
          All Folders
        </label>
        <label>
          <input type="radio" name="filter" />
          Shared Folders
        </label>
      </div>
    </div>
    <div class="create-folder">
      <input v-model="newFolderName" placeholder="Enter new folder name" />
      <button @click="createFolder">Create</button>
    </div>
  </div>
  
  <div class="folders-bar">
    <div
      v-for="folder in folders"
      :key="folder.id"
      class="folder"
      tabindex="0"
    >
      <RouterLink :to="`/folder/${folder.id}`">
        <img src="@/assets/folder.png" alt="Folder" class="folder-img" />
        <div class="folder-name">{{ folder.name }}</div>
      </RouterLink>
      <div v-if="!folder.isDefault" class="folder-menu-container">
        <button class="dots-btn" @click="toggleMenu(folder.id)" aria-label="Folder options">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </button>
        <div v-if="openMenuId === folder.id" class="dropdown-menu">
          <button class="dropdown-item" @click="deleteFolder(folder.id)">
            Delete Folder
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-left: 2rem;
  margin-right: 2rem;
  margin-top: 0.2rem;
  margin-bottom: 2rem;
}

.title {
  font-size: 1.7rem;
  font-weight: bold;
  color: black;
  margin-bottom: 1rem;
}

.top-bar {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
  cursor: pointer;
  margin-top: 2rem;
}

.filters-bar {
  display: flex;
  gap: 2rem;
  font-size: 1rem;
  color: black;
  margin-bottom: 0.5rem;
}

.filters-bar input[type="radio"]:hover {
  cursor: pointer;
}

.folders-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  margin-top: 2rem;
  margin-left: 2rem;
  width: calc(100vw - 12rem);
  max-width: 1600px;  
}

.folder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 130px;
  height: 150px;
  padding: 1rem 0.5rem;
  border-radius: 5px;
  background-color: rgb(123, 154, 213);
  color: #fff;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
  outline: none;
  box-sizing: border-box;
}

.folder:hover {
  background-color: rgb(58, 108, 151);
  color: #fff;
}

.folder-img {
  width: 55px;
  height: 55px;
  color:white;
  margin: 0 auto 0.5rem auto;
  display: block;
}

.folder-name {
  font-size: 1rem;
  color: #fff;
  text-align: center;
  width: 100%;
  word-break: break-word;
  margin-top: 0.3rem;
}

.folder-menu-container {
  position: relative;
  margin-top: 0.5rem;
}

.dots-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.3rem;
  display: flex;
  flex-direction: row;
  gap: 3px;
  align-items: center;
}

.dot {
  width: 5px;
  height: 5px;
  background: #fff;
  border-radius: 50%;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  top: 120%;
  right: 0;
  background: #f5f9f8;
  border: 1px solid #7b9ad5;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(123,154,213,0.08);
  min-width: 160px;
  z-index: 10;
  padding: 0.5rem 0;
}

.dropdown-item {
  background: none;
  border: none;
  width: 100%;
  text-align: center;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  color: black;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #fcb0b0;
}
.create-folder {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  margin-top: 3rem;
}
.create-folder input {
  padding: 0.3rem 0.7rem;
  border-radius: 5px;
  border: 2px solid #7b9ad5;
  font-size: 1rem;
}

.create-folder button {
  background-color: #7b9ad5;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.3rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.create-folder button:hover {
  background-color: #3a6c97;
}
</style>
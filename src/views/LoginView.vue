<script setup>
import { inject, ref } from 'vue'

const setLoggedIn = inject('setLoggedIn')
const isLoggedIn = inject('isLoggedIn')
const userEmail = inject('userEmail') || ref('')
const mode = ref('login')
const message = ref('')
const users = ref({})

const handleLogin = ({ email: inputEmail, password, setMessage }) => {
  if (users.value[inputEmail] === password) {
    setLoggedIn(true, inputEmail)
    message.value = 'Login successful!'
    setMessage('')
  } else {
    setMessage('Invalid email or password.')
  }
}

const handleCreate = ({ email: inputEmail, password, setMessage }) => {
  if (users.value[inputEmail]) {
    setMessage('Account already exists.')
  } else {
    users.value[inputEmail] = password
    setLoggedIn(true, inputEmail)
    message.value = 'Account created and logged in!'
    setMessage('')
  }
}

const handleLogout = () => {
  setLoggedIn(false, '')
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('userEmail')
  message.value = 'You have been logged out.'
  mode.value = 'login'
}

import LoginState from '@/components/LoginState.vue'
import CreateState from '@/components/CreateState.vue'
</script>

<template>
  <section class="login-box">
    <h2 v-if="!isLoggedIn">{{ mode === 'login' ? 'Login' : 'Create Account' }}</h2>
    <!-- <h2 v-else>Log Out</h2> -->

    <div v-if="!isLoggedIn">
      <LoginState v-if="mode === 'login'" @login="handleLogin" />
      <CreateState v-else @create="handleCreate" />

      <p class="toggle-link" @click="mode = mode === 'login' ? 'create' : 'login'">
        {{ mode === 'login' ? 'Need an account? Create one!' : 'Already have an account? Login!' }}
      </p>
    </div>

    <div v-else>
      <p>You are logged in as <strong>{{ userEmail }}</strong>.</p>
      <div class="button-wrapper">
        <button @click="handleLogout" class="button">Log Out</button>
      </div>
    </div>

    <p v-if="message" class="message">{{ message }}</p>
  </section>
</template>

<style scoped>
/* Paste your existing styles here */
.button-wrapper {
  display: flex;
  justify-content: center; /* center horizontally */
  width: 100%;
}

.login-box {
  width: 380px;
  height: 350px;
  margin: 1rem auto;
  padding: 1rem;
  border: 2px solid rgb(123, 154, 213);
  border-radius: 8px;
  background-color: #f5f9f8;
  display:flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  font-family: Arial, sans-serif;
  color:black;
}
.button {
  align-self: flex-end;
  background-color: rgb(123, 154, 213);
  border: none;
  color: white;
  padding: 0.5rem 1.2rem;
  margin-top: 1rem;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s ease;
}
.button:hover {
  background-color: rgb(58, 108, 151);
}
.toggle-link {
  color:rgb(58, 108, 151);
  cursor: pointer;
  margin-top: 1rem;
  text-align: center;
}
.message {
  margin-top: 1rem;
  color: black;
}
</style>
<script setup>
import { ref, computed, inject } from 'vue'

// Auth mode: login, create, or logout
const mode = ref('login')
const email = ref('')
const password = ref('')
const message = ref('')

// Simulated backend (in-memory store)
const users = ref({})

// Password validation rules
const hasLetter = computed(() => /[a-zA-Z]/.test(password.value))
const hasNumber = computed(() => /[0-9]/.test(password.value))
const isEmpty = computed(() => password.value.length === 0)
const isValid = computed(() => hasLetter.value && hasNumber.value)
const passwordValid = isValid // used in handleSubmit

const handleSubmit = () => {
  if (mode.value === 'create' && !passwordValid.value) {
    message.value = 'Password must include at least one letter and one number.'
    return
  }

  if (mode.value === 'login') {
    if (users.value[email.value] === password.value) {
      setLoggedIn(true)
      message.value = 'Login successful!'
    } else {
      message.value = 'Invalid email or password.'
    }
  } else if (mode.value === 'create') {
    if (users.value[email.value]) {
      message.value = 'Account already exists.'
    } else {
      users.value[email.value] = password.value
      setLoggedIn(true)
      message.value = 'Account created and logged in!'
    }
  }
}

const handleLogout = () => {
  setLoggedIn(false)
  email.value = ''
  password.value = ''
  message.value = 'You have been logged out.'
  mode.value = 'login'
}
</script>

<template>
    <section class="login-box">
      <h2 v-if="!isLoggedIn">{{ mode === 'login' ? 'Login' : 'Create Account' }}</h2>
      <h2 v-else>Log Out</h2>

      <div v-if="!isLoggedIn">
        <form @submit.prevent="handleSubmit">
          <label>Email:</label>
          <input v-model="email" type="email" required />

          <label>Password:</label>
          <input v-model="password" type="password" required />

          
            <p v-if="isEmpty" style="color: red; padding-bottom:0.6rem;">Enter a password.</p>
            <template v-else-if="!isValid">
              <p v-if="!hasNumber" style="color: red; padding-bottom:0.6rem; max-width: 200px;">Password must include at least one number.</p>
              <p v-if="!hasLetter" style="color: red; padding-bottom:0.6rem; max-width: 200px;">Password must include at least one letter.</p>
            </template>
            <p v-else style="color: green; padding-bottom:0.6rem">Password is valid.</p>

          <button type="submit" class="button">
            {{ mode === 'login' ? 'Login' : 'Create Account' }}
          </button>
        </form>

        <p class="toggle-link" @click="mode = mode === 'login' ? 'create' : 'login'">
          {{ mode === 'login' ? 'Need an account? Create one!' : 'Already have an account? Login!' }}
        </p>
      </div>

      <div v-else>
        <p>You are logged in as <strong>{{ email }}</strong>.</p>
        <button @click="handleLogout" class="button">Log Out</button>
      </div>

      <p v-if="message" class="message">{{ message }}</p>
    </section>
</template>

<style scoped>

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
  color:black
}
input {
  display: block;
  width:200px;
  height: 20px;
  margin-bottom: 1rem;
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

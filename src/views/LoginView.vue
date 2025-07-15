<script setup>
import { inject, ref, watch, provide } from 'vue'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import { auth } from '@/firebaseResources.js'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'

const mode = ref('login')
const message = ref('')

const userId = inject('userId')
const userEmail = inject('userEmail')
const isLoggedIn = inject('isLoggedIn')
const setLoggedIn = inject('setLoggedIn')

const db = getFirestore()

// Login handler

const handleLogin = async ({ email: inputEmail, password, setMessage }) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, inputEmail, password)
    const user = userCredential.user

    userEmail.value = user.email
    userId.value = user.uid

    // Check if user doc exists in Firestore
    const userDocRef = doc(db, 'users', user.uid)
    const userDocSnap = await getDoc(userDocRef)

    if (!userDocSnap.exists()) {
      // Create Firestore doc if missing
      await setDoc(userDocRef, {
        email: user.email,
        feed: [],
        followers: [],
        following: [],
        posts: []
      })
      console.log(`Firestore doc created for user ${user.email}`)
    }

    setLoggedIn(true, user.email)
    message.value = 'Login successful!'
    setMessage('')
  } catch (error) {
    setMessage('Invalid email or password.')
  }
}

// Create account handler
const handleCreate = async ({ email: inputEmail, password, setMessage }) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, inputEmail, password)
    const user = userCredential.user

    // Initialize user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      feed: [],
      followers: [],
      following: [],
      posts: []
    })

    userEmail.value = user.email
    userId.value = user.uid
    setLoggedIn(true, user.email)

    message.value = 'Account created and logged in!'
    setMessage('')
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      setMessage('Account already exists.')
    } else {
      setMessage('Error creating account.')
    }
  }
}

// Logout handler
const handleLogout = async () => {
  try {
    await signOut(auth)
    setLoggedIn(false, '')
    userEmail.value = ''
    userId.value = ''
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userId')
    message.value = 'You have been logged out.'
    mode.value = 'login'
    setTimeout(() => {
      message.value = ''
    }, 2500)
  } catch (error) {
    console.error('Error signing out:', error)
    message.value = 'Error logging out. Please try again.'
  }
}

// Re-provide reactive refs (if needed by nested components)
provide('userEmail', userEmail)
provide('userId', userId)

// Persist userId and userEmail to localStorage on change
watch(userId, (val) => {
  if (val) {
    localStorage.setItem('userId', val)
  } else {
    localStorage.removeItem('userId')
  }
})

watch(userEmail, (val) => {
  if (val) {
    localStorage.setItem('userEmail', val)
  } else {
    localStorage.removeItem('userEmail')
  }
})

import LoginState from '@/components/LoginState.vue'
import CreateState from '@/components/CreateState.vue'
</script>

<template>
  <section class="login-box">
    <h2 v-if="!isLoggedIn">
      {{ mode === 'login' ? 'Login' : 'Create Account' }}
    </h2>

    <div v-if="!isLoggedIn">
      <LoginState 
        v-if="mode === 'login'" 
        @login="handleLogin"
        :key="mode + '-' + isLoggedIn" 
      />
      <CreateState 
        v-else 
        @create="handleCreate" 
      />

      <p class="toggle-link">
        <span>
          {{ mode === 'login' ? 'Need an account? ' : 'Already have an account? ' }}
          <span
            class="toggle-action"
            @click="mode = mode === 'login' ? 'create' : 'login'"
            tabindex="0"
            role="button"
          >
            {{ mode === 'login' ? 'Create one!' : 'Login!' }}
          </span>
        </span>
      </p>
    </div>

    <div v-else>
      <p>You are logged in as <strong>{{ userEmail }}</strong></p>
      
      <div class="button-wrapper">
        <button @click="handleLogout" class="button">Log Out</button>
      </div>
    </div>

    <p v-if="message" class="message">{{ message }}</p>
  </section>
</template>

<style scoped>
.button-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
}

.login-box {
  width: 380px;
  height: 430px;
  padding: 2rem;
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
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
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
  margin-top: 1rem;
  text-align: center;
}
.toggle-action {
  cursor: pointer;
  color:rgb(123, 154, 213);
  /* transition: border-bottom 0.2s, text-decoration 0.2s; */
}
.toggle-action:hover {
  text-decoration: underline;
}
.message {
  margin-top: 1rem;
  padding: 0.5rem;
  color: black;
  text-align: center;
}
</style>
<script setup>
import { ref, computed, defineEmits } from 'vue'

const email = ref('')
const password = ref('')
const message = ref('')

const hasLetter = computed(() => /[a-zA-Z]/.test(password.value))
const hasNumber = computed(() => /[0-9]/.test(password.value))
const isPasswordEmpty = computed(() => password.value.length === 0)
const isEmailEmpty = computed(() => email.value.length === 0)
const isLongEnough = computed(() => password.value.length >= 6)
const isValid = computed(() => hasLetter.value && hasNumber.value && isLongEnough.value)
const emit = defineEmits(['create'])

const handleSubmit = () => {
  if (!isValid.value) {
    message.value = 'Password must include at least one letter, one number and 6 characters.'
    return
  }
  emit('create', { email: email.value, password: password.value, setMessage: (msg) => (message.value = msg) })
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class = "structure">
      <label>Email:</label>
      <input v-model="email" type="email" required />
      <p v-if = "isEmailEmpty" style="color: red; padding-bottom:0.6rem;">Enter an email.</p>


      <label>Password:</label>
      <input v-model="password" type="password" required />

      <p v-if="isPasswordEmpty" style="color: red; padding-bottom:0.6rem;">Enter a password.</p>

      <template v-else-if="!isValid">
        <p v-if="!hasNumber" style="color: red; padding-bottom:0.6rem; max-width: 200px;">Password must include at least one number.</p>
        <p v-if="!hasLetter" style="color: red; padding-bottom:0.6rem; max-width: 200px;">Password must include at least one letter.</p>
        <p v-if="!isLongEnough" style="color: red; padding-bottom:0.6rem; max-width: 200px;">Password must include at least 6 characters.</p>

      </template>
      <p v-else style="color: green; padding-bottom:0.6rem">Password is valid.</p>

      <div class = "button-wrapper">
        <button type="submit" class="button">Create Account</button>
      </div>
    </div>
  </form>
  <p class="message" v-if="message">{{ message }}</p>
</template>

<style scoped>
.structure {
  display:flex;
  flex-direction: column;
  gap: 0.5rem;
  justify-content: center;
}

.button-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
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
.message {
  margin-top: 1rem;
  padding: 0.5rem;
  color: black;
  text-align: center;
}
</style>

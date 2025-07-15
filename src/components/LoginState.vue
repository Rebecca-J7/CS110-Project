<script setup>
import { ref, computed, defineEmits } from 'vue'

const email = ref('')
const password = ref('')
const message = ref('')

const isPasswordEmpty = computed(() => password.value.length === 0)
const isEmailEmpty = computed(() => email.value.length === 0)
// const isValid = computed(() => hasLetter.value && hasNumber.value)

const emit = defineEmits(['login'])

const handleSubmit = () => {
  if (isEmailEmpty.value) {
    message.value = 'Enter email.'
    return
  }
  if (isPasswordEmpty.value) {
    message.value = 'Enter password.'
    return
  }
  emit('login', { email: email.value, password: password.value, setMessage: (msg) => (message.value = msg) })
}
</script>

<template>
    <form @submit.prevent="handleSubmit">
        <div class = "structure">
            <label>Email:</label>
            <input v-model="email" type="email" required />
            <p v-if = "isEmailEmpty" style="color: red; padding-bottom:0.6rem;">Enter email.</p>

            <label>Password:</label>
            <input v-model="password" type="password" required />

            <p v-if="isPasswordEmpty" style="color: red; padding-bottom:0.6rem;">Enter password.</p>
            <div class = "button-wrapper">
                <button type="submit" class="button">Login</button>
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
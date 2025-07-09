
import { ref } from 'vue'

const isLoggedIn = ref(false)
const email = ref('')

export function useAuth() {
  return {
    isLoggedIn,
    email
  }
}
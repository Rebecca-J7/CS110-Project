import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyAz8AZCLG0RQag8_fjfOiHS9bP_-UxVXOo",
    authDomain: "cs110-aa317.firebaseapp.com",
    projectId: "cs110-aa317",
    storageBucket: "cs110-aa317.firebasestorage.app",
    messagingSenderId: "820470074807",
    appId: "1:820470074807:web:aecfbb7369e5135b706c32",
    measurementId: "G-HJ4Q54F54E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const auth = getAuth(app);

// Configure authentication persistence
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error('Error setting Firebase Auth persistence:', error)
  });

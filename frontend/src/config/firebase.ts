import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCgRVMFu4JvfHTO5W5GDbTLVqd9RCtwL5U",
  authDomain: "exchange-80ca8.firebaseapp.com",
  projectId: "exchange-80ca8",
  storageBucket: "exchange-80ca8.firebasestorage.app",
  messagingSenderId: "809593711584",
  appId: "1:809593711584:web:bc66206e7d5450547d9985",
  measurementId: "G-JNTE7ZY9KB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

export default app;

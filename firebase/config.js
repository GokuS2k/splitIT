import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAdD8FaCatFGGAXUK-QLasZnG_4s391pG4",
  authDomain: "splitit-267.firebaseapp.com",
  projectId: "splitit-267",
  storageBucket: "splitit-267.firebasestorage.app",
  messagingSenderId: "9480976710",
  appId: "1:9480976710:web:361267a6ffd3bb02220d47",
  measurementId: "G-8EHXWS172E",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

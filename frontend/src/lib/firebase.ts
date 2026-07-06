import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_ssIdtVjQ4p5JzWROXMcI8XQfx98_XxM",
  authDomain: "asl-app-be425.firebaseapp.com",
  projectId: "asl-app-be425",
  storageBucket: "asl-app-be425.appspot.com",
  messagingSenderId: "601536228729",
  appId: "1:601536228729:web:3edcc7ff58b30c3012d3a8",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
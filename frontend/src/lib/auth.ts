import { auth, googleProvider } from "./firebase";

import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";

// ================= GOOGLE LOGIN =================
export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

// ================= EMAIL LOGIN =================
export const loginWithEmail = async (
  email: string,
  password: string
) => {
  const result = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return result.user;
};

// ================= EMAIL SIGNUP =================
export const signupWithEmail = async (
  email: string,
  password: string,
  name: string
) => {
  const result = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  return result.user;
};

// ================= PASSWORD RESET =================
export const forgotPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// ================= LOGOUT =================
export const logout = async () => {
  await signOut(auth);
};
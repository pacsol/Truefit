"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  type User,
} from "firebase/auth";
import { getClientAuth } from "./client";

export type { User };

// ── Email / Password ───────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, name: string) {
  const cred = await createUserWithEmailAndPassword(
    getClientAuth(),
    email,
    password
  );
  await updateProfile(cred.user, { displayName: name });
  return cred.user;
}

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(
    getClientAuth(),
    email,
    password
  );
  return cred.user;
}

// ── Google ─────────────────────────────────────────────────────────────────────

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const cred = await signInWithPopup(getClientAuth(), googleProvider);
  return cred.user;
}

// ── Sign out ───────────────────────────────────────────────────────────────────

export async function signOut() {
  await firebaseSignOut(getClientAuth());
}

// ── Listener ───────────────────────────────────────────────────────────────────

export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(getClientAuth(), callback);
}

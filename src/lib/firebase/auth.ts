"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  getMultiFactorResolver,
  type User,
  type MultiFactorResolver,
  type MultiFactorError,
} from "firebase/auth";
import { getClientAuth } from "./client";

export type { User, MultiFactorResolver };

// ── Email / Password ───────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, name: string) {
  const cred = await createUserWithEmailAndPassword(
    getClientAuth(),
    email,
    password
  );
  await updateProfile(cred.user, { displayName: name });
  await sendEmailVerification(cred.user);
  return cred.user;
}

// ── Email verification ────────────────────────────────────────────────────────

export async function resendVerificationEmail() {
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  await sendEmailVerification(user);
}

export async function reloadUser(): Promise<User | null> {
  const user = getClientAuth().currentUser;
  if (!user) return null;
  await user.reload();
  return getClientAuth().currentUser;
}

export async function signIn(email: string, password: string) {
  try {
    const cred = await signInWithEmailAndPassword(
      getClientAuth(),
      email,
      password
    );
    return { user: cred.user, mfaResolver: null };
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "auth/multi-factor-auth-required") {
      const resolver = getMultiFactorResolver(
        getClientAuth(),
        err as MultiFactorError
      );
      return { user: null, mfaResolver: resolver };
    }
    throw err;
  }
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

// ── TOTP Authenticator ────────────────────────────────────────────────────────

export async function startTotpEnrollment(): Promise<TotpSecret> {
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  const session = await multiFactor(user).getSession();
  return TotpMultiFactorGenerator.generateSecret(session);
}

export async function completeTotpEnrollment(
  secret: TotpSecret,
  verificationCode: string
) {
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
    secret,
    verificationCode
  );
  await multiFactor(user).enroll(assertion, "Authenticator App");
}

export async function resolveMfaSignIn(
  resolver: MultiFactorResolver,
  otpCode: string
) {
  const totpHint = resolver.hints.find(
    (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
  );
  if (!totpHint) throw new Error("No authenticator enrolled");
  const assertion = TotpMultiFactorGenerator.assertionForSignIn(
    totpHint.uid,
    otpCode
  );
  const cred = await resolver.resolveSignIn(assertion);
  return cred.user;
}

export function hasTotpEnrolled(): boolean {
  const user = getClientAuth().currentUser;
  if (!user) return false;
  return multiFactor(user)
    .enrolledFactors.some(
      (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );
}

export async function unenrollTotp() {
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  const totpFactor = multiFactor(user).enrolledFactors.find(
    (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID
  );
  if (!totpFactor) throw new Error("No authenticator enrolled");
  await multiFactor(user).unenroll(totpFactor);
}

// ── Listener ───────────────────────────────────────────────────────────────────

export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(getClientAuth(), callback);
}

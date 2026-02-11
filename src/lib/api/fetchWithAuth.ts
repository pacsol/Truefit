"use client";

import { getClientAuth } from "@/lib/firebase/client";

/**
 * Wrapper around fetch that automatically attaches the Firebase ID token.
 */
export async function fetchWithAuth(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const auth = getClientAuth();
  const user = auth.currentUser;

  const headers = new Headers(init?.headers);
  if (user) {
    const token = await user.getIdToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...init, headers });
}

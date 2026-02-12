"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthChanged, reloadUser, type User } from "@/lib/firebase/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Re-reads the current Firebase user (e.g. after email verification). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setRev] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshUser = useCallback(async () => {
    await reloadUser();
    // Bump revision to force consumers to re-render with the
    // updated user properties (reload mutates the same reference).
    setRev((r) => r + 1);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

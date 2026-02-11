"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { getDocument, collections } from "@/lib/firebase/firestore";
import type { Profile } from "@/types";

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<(Profile & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    getDocument<Profile>(collections.profiles, user.uid)
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { profile, loading: authLoading || loading, user };
}

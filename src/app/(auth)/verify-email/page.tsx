"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { resendVerificationEmail, reloadUser, signOut } from "@/lib/firebase/auth";

export default function VerifyEmailPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
    // If already verified on mount, show the next-step options
    if (!loading && user?.emailVerified) {
      setVerified(true);
    }
  }, [loading, user, router]);

  // Poll for verification status every 4 seconds
  useEffect(() => {
    if (!user || user.emailVerified || verified) return;

    const interval = setInterval(async () => {
      const refreshed = await reloadUser();
      if (refreshed?.emailVerified) {
        setVerified(true);
        // Update the auth context so downstream pages see emailVerified = true
        await refreshUser();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [user, verified, refreshUser]);

  const handleResend = useCallback(async () => {
    setResending(true);
    setMessage("");
    try {
      await resendVerificationEmail();
      setMessage("Verification email sent! Check your inbox.");
    } catch {
      setMessage("Failed to send email. Please wait a moment and try again.");
    } finally {
      setResending(false);
    }
  }, []);

  const handleCheckNow = useCallback(async () => {
    setChecking(true);
    setMessage("");
    try {
      const refreshed = await reloadUser();
      if (refreshed?.emailVerified) {
        setVerified(true);
        await refreshUser();
      } else {
        setMessage("Email not verified yet. Please check your inbox and click the verification link.");
      }
    } catch {
      setMessage("Could not check verification status. Please try again.");
    } finally {
      setChecking(false);
    }
  }, [refreshUser]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--color-bg)" }}
    >
      <div
        className="w-full max-w-md space-y-6 p-8"
        style={{
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-lg)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        {/* ── Post-verification: offer authenticator setup ──────────────── */}
        {verified ? (
          <>
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "var(--color-accent-light)", color: "var(--color-success)" }}
              >
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: "var(--color-primary)" }}
              >
                Email Verified
              </h1>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Your email has been verified. Would you like to add an authenticator app for extra security?
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push("/setup-authenticator")}
                className="w-full py-2.5 text-sm font-semibold transition-opacity"
                style={{
                  background: "var(--color-accent)",
                  color: "var(--color-text-inverse)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                Set Up Authenticator App
              </button>

              <button
                onClick={() => router.replace("/onboarding")}
                className="w-full border py-2.5 text-sm font-semibold transition-opacity"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-primary)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                Skip for Now
              </button>
            </div>

            <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
              You can always enable an authenticator later from Settings.
            </p>
          </>
        ) : (
          /* ── Pending verification ─────────────────────────────────────── */
          <>
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}
              >
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: "var(--color-primary)" }}
              >
                Verify Your Email
              </h1>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                We sent a verification link to{" "}
                <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {user.email}
                </span>
                . Please click the link to verify your account.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCheckNow}
                disabled={checking}
                className="w-full py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{
                  background: "var(--color-accent)",
                  color: "var(--color-text-inverse)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {checking ? "Checking\u2026" : "I\u2019ve Verified My Email"}
              </button>

              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full border py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-primary)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {resending ? "Sending\u2026" : "Resend Verification Email"}
              </button>
            </div>

            {message && (
              <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                {message}
              </p>
            )}

            <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              Wrong email?{" "}
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.replace("/login");
                }}
                className="font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                Sign out & try again
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  startTotpEnrollment,
  completeTotpEnrollment,
  hasTotpEnrolled,
} from "@/lib/firebase/auth";
import { QRCodeSVG } from "qrcode.react";
import type { TotpSecret } from "firebase/auth";

type Step = "loading" | "qr" | "success" | "error";

export default function SetupAuthenticatorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!loading && user && !user.emailVerified) {
      router.replace("/verify-email");
      return;
    }
  }, [loading, user, router]);

  // Generate TOTP secret once user is available
  useEffect(() => {
    if (!user || !user.emailVerified) return;

    // If already enrolled, redirect
    if (hasTotpEnrolled()) {
      setStep("success");
      return;
    }

    startTotpEnrollment()
      .then((totpSecret) => {
        setSecret(totpSecret);
        setQrUrl(
          totpSecret.generateQrCodeUrl(user.email ?? "user", "Truefit")
        );
        setSecretKey(totpSecret.secretKey);
        setStep("qr");
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to generate authenticator secret"
        );
        setStep("error");
      });
  }, [user]);

  const handleVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!secret || code.length !== 6) return;
      setVerifying(true);
      setError("");

      try {
        await completeTotpEnrollment(secret, code);
        setStep("success");
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Invalid code. Please try again."
        );
      } finally {
        setVerifying(false);
      }
    },
    [secret, code]
  );

  const handleContinue = useCallback(() => {
    router.replace("/onboarding");
  }, [router]);

  if (loading || !user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--color-bg)" }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          style={{
            borderColor: "var(--color-accent)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

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
        {/* Header */}
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              background: "var(--color-accent-light)",
              color: "var(--color-accent)",
            }}
          >
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--color-primary)" }}
          >
            {step === "success"
              ? "Authenticator Enabled"
              : "Set Up Authenticator"}
          </h1>
        </div>

        {/* QR Code Step */}
        {step === "qr" && (
          <>
            <p
              className="text-center text-sm leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              Scan the QR code below with your authenticator app (Google
              Authenticator, Authy, etc.), then enter the 6-digit code.
            </p>

            <div className="flex justify-center">
              <div
                className="rounded-lg p-3"
                style={{ background: "#ffffff", border: "1px solid var(--color-border)" }}
              >
                <QRCodeSVG value={qrUrl} size={180} level="M" />
              </div>
            </div>

            <div>
              <p
                className="mb-1 text-center text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                Or enter this key manually:
              </p>
              <div
                className="flex items-center justify-center gap-2 rounded-md border px-3 py-2"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-bg)",
                }}
              >
                <code
                  className="text-xs font-mono tracking-wider select-all"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {secretKey}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(secretKey)}
                  className="shrink-0 text-xs font-medium"
                  style={{ color: "var(--color-accent)" }}
                >
                  Copy
                </button>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <label
                  htmlFor="totp-code"
                  className="block text-sm font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Verification Code
                </label>
                <input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="mt-1 block w-full border px-3 py-2.5 text-center text-lg font-mono tracking-[0.3em] focus:outline-none focus:ring-2"
                  style={{
                    borderColor: "var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              {error && (
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--color-risk)" }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={verifying || code.length !== 6}
                className="w-full py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{
                  background: "var(--color-accent)",
                  color: "var(--color-text-inverse)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {verifying ? "Verifying\u2026" : "Verify & Enable"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => router.replace("/onboarding")}
              className="w-full text-center text-sm font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              Skip for now
            </button>
          </>
        )}

        {/* Success Step */}
        {step === "success" && (
          <>
            <div className="flex justify-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: "var(--color-accent-light)",
                  color: "var(--color-success)",
                }}
              >
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <p
              className="text-center text-sm leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              Your authenticator app is connected. You will need to enter a code
              from your app each time you sign in.
            </p>
            <button
              onClick={handleContinue}
              className="w-full py-2.5 text-sm font-semibold transition-opacity"
              style={{
                background: "var(--color-accent)",
                color: "var(--color-text-inverse)",
                borderRadius: "var(--radius-md)",
              }}
            >
              Continue
            </button>
          </>
        )}

        {/* Loading Step */}
        {step === "loading" && (
          <div className="flex justify-center py-8">
            <div
              className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
              style={{
                borderColor: "var(--color-accent)",
                borderTopColor: "transparent",
              }}
            />
          </div>
        )}

        {/* Error Step */}
        {step === "error" && (
          <>
            <p
              className="text-center text-sm leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              Authenticator setup is not available yet. This feature requires
              Firebase Identity Platform to be enabled in the Firebase console.
            </p>
            <p
              className="text-center text-xs leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              You can enable it later from the Firebase console and set up
              the authenticator from Settings.
            </p>
            <button
              onClick={() => router.replace("/onboarding")}
              className="w-full py-2.5 text-sm font-semibold transition-opacity"
              style={{
                background: "var(--color-accent)",
                color: "var(--color-text-inverse)",
                borderRadius: "var(--radius-md)",
              }}
            >
              Continue to Profile Setup
            </button>
          </>
        )}
      </div>
    </div>
  );
}

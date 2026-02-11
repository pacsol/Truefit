"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp, signInWithGoogle } from "@/lib/firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, name);
        router.push("/onboarding");
      } else {
        await signIn(email, password);
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--color-bg)" }}
    >
      <div
        className="w-full max-w-md space-y-8 rounded-2xl p-8"
        style={{
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-lg)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <div className="text-center">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--color-primary)" }}
          >
            Job Hunter
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required={isSignUp}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2"
                style={{
                  borderColor: "var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: "var(--color-risk)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-text-inverse)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {loading ? "Please wait\u2026" : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: "var(--color-border)" }} />
          </div>
          <div className="relative flex justify-center text-sm">
            <span
              className="px-3"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-text-muted)",
              }}
            >
              or
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full rounded-lg border py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Continue with Google
        </button>

        <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          {isSignUp ? "Already have an account?" : "Don\u2019t have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="font-semibold"
            style={{ color: "var(--color-accent)" }}
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}

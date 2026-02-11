"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/cv-lab", label: "CV Lab" },
  { href: "/loop", label: "Loop" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="text-xl font-bold tracking-tight"
            style={{ color: "var(--color-primary)", fontFamily: "var(--font-primary)" }}
          >
            Truefit
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  color: isActive(item.href)
                    ? "var(--color-accent)"
                    : "var(--color-text-muted)",
                  background: isActive(item.href)
                    ? "var(--color-accent-light)"
                    : "transparent",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {user && (
            <div className="flex items-center gap-3">
              <span
                className="hidden text-sm sm:block"
                style={{ color: "var(--color-text-muted)" }}
              >
                {user.displayName || user.email}
              </span>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: "var(--color-secondary)",
                  color: "var(--color-text-inverse)",
                }}
              >
                {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* Mobile nav */}
        <nav
          className="flex gap-1 overflow-x-auto px-6 pb-3 md:hidden"
          style={{ borderColor: "var(--color-border)" }}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{
                color: isActive(item.href)
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)",
                background: isActive(item.href)
                  ? "var(--color-accent-light)"
                  : "transparent",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}

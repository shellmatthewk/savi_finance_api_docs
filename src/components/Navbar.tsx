"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Vault, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const links = [
  { label: "Problem", href: "#problem" },
  { label: "API", href: "#api-demo" },
  { label: "Buyers", href: "#buyers" },
  { label: "Market", href: "#market" },
  { label: "Pricing", href: "#pricing" },
  { label: "Architecture", href: "#architecture" },
  { label: "GTM", href: "#gtm" },
  { label: "Docs", href: "/docs" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Check if user is logged in
    fetch("/api/auth/me")
      .then((res) => {
        setIsLoggedIn(res.ok);
      })
      .catch(() => {
        setIsLoggedIn(false);
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition">
            <Vault className="w-4.5 h-4.5 text-accent-light" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Vault<span className="text-accent-light">Line</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 text-sm text-muted hover:text-foreground transition rounded-md hover:bg-white/5"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 text-muted hover:text-foreground transition rounded-lg hover:bg-white/5"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          {!checkingAuth && (
            isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-accent hover:bg-accent-dark transition text-white"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-accent hover:bg-accent-dark transition text-white"
                >
                  Get Started
                </Link>
              </>
            )
          )}
        </div>

        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-muted hover:text-foreground transition"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          <button
            className="text-muted hover:text-foreground"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden glass border-t border-border">
          <div className="px-6 py-4 flex flex-col gap-2">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-sm text-muted hover:text-foreground transition rounded-md hover:bg-white/5"
              >
                {l.label}
              </a>
            ))}
            {!checkingAuth && (
              isLoggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="mt-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent hover:bg-accent-dark transition text-white text-center"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setOpen(false)}
                    className="px-3 py-2 text-sm text-muted hover:text-foreground transition rounded-md hover:bg-white/5"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setOpen(false)}
                    className="mt-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent hover:bg-accent-dark transition text-white text-center"
                  >
                    Get Started
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

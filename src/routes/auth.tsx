import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { ARCHIVE_NAME } from "@/lib/archive";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `Curator access — ${ARCHIVE_NAME}` },
      { name: "description", content: "Private access for archive curators." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `Curator access — ${ARCHIVE_NAME}` },
      { property: "og:description", content: "Private access for archive curators." },
    ],
  }),
  component: AuthPage,
});

function getRedirectUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return `${window.location.origin}/auth`;
  }
  return "https://ais-dev-6ipto7vj3dhp57buq6sx6v-824089730068.asia-southeast1.run.app/auth";
}

/** Email + password sign in and password recovery for administrator accounts. */
function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    // 1. Inspect URL hash and query params for recovery flags or error codes
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace(/^#/, "");
      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(window.location.search);

      const errCode = hashParams.get("error_code") || searchParams.get("error_code");
      const errDesc = hashParams.get("error_description") || searchParams.get("error_description");
      const type = hashParams.get("type") || searchParams.get("type");

      if (errCode || errDesc) {
        const decoded = errDesc ? decodeURIComponent(errDesc.replace(/\+/g, " ")) : "";
        if (errCode === "otp_expired" || decoded.toLowerCase().includes("expired")) {
          setError(
            "This password reset link has expired or has already been used. Please request a new one.",
          );
          setResetMode(true);
        } else {
          setError(
            decoded ||
              "Authentication link error. Please try signing in or resetting your password.",
          );
        }
      } else if (type === "recovery" || hashParams.has("access_token")) {
        setIsRecoveryMode(true);
        setResetMode(false);
      }
    }

    // 2. Listen for Supabase PASSWORD_RECOVERY auth event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setResetMode(false);
        setError(null);
      }
    });

    // 3. If already signed in (and not in password recovery mode), navigate to /admin
    void supabase.auth.getSession().then(({ data }) => {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const isRecoveryHash = hash.includes("type=recovery") || hash.includes("access_token");
      if (data.session?.user && !isRecoveryHash && !isRecoveryMode) {
        void navigate({ to: "/admin" });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, isRecoveryMode]);

  async function handlePasswordReset(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      setBusy(false);
      return;
    }

    const redirectUrl = getRedirectUrl();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });

    setBusy(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setResetSent(true);
      setMessage(
        `A password reset link has been sent to ${cleanEmail}. Please check your inbox and spam folder.`,
      );
    }
  }

  async function handleUpdatePassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      setBusy(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your new password.");
      setBusy(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setUpdateSuccess(true);
    setMessage("Password updated successfully! Redirecting to curator dashboard…");

    setTimeout(() => {
      void navigate({ to: "/admin" });
    }, 1500);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    setBusy(false);
    if (signInError) {
      if (signInError.message.toLowerCase().includes("invalid login credentials")) {
        setError(
          "Invalid email or password. Please verify your credentials or reset your password.",
        );
      } else if (signInError.message.toLowerCase().includes("email not confirmed")) {
        setError(
          "Email address is not confirmed yet. Please verify or confirm the email in Supabase.",
        );
      } else {
        setError(signInError.message || "Those details were not recognised.");
      }
      return;
    }

    if (data.session) {
      void navigate({ to: "/admin" });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display text-xl tracking-[0.35em]">
          {ARCHIVE_NAME}
        </Link>

        <h1 className="display mt-8 text-4xl">
          {isRecoveryMode ? "Create new password" : resetMode ? "Reset password" : "Curator access"}
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          {isRecoveryMode
            ? "Choose a new password for your curator account."
            : resetMode
              ? "Enter your curator email address to receive a secure recovery link."
              : "This area is restricted to the archive's authorised administrators."}
        </p>

        {isRecoveryMode ? (
          <form onSubmit={handleUpdatePassword} className="mt-10 space-y-6">
            <div>
              <label htmlFor="new-password" className="eyebrow">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-2 w-full border-b border-border bg-transparent pb-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="eyebrow">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="mt-2 w-full border-b border-border bg-transparent pb-2 text-sm outline-none focus:border-accent"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-foreground">{message}</p>}

            <button
              type="submit"
              disabled={busy || updateSuccess}
              className="eyebrow w-full border border-accent py-3 text-accent transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              {busy ? "Saving…" : updateSuccess ? "Password updated" : "Set new password"}
            </button>
          </form>
        ) : resetMode ? (
          <form onSubmit={handlePasswordReset} className="mt-10 space-y-6">
            <div>
              <label htmlFor="reset-email" className="eyebrow">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="curator@example.com"
                className="mt-2 w-full border-b border-border bg-transparent pb-2 text-sm outline-none focus:border-accent"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-foreground">{message}</p>}

            <button
              type="submit"
              disabled={busy || resetSent}
              className="eyebrow w-full border border-accent py-3 text-accent transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              {busy ? "Sending…" : resetSent ? "Reset link sent" : "Send reset link"}
            </button>

            <button
              type="button"
              onClick={() => {
                setResetMode(false);
                setError(null);
                setMessage(null);
              }}
              className="eyebrow w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div>
              <label htmlFor="email" className="eyebrow">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full border-b border-border bg-transparent pb-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="eyebrow">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(true);
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full border-b border-border bg-transparent pb-2 text-sm outline-none focus:border-accent"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="eyebrow w-full border border-accent py-3 text-accent transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        <Link to="/" className="eyebrow mt-10 inline-block hover:text-foreground">
          ← Back to the archive
        </Link>
      </div>
    </div>
  );
}

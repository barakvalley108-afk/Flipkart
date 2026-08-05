"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function PanelLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password")
      })
    });

    const body = (await response.json()) as {
      ok?: boolean;
      redirectTo?: string;
      message?: string;
    };

    if (!response.ok || !body.redirectTo) {
      setError(body.message ?? "Login failed.");
      setLoading(false);
      return;
    }

    router.push(body.redirectTo);
  }

  return (
    <div className="login-form-card">
      <Link className="back-link" href="/">← Back to customer app</Link>
      <span className="section-kicker">WELCOME BACK</span>
      <h2>Sign in to your panel</h2>
      <p>Use the email and password assigned by the Super Admin.</p>

      <form onSubmit={submit}>
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="username"
            placeholder="partner@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            minLength={10}
            required
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Secure sign in"}
        </button>
      </form>

      <div className="login-help">
        <strong>Cannot sign in?</strong>
        <span>Contact the Super Admin to reset your panel access.</span>
      </div>
    </div>
  );
}

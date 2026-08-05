"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { brand } from "@/config/brand";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/customer/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.message ?? "Your request could not be completed.");
      setLoading(false);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next?.startsWith("/") ? next : body.redirectTo ?? "/");
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link className="brand-lockup" href="/"><span className="brand-symbol">{brand.logoText}</span><span><strong>{brand.name}</strong><small>FOOD + GROCERY</small></span></Link>
        <div><h1>{mode === "login" ? "Welcome back to easier everyday shopping." : "One account for food, grocery and every delivery update."}</h1><p>Save addresses, track orders, reorder favourites and check out securely from any device.</p></div>
        <div className="auth-story-note"><ShieldCheck /><span><strong>Protected customer access</strong><small>Passwords are hashed and sessions use signed HttpOnly cookies.</small></span></div>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">
          <Link className="back-home" href="/"><ArrowLeft /> Back to shopping</Link>
          <span>{mode === "login" ? "CUSTOMER SIGN IN" : "CREATE CUSTOMER ACCOUNT"}</span>
          <h2>{mode === "login" ? "Sign in" : "Join QuickCart"}</h2>
          <p>{mode === "login" ? "Use your email or ten-digit Indian mobile number." : "Phone is required; email is optional and can also be used to sign in."}</p>
          <form onSubmit={submit}>
            {mode === "register" && <label>Full name<input name="name" autoComplete="name" minLength={2} maxLength={80} required /></label>}
            {mode === "login" ? <label>Email or mobile number<input name="identity" autoComplete="username" required /></label> : <>
              <label>Mobile number<input name="phone" type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} autoComplete="tel" required /></label>
              <label>Email address <small>(optional)</small><input name="email" type="email" autoComplete="email" /></label>
            </>}
            <label>Password<input name="password" type="password" minLength={10} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} required />{mode === "register" && <small>10+ characters with uppercase, lowercase and a number.</small>}</label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button type="submit" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Sign in securely" : "Create account"}</button>
          </form>
          <p className="auth-swap">{mode === "login" ? <>New to QuickCart? <Link href="/register">Create an account</Link></> : <>Already have an account? <Link href="/login">Sign in</Link></>}</p>
        </div>
      </section>
    </main>
  );
}

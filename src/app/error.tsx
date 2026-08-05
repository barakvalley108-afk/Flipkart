"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="state-page"><AlertTriangle className="error-state-icon" /><span className="state-code">SOMETHING WENT WRONG</span><h1>This page could not be completed</h1><p>Your data is safe. Retry the request or return to the customer home page.</p><div className="error-actions"><button className="primary-button" type="button" onClick={reset}>Try again</button><Link href="/">Return home</Link></div></main>;
}

import Link from "next/link";

export default function NotFoundPage() {
  return <main className="state-page"><span className="state-code">404</span><h1>We could not find that page</h1><p>The link may be outdated, or the item may no longer be available.</p><Link className="primary-button" href="/">Return home</Link></main>;
}

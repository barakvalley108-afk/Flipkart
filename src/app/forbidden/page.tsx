import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="state-page">
      <span className="state-code">403</span>
      <h1>This area belongs to another role</h1>
      <p>Your account is signed in, but it does not have permission to open this page.</p>
      <Link className="primary-button" href="/">Return home</Link>
    </main>
  );
}

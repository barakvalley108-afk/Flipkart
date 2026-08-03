export default function UnauthorizedPage() {
  return (
    <main className="simple-message-page">
      <div>
        <span>ACCESS DENIED</span>
        <h1>This panel is not assigned to your account.</h1>
        <p>Sign out and use the correct partner login credentials.</p>
        <form action="/api/auth/logout" method="post">
          <button type="submit">Return to login</button>
        </form>
      </div>
    </main>
  );
}

import { PanelLoginForm } from "@/components/panel-login-form";
import Link from "next/link";

export const metadata = {
  title: "Partner Login"
};

export default function PanelLoginPage() {
  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <Link className="brand light-brand" href="/">
          <span className="brand-mark">Q</span>
          <span>
            <strong>QuickCart</strong>
            <small>Operations Suite</small>
          </span>
        </Link>
        <div className="login-copy">
          <span className="eyebrow">PRIVATE OPERATIONS</span>
          <h1>One secure workspace for every delivery partner.</h1>
          <p>
            Super Admin, restaurant, grocery and delivery teams access only the
            tools assigned to their role.
          </p>
        </div>
        <div className="security-note">
          <strong>Role-protected access</strong>
          <span>Secure cookie session • 12-hour expiry • Server-side checks</span>
        </div>
      </section>
      <section className="login-form-panel">
        <PanelLoginForm />
      </section>
    </main>
  );
}

import Link from "next/link";
import { CircleHelp, Mail, Phone, ReceiptText } from "lucide-react";
import { CustomerTopbar } from "@/components/customer-topbar";
import { brand } from "@/config/brand";

export const metadata = { title: "Customer Support" };
export default function SupportPage() {
  return <><CustomerTopbar /><main className="customer-page"><div className="page-container"><header className="page-header"><div><span>CUSTOMER CARE</span><h1>How can we help?</h1><p>Keep your order number ready for faster assistance.</p></div></header><div className="support-card-grid">
    <a className="surface-card support-card" href={`mailto:${brand.supportEmail}`}><Mail /><h2>Email support</h2><p>{brand.supportEmail}</p></a>
    <a className="surface-card support-card" href={`tel:${brand.supportPhone.replace(/\s/g, "")}`}><Phone /><h2>Call support</h2><p>{brand.supportPhone}</p></a>
    <Link className="surface-card support-card" href="/orders"><ReceiptText /><h2>Order help</h2><p>Open an order to view tracking or cancellation options.</p></Link>
    <div className="surface-card support-card"><CircleHelp /><h2>Common questions</h2><p>COD is available. UPI provider integration is prepared but not live yet.</p></div>
  </div></div></main></>;
}

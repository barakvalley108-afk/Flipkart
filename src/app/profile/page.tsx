import { CustomerTopbar } from "@/components/customer-topbar";
import { ProfileManager } from "@/components/profile-manager";
import { requireRole } from "@/lib/require-role";

export const metadata = { title: "Profile & Addresses" };
export default async function ProfilePage() {
  await requireRole(["CUSTOMER"]);
  return <><CustomerTopbar /><main className="customer-page"><div className="page-container"><header className="page-header"><div><span>YOUR ACCOUNT</span><h1>Profile & addresses</h1><p>Keep delivery details accurate for a smoother checkout.</p></div></header><ProfileManager /></div></main></>;
}

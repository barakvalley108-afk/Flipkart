import { CustomerTopbar } from "@/components/customer-topbar";
import { OrdersManager } from "@/components/orders-manager";
import { requireRole } from "@/lib/require-role";

export const metadata = { title: "My Orders" };
export default async function OrdersPage() { await requireRole(["CUSTOMER"]); return <><CustomerTopbar /><main className="customer-page"><div className="page-container"><header className="page-header"><div><span>ORDER HISTORY</span><h1>Your orders</h1><p>Track active deliveries, open invoices or reorder a favourite.</p></div></header><OrdersManager /></div></main></>; }

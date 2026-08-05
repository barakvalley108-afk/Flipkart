import { CustomerTopbar } from "@/components/customer-topbar";
import { OrderDetail } from "@/components/order-detail";
import { requireRole } from "@/lib/require-role";

export const metadata = { title: "Order Details" };
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) { await requireRole(["CUSTOMER"]); const { id } = await params; return <><CustomerTopbar /><main className="customer-page"><div className="page-container"><OrderDetail orderId={id} /></div></main></>; }

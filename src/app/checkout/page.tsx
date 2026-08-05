import { CheckoutManager } from "@/components/checkout-manager";
import { CustomerTopbar } from "@/components/customer-topbar";
import { requireRole } from "@/lib/require-role";

export const metadata = { title: "Checkout" };
export default async function CheckoutPage() {
  await requireRole(["CUSTOMER"]);
  return <><CustomerTopbar /><main className="customer-page"><div className="page-container checkout-container"><header className="page-header"><div><span>SECURE CHECKOUT</span><h1>Review and place order</h1><p>One store per order keeps fulfilment fast and predictable.</p></div></header><CheckoutManager /></div></main></>;
}

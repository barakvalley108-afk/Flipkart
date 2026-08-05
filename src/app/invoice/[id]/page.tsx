import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { brand } from "@/config/brand";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/lib/require-role";

export const metadata = { title: "Invoice" };
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(["CUSTOMER", "SUPER_ADMIN", "RESTAURANT", "GROCERY", "DELIVERY"]);
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, include: { customer: true, store: true, address: true, items: true, payment: true, delivery: true } });
  if (!order) notFound();
  const allowed = session.role === "SUPER_ADMIN" || order.customerId === session.userId || order.store.ownerId === session.userId || order.delivery?.riderId === session.userId;
  if (!allowed) notFound();
  return <main className="invoice-page"><div className="invoice-toolbar"><a href={session.role === "CUSTOMER" ? `/orders/${order.id}` : `/${session.role === "SUPER_ADMIN" ? "admin" : session.role.toLowerCase()}`}>Back</a><PrintButton /></div><article className="invoice-sheet"><header><div className="brand-lockup"><span className="brand-symbol">{brand.logoText}</span><span><strong>{brand.name}</strong><small>FOOD + GROCERY</small></span></div><div><span>TAX INVOICE</span><h1>{order.invoiceNumber}</h1><p>{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div></header><section className="invoice-parties"><div><span>BILLED BY</span><strong>{order.store.name}</strong><p>{order.store.address}<br />{order.store.pincode}<br />{order.store.phone}</p></div><div><span>DELIVERED TO</span><strong>{order.address.recipient}</strong><p>{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}<br />{order.address.city}, {order.address.state} — {order.address.pincode}<br />{order.address.phone}</p></div></section><table><thead><tr><th>Item</th><th>Variant</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id}><td>{item.productName}</td><td>{item.variantName}</td><td>{item.quantity}</td><td>{formatMoney(item.unitPricePaise + item.addonTotalPaise)}</td><td>{formatMoney(item.totalPaise)}</td></tr>)}</tbody></table><section className="invoice-totals"><dl><div><dt>Subtotal</dt><dd>{formatMoney(order.subtotalPaise)}</dd></div><div><dt>Discount</dt><dd>− {formatMoney(order.discountPaise)}</dd></div><div><dt>Delivery charge</dt><dd>{formatMoney(order.deliveryFeePaise)}</dd></div><div><dt>Tax</dt><dd>{formatMoney(order.taxPaise)}</dd></div><div><dt>Total</dt><dd>{formatMoney(order.totalPaise)}</dd></div></dl></section><footer><p>Order {order.orderNumber} · {order.paymentMethod} · {order.paymentStatus}</p><p>Thank you for choosing {brand.name}.</p></footer></article></main>;
}

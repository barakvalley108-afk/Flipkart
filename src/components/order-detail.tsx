"use client";

import Link from "next/link";
import { Check, Circle, Clock3, Download, KeyRound, MapPin, PackageCheck, Phone, RefreshCw, Store, XCircle } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { orderFlows } from "@/lib/order-workflow";

type Order = {
  id: string; orderNumber: string; invoiceNumber: string; type: "FOOD" | "GROCERY"; status: string; statusHistory: unknown; subtotalPaise: number; discountPaise: number; deliveryFeePaise: number; totalPaise: number; paymentMethod: string; paymentStatus: string; notes?: string | null; cancellationReason?: string | null; createdAt: string;
  store: { name: string; phone: string; address: string };
  address: { label: string; recipient: string; phone: string; line1: string; line2?: string | null; city: string; state: string; pincode: string };
  items: Array<{ id: string; productName: string; variantName: string; quantity: number; unitPricePaise: number; addonTotalPaise: number; totalPaise: number }>;
  delivery?: { rider: { name: string; phone?: string | null } } | null;
};
type Notification = { data?: { orderId?: string; deliveryOtp?: string } | null };

async function request<T>(url: string, options?: RequestInit): Promise<T> { const response = await fetch(url, options); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message ?? "Request failed."); return body.data as T; }

export function OrderDetail({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [justPlaced, setJustPlaced] = useState(false);
  const load = useCallback(async () => {
    try {
      const [orderData, notifications] = await Promise.all([request<Order>(`/api/orders/${orderId}`), request<Notification[]>("/api/notifications").catch(() => [])]);
      setOrder(orderData); const note = notifications.find((item) => item.data?.orderId === orderId && item.data?.deliveryOtp); setOtp(note?.data?.deliveryOtp ?? "");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Order unavailable."); }
    finally { setLoading(false); }
  }, [orderId]);
  useEffect(() => { void load(); setJustPlaced(new URLSearchParams(window.location.search).has("placed")); const timer = window.setInterval(() => void load(), 30000); return () => window.clearInterval(timer); }, [load]);

  const flow = useMemo(() => order ? orderFlows[order.type] : [], [order]);
  const activeIndex = order ? flow.indexOf(order.status as never) : -1;
  const canCancel = order && ["PLACED", "ACCEPTED"].includes(order.status);

  async function action(kind: "cancel" | "reorder", reason?: string) {
    try { const result = await request<{ redirectTo?: string }>(`/api/orders/${orderId}/action`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(kind === "cancel" ? { action: kind, reason } : { action: kind }) }); if (result?.redirectTo) router.push(result.redirectTo); else { setMessage("Order cancelled successfully."); setShowCancel(false); await load(); } }
    catch (error) { setMessage(error instanceof Error ? error.message : "Action failed."); }
  }
  function cancelSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const reason = String(new FormData(event.currentTarget).get("reason")); void action("cancel", reason); }

  if (loading) return <div className="surface-card page-loading">Loading live order details…</div>;
  if (!order) return <div className="surface-card form-error">{message || "Order not found."}</div>;
  return <div className="order-detail-layout">
    {justPlaced && <div className="order-placed-banner"><PackageCheck /><div><strong>Order placed successfully</strong><span>The store has been notified and will review it shortly.</span></div></div>}
    {message && <div className="form-success">{message}</div>}
    <section className="surface-card order-overview"><div><span>{order.type} ORDER</span><h1>{order.orderNumber}</h1><p>Placed {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div><div><b className={`status status-${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</b><strong>{formatMoney(order.totalPaise)}</strong></div></section>
    {order.status === "CANCELLED" ? <section className="surface-card cancelled-state"><XCircle /><div><h2>Order cancelled</h2><p>{order.cancellationReason || "This order was cancelled."}</p></div></section> : <section className="surface-card"><div className="card-heading"><Clock3 /><div><span>LIVE TRACKING</span><h2>Order timeline</h2></div></div><ol className="order-timeline">{flow.map((status, index) => <li className={index < activeIndex ? "done" : index === activeIndex ? "active" : ""} key={status}>{index <= activeIndex ? <Check /> : <Circle />}<span><strong>{status.replaceAll("_", " ")}</strong><small>{index < activeIndex ? "Completed" : index === activeIndex ? "Current status" : "Upcoming"}</small></span></li>)}</ol></section>}
    {otp && !["DELIVERED", "CANCELLED"].includes(order.status) && <section className="delivery-otp-card"><KeyRound /><div><span>DELIVERY OTP</span><strong>{otp}</strong><p>Share this only after receiving the complete order.</p></div></section>}
    <div className="order-info-grid"><section className="surface-card"><div className="card-heading"><Store /><div><span>FULFILLED BY</span><h2>{order.store.name}</h2></div></div><p>{order.store.address}</p><a href={`tel:${order.store.phone}`}><Phone /> {order.store.phone}</a></section><section className="surface-card"><div className="card-heading"><MapPin /><div><span>DELIVER TO</span><h2>{order.address.label}</h2></div></div><p>{order.address.recipient}, {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city}, {order.address.state} — {order.address.pincode}</p>{order.delivery?.rider.phone && <a href={`tel:${order.delivery.rider.phone}`}><Phone /> Rider: {order.delivery.rider.name} · {order.delivery.rider.phone}</a>}</section></div>
    <section className="surface-card"><div className="card-heading"><PackageCheck /><div><span>ITEMS & PAYMENT</span><h2>Order summary</h2></div></div><div className="order-lines">{order.items.map((item) => <div key={item.id}><span><strong>{item.quantity}× {item.productName}</strong><small>{item.variantName}</small></span><b>{formatMoney(item.totalPaise)}</b></div>)}</div><dl className="bill-lines"><div><dt>Subtotal</dt><dd>{formatMoney(order.subtotalPaise)}</dd></div><div><dt>Discount</dt><dd>− {formatMoney(order.discountPaise)}</dd></div><div><dt>Delivery</dt><dd>{formatMoney(order.deliveryFeePaise)}</dd></div><div className="bill-total"><dt>Total · {order.paymentMethod}</dt><dd>{formatMoney(order.totalPaise)}</dd></div></dl></section>
    <div className="order-actions"><Link href={`/invoice/${order.id}`} target="_blank"><Download /> Printable invoice</Link><button type="button" onClick={() => void action("reorder")}><RefreshCw /> Reorder</button>{canCancel && <button className="danger" type="button" onClick={() => setShowCancel(true)}>Cancel order</button>}</div>
    {showCancel && <div className="modal-backdrop"><form className="location-modal" onSubmit={cancelSubmit}><button className="modal-close" type="button" onClick={() => setShowCancel(false)}><XCircle /></button><span>CANCEL ORDER</span><h2>Tell us why</h2><p>Cancellation is available only before the configured confirmation cutoff.</p><label className="field">Reason<textarea name="reason" minLength={3} maxLength={200} required /></label><button className="primary-button" type="submit">Confirm cancellation</button></form></div>}
  </div>;
}

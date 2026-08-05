"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, PackageOpen, RefreshCw, Store } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";

type Order = { id: string; orderNumber: string; type: string; status: string; totalPaise: number; createdAt: string; store: { name: string; imageUrl?: string | null }; items: Array<{ productName: string; variantName: string; quantity: number }> };

async function request<T>(url: string, options?: RequestInit): Promise<T> { const response = await fetch(url, options); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message ?? "Request failed."); return body.data as T; }

export function OrdersManager() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { try { setOrders(await request<Order[]>("/api/orders")); } catch (error) { setMessage(error instanceof Error ? error.message : "Orders unavailable."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);

  async function reorder(orderId: string) {
    setMessage("");
    try { const result = await request<{ redirectTo: string }>(`/api/orders/${orderId}/action`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reorder" }) }); router.push(result?.redirectTo ?? "/checkout"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not reorder."); }
  }

  if (loading) return <div className="surface-card page-loading">Loading order history…</div>;
  if (!orders.length) return <div className="surface-card orders-empty"><PackageOpen /><h2>No orders yet</h2><p>Your placed orders and live tracking will appear here.</p><Link href="/">Start shopping</Link></div>;
  return <div className="orders-list">{message && <div className="form-error">{message}</div>}{orders.map((order) => <article className="surface-card order-card" key={order.id}>
    <Image src={order.store.imageUrl?.startsWith("/") ? order.store.imageUrl : "/icon.svg"} alt="" width={90} height={90} /><div className="order-card-main"><div className="order-card-top"><span><small>{order.type}</small><strong>{order.orderNumber}</strong></span><b className={`status status-${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</b></div><h2><Store /> {order.store.name}</h2><p>{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(", ")}</p><small><Clock3 /> {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></div><div className="order-card-actions"><strong>{formatMoney(order.totalPaise)}</strong><Link href={`/orders/${order.id}`}>View order <ArrowRight /></Link><button type="button" onClick={() => void reorder(order.id)}><RefreshCw /> Reorder</button></div>
  </article>)}</div>;
}

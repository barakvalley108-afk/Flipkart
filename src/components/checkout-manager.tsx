"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, ShieldCheck, ShoppingBag, TicketPercent } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";

type Address = { id: string; label: string; recipient: string; line1: string; city: string; state: string; pincode: string; isDefault: boolean };
type Cart = { store: { name: string; minimumOrderPaise: number } | null; itemCount: number; subtotalPaise: number; items: Array<{ id: string; quantity: number; lineTotalPaise: number; product: { name: string; imageUrl?: string | null }; variant: { name: string } }> };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Request failed.");
  return body.data as T;
}

export function CheckoutManager() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [cartData, profile] = await Promise.all([request<Cart>("/api/cart"), request<{ addresses: Address[] }>("/api/customer/profile")]);
      setCart(cartData); setAddresses(profile.addresses);
      setSelectedAddress(profile.addresses.find((address) => address.isDefault)?.id ?? profile.addresses[0]?.id ?? "");
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Checkout unavailable."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPlacing(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const order = await request<{ orderId: string }>("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addressId: selectedAddress, paymentMethod: form.get("paymentMethod"), couponCode: form.get("couponCode") || undefined, notes: form.get("notes") || undefined })
      });
      router.push(`/orders/${order.orderId}?placed=1`);
    } catch (checkoutError) { setError(checkoutError instanceof Error ? checkoutError.message : "Order could not be placed."); setPlacing(false); }
  }

  if (loading) return <div className="surface-card page-loading">Preparing secure checkout…</div>;
  if (!cart?.items.length) return <div className="surface-card empty-checkout"><ShoppingBag /><h2>Your cart is empty</h2><p>Add items from a store before opening checkout.</p><Link href="/">Continue shopping</Link></div>;

  return <form className="checkout-layout" onSubmit={placeOrder}>
    <div className="checkout-main stack">
      <section className="surface-card"><div className="card-heading"><MapPin /><div><span>STEP 1</span><h2>Delivery address</h2></div></div>
        {!addresses.length ? <div className="address-required"><p>Add a serviceable delivery address before placing the order.</p><Link href="/profile">Add an address <ArrowRight /></Link></div> : <div className="checkout-addresses">{addresses.map((address) => <label className={selectedAddress === address.id ? "selected" : ""} key={address.id}><input type="radio" name="addressId" value={address.id} checked={selectedAddress === address.id} onChange={() => setSelectedAddress(address.id)} /><span><strong>{address.label} {address.isDefault && <b>Default</b>}</strong><small>{address.recipient}, {address.line1}, {address.city}, {address.state} — {address.pincode}</small></span><CheckCircle2 /></label>)}</div>}
      </section>
      <section className="surface-card"><div className="card-heading"><TicketPercent /><div><span>STEP 2</span><h2>Offer & note</h2></div></div><div className="form-grid"><label className="field">Coupon code<input name="couponCode" placeholder="WELCOME20" autoCapitalize="characters" /></label><label className="field">Order note<input name="notes" maxLength={300} placeholder="Optional instructions" /></label></div></section>
      <section className="surface-card"><div className="card-heading"><ShieldCheck /><div><span>STEP 3</span><h2>Payment method</h2></div></div><div className="payment-options"><label className="selected"><input type="radio" name="paymentMethod" value="COD" defaultChecked /><span><strong>Cash on delivery</strong><small>Pay the rider after receiving your complete order.</small></span><CheckCircle2 /></label><label className="disabled"><input type="radio" name="paymentMethod" value="UPI" disabled /><span><strong>UPI</strong><small>Architecture prepared; Razorpay/provider connection is not enabled yet.</small></span></label></div></section>
      {error && <div className="form-error" role="alert">{error}</div>}
    </div>
    <aside className="surface-card checkout-summary"><span>ORDER SUMMARY</span><h2>{cart.store?.name}</h2><div className="checkout-items">{cart.items.map((item) => <article key={item.id}><Image src={item.product.imageUrl?.startsWith("/") ? item.product.imageUrl : "/icon.svg"} alt="" width={52} height={52} /><div><strong>{item.product.name}</strong><small>{item.variant.name} × {item.quantity}</small></div><b>{formatMoney(item.lineTotalPaise)}</b></article>)}</div><dl><div><dt>Items</dt><dd>{formatMoney(cart.subtotalPaise)}</dd></div><div><dt>Delivery</dt><dd>Calculated by pincode</dd></div><div><dt>Coupon</dt><dd>Applied on placement</dd></div></dl><button type="submit" disabled={placing || !selectedAddress}>{placing ? "Placing order…" : <>Place COD order <ArrowRight /></>}</button><p><ShieldCheck /> Stock, coupon and delivery eligibility will be rechecked securely.</p><Link className="checkout-back" href="/"><ArrowLeft /> Continue shopping</Link></aside>
  </form>;
}

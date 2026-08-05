"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock3, Minus, Plus, ShieldCheck, ShoppingBag, Star, Store } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";

type Product = {
  id: string; name: string; description?: string | null; imageUrl?: string | null; isVeg?: boolean | null;
  store: { id: string; name: string; isOpen: boolean; rating: number; averagePrepMins: number; minimumOrderPaise: number };
  category: { name: string };
  variants: Array<{ id: string; name: string; unit: string; mrpPaise: number; salePricePaise: number; stock: number; isAvailable: boolean }>;
  addons: Array<{ id: string; name: string; pricePaise: number; isAvailable: boolean }>;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> { const response = await fetch(url, options); const body = await response.json().catch(() => ({})); if (!response.ok) throw Object.assign(new Error(body.message ?? "Request failed."), { status: response.status }); return body.data as T; }

export function ProductDetailClient({ productId }: { productId: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [variantId, setVariantId] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { const value = await request<Product>(`/api/products/${productId}`); setProduct(value); setVariantId(value.variants.find((item) => item.isAvailable && item.stock > 0)?.id ?? value.variants[0]?.id ?? ""); } catch (error) { setMessage(error instanceof Error ? error.message : "Product unavailable."); } finally { setLoading(false); } }, [productId]);
  useEffect(() => { void load(); }, [load]);
  const variant = product?.variants.find((item) => item.id === variantId);
  const addonTotal = useMemo(() => product?.addons.filter((addon) => addonIds.includes(addon.id)).reduce((sum, addon) => sum + addon.pricePaise, 0) ?? 0, [product, addonIds]);
  const total = ((variant?.salePricePaise ?? 0) + addonTotal) * quantity;

  async function add(buyNow = false) {
    if (!variant) return;
    try { await request("/api/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ variantId: variant.id, quantity, addonIds }) }); if (buyNow) router.push("/checkout"); else setMessage(`${product?.name} added to cart.`); }
    catch (error) { if ((error as { status?: number }).status === 401) router.push(`/login?next=/products/${productId}`); else setMessage(error instanceof Error ? error.message : "Could not add product."); }
  }

  if (loading) return <div className="page-container product-detail-loading"><i /><b /><span /></div>;
  if (!product || !variant) return <div className="state-page"><span className="state-code">PRODUCT</span><h1>Product is unavailable</h1><p>{message}</p><Link className="primary-button" href="/">Back to shop</Link></div>;
  const unavailable = !product.store.isOpen || !variant.isAvailable || variant.stock < 1;
  return <main className="customer-page"><div className="page-container"><Link className="back-home" href="/"><ArrowLeft /> Back to shopping</Link><div className="product-detail-grid"><section className="product-detail-image"><Image src={product.imageUrl?.startsWith("/") ? product.imageUrl : "/icon.svg"} alt={product.name} width={620} height={520} priority />{product.isVeg !== null && <span className={product.isVeg ? "veg" : "nonveg"}>{product.isVeg ? "VEG" : "NON-VEG"}</span>}</section><section className="surface-card product-detail-content"><span className="product-detail-category">{product.category.name}</span><h1>{product.name}</h1><p>{product.description}</p><div className="detail-store"><Store /><span><strong>{product.store.name}</strong><small><Star /> {product.store.rating.toFixed(1)} · <Clock3 /> {product.store.averagePrepMins} min prep</small></span></div>
    <fieldset className="choice-set"><legend>Choose a size</legend>{product.variants.map((item) => <label className={variantId === item.id ? "selected" : ""} key={item.id}><input type="radio" name="variant" checked={variantId === item.id} onChange={() => { setVariantId(item.id); setQuantity(1); }} disabled={!item.isAvailable || item.stock < 1} /><span><strong>{item.name}</strong><small>{item.unit}{item.stock < 1 ? " · Out of stock" : ""}</small></span><b>{formatMoney(item.salePricePaise)}</b><Check /></label>)}</fieldset>
    {product.addons.length > 0 && <fieldset className="choice-set"><legend>Add something extra</legend>{product.addons.map((addon) => <label className={addonIds.includes(addon.id) ? "selected" : ""} key={addon.id}><input type="checkbox" checked={addonIds.includes(addon.id)} onChange={(event) => setAddonIds((current) => event.target.checked ? [...current, addon.id] : current.filter((id) => id !== addon.id))} /><span><strong>{addon.name}</strong></span><b>+ {formatMoney(addon.pricePaise)}</b><Check /></label>)}</fieldset>}
    <div className="detail-buy-row"><div className="quantity-control detail-quantity"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus /></button><span>{quantity}</span><button type="button" disabled={quantity >= variant.stock} onClick={() => setQuantity((value) => Math.min(variant.stock, value + 1))}><Plus /></button></div><button type="button" disabled={unavailable} onClick={() => void add()}><ShoppingBag /><span>Add to cart</span><strong>{formatMoney(total)}</strong></button></div><button className="detail-buy-now" type="button" disabled={unavailable} onClick={() => void add(true)}>Buy now <ArrowRight /></button>{message && <div className="form-success">{message}</div>}<small className="detail-security"><ShieldCheck /> Stock and final pricing are verified again at checkout.</small>
  </section></div></div></main>;
}

"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Grid2X2,
  Home,
  MapPin,
  Minus,
  PackageOpen,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Star,
  Store,
  Trash2,
  UserRound,
  UtensilsCrossed,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { brand } from "@/config/brand";
import { formatMoney } from "@/lib/money";

type Mode = "food" | "grocery";
type Variant = { id: string; name: string; unit: string; mrpPaise: number; salePricePaise: number; stock: number; isAvailable: boolean };
type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isVeg?: boolean | null;
  store: { id: string; name: string; isOpen: boolean; rating: number; averagePrepMins: number };
  category: { id: string; name: string; slug: string };
  variants: Variant[];
};
type CatalogData = {
  mode: Mode;
  categories: Array<{ id: string; name: string; slug: string; imageUrl?: string | null }>;
  stores: Array<{ id: string; name: string; slug: string; description?: string | null; imageUrl?: string | null; isOpen: boolean; rating: number; averagePrepMins: number; minimumOrderPaise: number; deliveryFeePaise: number }>;
  banners: Array<{ id: string; title: string; subtitle?: string | null; imageUrl: string; linkUrl?: string | null }>;
  products: CatalogProduct[];
};
type CartData = {
  store: { id: string; name: string; minimumOrderPaise: number } | null;
  itemCount: number;
  subtotalPaise: number;
  items: Array<{
    id: string;
    quantity: number;
    lineTotalPaise: number;
    product: { name: string; imageUrl?: string | null };
    variant: { name: string; salePricePaise: number; stock: number };
  }>;
};

const fallbackCategoryImages: Record<Mode, string[]> = {
  food: ["/categories/biryani.svg", "/categories/momos.svg", "/categories/meals.svg", "/categories/drinks.svg"],
  grocery: ["/categories/vegetables.svg", "/categories/fruits.svg", "/categories/dairy.svg", "/categories/snacks.svg"]
};

function safeImage(url: string | null | undefined, fallback: string) {
  return url?.startsWith("/") ? url : fallback;
}

async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.message ?? "Something went wrong."), { status: response.status, code: body.code });
  return body.data as T;
}

export function Storefront({ initialMode = "grocery" }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [diet, setDiet] = useState<"all" | "veg" | "nonveg">("all");
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [cart, setCart] = useState<CartData | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [pincode, setPincode] = useState("");
  const [location, setLocation] = useState<string>(brand.defaultLocation);
  const [bannerIndex, setBannerIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ mode });
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (category) params.set("category", category);
    if (diet !== "all") params.set("veg", String(diet === "veg"));
    try {
      setCatalog(await jsonRequest<CatalogData>(`/api/catalog?${params}`));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Catalog could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [mode, debouncedSearch, category, diet]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);
  useEffect(() => {
    if (!catalog?.banners.length || catalog.banners.length < 2) return;
    const timer = window.setInterval(() => setBannerIndex((index) => (index + 1) % catalog.banners.length), 5500);
    return () => window.clearInterval(timer);
  }, [catalog?.banners.length]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadCart(open = false) {
    try {
      setCart(await jsonRequest<CartData>("/api/cart"));
      if (open) setCartOpen(true);
    } catch (requestError) {
      const status = (requestError as { status?: number }).status;
      if (status === 401) router.push("/login?next=/");
      else setToast(requestError instanceof Error ? requestError.message : "Cart unavailable.");
    }
  }

  async function addToCart(product: CatalogProduct, buyNow = false) {
    const variant = product.variants.find((item) => item.isAvailable && item.stock > 0);
    if (!variant) return setToast("This product is out of stock.");
    try {
      const next = await jsonRequest<CartData>("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, quantity: 1, addonIds: [] })
      });
      setCart(next);
      setToast(`${product.name} added to cart.`);
      if (buyNow) router.push("/checkout");
    } catch (requestError) {
      const status = (requestError as { status?: number }).status;
      if (status === 401) router.push(`/login?next=${encodeURIComponent(buyNow ? "/checkout" : "/")}`);
      else setToast(requestError instanceof Error ? requestError.message : "Could not add item.");
    }
  }

  async function updateCartItem(itemId: string, quantity: number) {
    try {
      setCart(await jsonRequest<CartData>("/api/cart", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId, quantity })
      }));
    } catch (requestError) {
      setToast(requestError instanceof Error ? requestError.message : "Cart could not be updated.");
    }
  }

  async function clearCart() {
    try { setCart(await jsonRequest<CartData>("/api/cart", { method: "DELETE" })); }
    catch (requestError) { setToast(requestError instanceof Error ? requestError.message : "Cart could not be cleared."); }
  }

  async function checkPincode(event: React.FormEvent) {
    event.preventDefault();
    try {
      const result = await jsonRequest<{ serviceable: boolean; city?: string; state?: string; estimatedDeliveryMin?: number }>(`/api/pincodes/${pincode}`);
      if (!result.serviceable) return setToast("We do not deliver to this pincode yet.");
      setLocation(`${result.city ?? "Delivery area"}, ${result.state ?? "India"}`);
      setToast(`Delivery available in about ${result.estimatedDeliveryMin} minutes.`);
      setLocationOpen(false);
    } catch (requestError) {
      setToast(requestError instanceof Error ? requestError.message : "Pincode check failed.");
    }
  }

  const suggestions = useMemo(() => {
    if (!search.trim() || !catalog) return [];
    return catalog.products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5);
  }, [search, catalog]);

  const banner = catalog?.banners[bannerIndex];
  function changeMode(next: Mode) {
    setMode(next);
    setCategory("");
    setDiet("all");
    setBannerIndex(0);
  }

  return (
    <div className="customer-app" id="top">
      <header className="customer-header">
        <div className="customer-header-inner">
          <Link className="brand-lockup" href="/" aria-label={`${brand.name} home`}>
            <span className="brand-symbol">{brand.logoText}</span>
            <span><strong>{brand.name}</strong><small>FOOD + GROCERY</small></span>
          </Link>
          <button className="location-control" type="button" onClick={() => setLocationOpen(true)}>
            <MapPin aria-hidden="true" />
            <span><small>Deliver to</small><strong>{location}</strong></span>
            <ChevronDown aria-hidden="true" />
          </button>
          <div className="search-wrap desktop-only">
            <Search aria-hidden="true" />
            <input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dishes, products or stores" aria-label="Search products" />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")}><X /></button>}
            {suggestions.length > 0 && <div className="search-suggestions">{suggestions.map((item) => <Link href={`/products/${item.id}`} key={item.id}>{item.name}<span>{item.store.name}</span></Link>)}</div>}
          </div>
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="/orders">Orders</Link>
            <Link href="/profile">Profile</Link>
            <Link className="partner-entry" href="/panel-login">Partner</Link>
          </nav>
          <button className="cart-button" type="button" onClick={() => void loadCart(true)} aria-label={`Cart with ${cart?.itemCount ?? 0} items`}>
            <ShoppingBag /> <span>Cart</span>{Boolean(cart?.itemCount) && <b>{cart?.itemCount}</b>}
          </button>
        </div>
      </header>

      <main className="customer-main">
        <section className="mobile-search-block">
          <div className="search-wrap">
            <Search aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food and groceries" aria-label="Search products" />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")}><X /></button>}
          </div>
        </section>

        <section className="commerce-switch content-container" aria-label="Choose shopping section">
          <button className={mode === "grocery" ? "active" : ""} type="button" onClick={() => changeMode("grocery")}>
            <ShoppingBasket /><span><strong>Grocery</strong><small>Fresh daily essentials</small></span>
          </button>
          <button className={mode === "food" ? "active" : ""} type="button" onClick={() => changeMode("food")}>
            <UtensilsCrossed /><span><strong>Food</strong><small>Meals made nearby</small></span>
          </button>
        </section>

        <section className="premium-hero content-container">
          <div className="hero-content">
            <span className="overline">LOCAL STORES. ONE SMOOTH CART.</span>
            <h1>{mode === "grocery" ? "The good stuff your home needs, right on time." : "Local favourites, warm and ready when you are."}</h1>
            <p>{brand.description}</p>
            <button type="button" onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>Explore today&apos;s picks <ArrowRight /></button>
            <div className="hero-proof"><span><ShieldCheck /> Secure checkout</span><span><Clock3 /> Clear delivery updates</span></div>
          </div>
          <div className="hero-collage" aria-hidden="true">
            <span className="collage-card large"><Image src={mode === "grocery" ? "/products/apples.svg" : "/products/chicken-biryani.svg"} alt="" width={420} height={320} priority /></span>
            <span className="collage-card small"><Image src={mode === "grocery" ? "/products/milk.svg" : "/products/momos.svg"} alt="" width={220} height={180} /></span>
            <span className="speed-note"><Clock3 /><strong>{mode === "grocery" ? "15–30" : "25–40"} min</strong><small>Typical delivery</small></span>
          </div>
        </section>

        {banner && <section className="campaign-banner content-container" aria-roledescription="carousel">
          <div><span>QUICKCART EDIT</span><h2>{banner.title}</h2><p>{banner.subtitle}</p>{banner.linkUrl && <Link href={banner.linkUrl}>View collection <ArrowRight /></Link>}</div>
          <Image src={safeImage(banner.imageUrl, mode === "grocery" ? "/products/apples.svg" : "/products/chicken-biryani.svg")} alt="" width={300} height={220} />
          {catalog && catalog.banners.length > 1 && <div className="carousel-dots">{catalog.banners.map((item, index) => <button type="button" aria-label={`Show banner ${index + 1}`} className={index === bannerIndex ? "active" : ""} onClick={() => setBannerIndex(index)} key={item.id} />)}</div>}
        </section>}

        <section className="content-container content-section" id="categories">
          <div className="section-title"><div><span>CURATED FOR QUICK CHOICES</span><h2>Shop by category</h2></div><button type="button" onClick={() => setCategory("")}>View all</button></div>
          {loading && !catalog ? <div className="category-skeleton-row">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div> :
          <div className="category-row">{catalog?.categories.map((item, index) => <button type="button" className={category === item.slug ? "active" : ""} onClick={() => setCategory(category === item.slug ? "" : item.slug)} key={item.id}>
            <span><Image src={safeImage(item.imageUrl, fallbackCategoryImages[mode][index % fallbackCategoryImages[mode].length])} alt="" width={120} height={110} /></span><strong>{item.name}</strong>
          </button>)}</div>}
        </section>

        <section className="content-container content-section store-section">
          <div className="section-title"><div><span>TRUSTED NEARBY</span><h2>{mode === "food" ? "Restaurants around you" : "Stores packing today"}</h2></div></div>
          <div className="store-row">{catalog?.stores.map((item) => <article key={item.id}>
            <Image src={safeImage(item.imageUrl, mode === "food" ? "/products/chicken-biryani.svg" : "/products/apples.svg")} alt="" width={140} height={110} />
            <div><span className={item.isOpen ? "open" : "closed"}>{item.isOpen ? "Open" : "Closed"}</span><h3>{item.name}</h3><p>{item.description}</p><small><Star /> {item.rating.toFixed(1)} <Clock3 /> {item.averagePrepMins} min</small></div>
          </article>)}</div>
        </section>

        <section className="content-container content-section" id="products">
          <div className="section-title product-section-title"><div><span>{search ? "SEARCH RESULTS" : "POPULAR RIGHT NOW"}</span><h2>{search ? `Matches for “${search}”` : mode === "food" ? "Meals people reorder" : "Useful picks for today"}</h2></div>
            <div className="filter-pills"><button type="button" className={diet === "all" ? "active" : ""} onClick={() => setDiet("all")}>All</button><button type="button" className={diet === "veg" ? "active" : ""} onClick={() => setDiet("veg")}>Veg</button>{mode === "food" && <button type="button" className={diet === "nonveg" ? "active" : ""} onClick={() => setDiet("nonveg")}>Non-Veg</button>}</div>
          </div>
          {error && <div className="inline-error"><PackageOpen /><div><strong>Catalog is taking longer than expected</strong><p>{error}</p></div><button type="button" onClick={() => void loadCatalog()}>Retry</button></div>}
          {loading ? <div className="product-grid">{Array.from({ length: 8 }, (_, index) => <div className="product-skeleton" key={index}><i /><b /><span /><button /></div>)}</div> : catalog?.products.length ? <div className="product-grid">{catalog.products.map((product) => {
            const variant = product.variants[0];
            const discount = variant && variant.mrpPaise > variant.salePricePaise ? Math.round((variant.mrpPaise - variant.salePricePaise) * 100 / variant.mrpPaise) : 0;
            const unavailable = !product.store.isOpen || !variant?.isAvailable || variant.stock < 1;
            return <article className="product-card" key={product.id}>
              <Link className="product-image" href={`/products/${product.id}`}><Image src={safeImage(product.imageUrl, mode === "food" ? "/products/fried-rice.svg" : "/products/chips.svg")} alt={product.name} width={280} height={230} />{discount > 0 && <span>{discount}% OFF</span>}</Link>
              <div className="product-card-content"><small className="product-store"><Store /> {product.store.name}</small><Link href={`/products/${product.id}`}><h3>{product.name}</h3></Link><p>{variant?.unit ?? "Unavailable"}</p>
                <div className="product-price"><span><strong>{variant ? formatMoney(variant.salePricePaise) : "—"}</strong>{discount > 0 && <del>{formatMoney(variant.mrpPaise)}</del>}</span><button type="button" disabled={unavailable} onClick={() => void addToCart(product)}>{unavailable ? "Unavailable" : "ADD"}</button></div>
                <button className="buy-now" type="button" disabled={unavailable} onClick={() => void addToCart(product, true)}>Buy now</button>
              </div>
            </article>;
          })}</div> : !error && <div className="empty-state"><Search /><h3>No matching products</h3><p>Try a broader search or clear the current filters.</p><button type="button" onClick={() => { setSearch(""); setCategory(""); setDiet("all"); }}>Clear filters</button></div>}
        </section>

        <section className="support-strip content-container"><div><ShieldCheck /><span><strong>Help when you need it</strong><small>Order support, cancellations and payment questions in one place.</small></span></div><Link href="/support">Customer support <ArrowRight /></Link></section>
      </main>

      {Boolean(cart?.itemCount) && !cartOpen && <button className="sticky-cart-summary" type="button" onClick={() => setCartOpen(true)}><span><ShoppingBag /><b>{cart?.itemCount} items</b><small>{formatMoney(cart?.subtotalPaise ?? 0)}</small></span><strong>View cart <ArrowRight /></strong></button>}

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <Link className="active" href="/"><Home /><span>Home</span></Link>
        <button type="button" onClick={() => document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" })}><Grid2X2 /><span>Categories</span></button>
        <button type="button" onClick={() => void loadCart(true)}><ShoppingBag /><span>Cart</span>{Boolean(cart?.itemCount) && <b>{cart?.itemCount}</b>}</button>
        <Link href="/orders"><ReceiptText /><span>Orders</span></Link>
        <Link href="/profile"><UserRound /><span>Profile</span></Link>
      </nav>

      {cartOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
        <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping cart"><header><div><span>YOUR CART</span><h2>{cart?.store?.name ?? "Cart"}</h2></div><button type="button" aria-label="Close cart" onClick={() => setCartOpen(false)}><X /></button></header>
          {!cart?.items.length ? <div className="empty-cart"><ShoppingBag /><h3>Your cart is ready for something good</h3><p>Add products from one store to begin checkout.</p><button type="button" onClick={() => setCartOpen(false)}>Continue shopping</button></div> : <>
            <div className="cart-items">{cart.items.map((item) => <article key={item.id}><Image src={safeImage(item.product.imageUrl, "/icon.svg")} alt="" width={72} height={72} /><div><strong>{item.product.name}</strong><small>{item.variant.name}</small><b>{formatMoney(item.lineTotalPaise)}</b></div><div className="quantity-control"><button type="button" aria-label="Decrease quantity" onClick={() => void updateCartItem(item.id, item.quantity - 1)}><Minus /></button><span>{item.quantity}</span><button type="button" aria-label="Increase quantity" disabled={item.quantity >= item.variant.stock} onClick={() => void updateCartItem(item.id, item.quantity + 1)}><Plus /></button></div></article>)}</div>
            <button className="clear-cart" type="button" onClick={() => void clearCart()}><Trash2 /> Clear cart</button>
            <div className="cart-total"><span><small>Subtotal</small><strong>{formatMoney(cart.subtotalPaise)}</strong></span><p>Delivery charge and coupon discount are calculated at checkout.</p><Link href="/checkout">Continue to checkout <ArrowRight /></Link></div>
          </>}
        </aside>
      </div>}

      {locationOpen && <div className="modal-backdrop"><div className="location-modal" role="dialog" aria-modal="true" aria-labelledby="location-title"><button className="modal-close" type="button" aria-label="Close" onClick={() => setLocationOpen(false)}><X /></button><MapPin /><span>DELIVERY LOCATION</span><h2 id="location-title">Check your pincode</h2><p>We will show accurate delivery charges and availability at checkout.</p><form onSubmit={checkPincode}><label htmlFor="pincode">Six-digit pincode</label><input id="pincode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, ""))} required /><button type="submit">Check availability</button></form></div></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

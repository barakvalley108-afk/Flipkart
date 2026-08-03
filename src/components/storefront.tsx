"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { categories, products, type CatalogProduct, type StoreMode } from "@/lib/catalog";
import {
  CartIcon,
  ChevronDownIcon,
  ClockIcon,
  GridIcon,
  HomeIcon,
  LocationIcon,
  MinusIcon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  UserIcon
} from "@/components/icon";

type CartState = Record<string, number>;

const STORAGE_KEY = "quickcart-demo-cart";

export function Storefront() {
  const [mode, setMode] = useState<StoreMode>("grocery");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartState>({});
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCart(JSON.parse(stored) as CartState);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesMode = product.mode === mode;
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.store.toLowerCase().includes(term);
      return matchesMode && matchesSearch;
    });
  }, [mode, search]);

  const cartItems = Object.entries(cart)
    .map(([id, quantity]) => ({
      product: products.find((item) => item.id === id),
      quantity
    }))
    .filter(
      (item): item is { product: CatalogProduct; quantity: number } =>
        Boolean(item.product) && item.quantity > 0
    );

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  function changeQuantity(productId: string, change: number) {
    setCart((current) => {
      const nextQuantity = Math.max(0, (current[productId] ?? 0) + change);
      const next = { ...current };
      if (nextQuantity === 0) delete next[productId];
      else next[productId] = nextQuantity;
      return next;
    });
  }

  return (
    <div className="storefront-shell">
      <header className="top-header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="QuickCart home">
            <span className="brand-mark">Q</span>
            <span>
              <strong>QuickCart</strong>
              <small>Food & Grocery</small>
            </span>
          </a>

          <button className="location-button" type="button">
            <span className="location-icon-wrap">
              <LocationIcon />
            </span>
            <span>
              <small>Delivery in 12 minutes</small>
              <strong>Lala Bazar, Assam</strong>
            </span>
            <ChevronDownIcon className="chevron" />
          </button>

          <label className="desktop-search">
            <SearchIcon />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search "biryani", "milk" or "snacks"'
            />
          </label>

          <a className="panel-link" href="/panel-login">
            Partner Login
          </a>

          <button
            className="header-cart"
            type="button"
            onClick={() => setCartOpen(true)}
          >
            <CartIcon />
            <span>Cart</span>
            {itemCount > 0 && <b>{itemCount}</b>}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="mobile-location">
          <button className="location-button" type="button">
            <span className="location-icon-wrap">
              <LocationIcon />
            </span>
            <span>
              <small>Delivery in 12 minutes</small>
              <strong>Lala Bazar, Assam</strong>
            </span>
            <ChevronDownIcon className="chevron" />
          </button>
          <label className="mobile-search">
            <SearchIcon />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search food and groceries"
            />
          </label>
        </section>

        <section className="hero-section content-width">
          <div className="hero-copy">
            <span className="eyebrow">FAST • FRESH • LOCAL</span>
            <h1>
              Daily essentials and favourite meals,
              <span> delivered together.</span>
            </h1>
            <p>
              Discover trusted nearby restaurants and grocery stores in one
              clean, fast delivery experience.
            </p>
            <div className="hero-actions">
              <button type="button" onClick={() => setMode("grocery")}>
                Shop groceries
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setMode("food")}
              >
                Order food
              </button>
            </div>
            <div className="trust-strip">
              <span>✓ Live order updates</span>
              <span>✓ Secure checkout</span>
              <span>✓ Local support</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="Food and grocery illustration">
            <div className="delivery-ring" />
            <div className="hero-card hero-card-food">
              <Image
                src="/products/chicken-biryani.svg"
                alt=""
                width={160}
                height={160}
              />
              <strong>Hot meals</strong>
              <span>From nearby kitchens</span>
            </div>
            <div className="hero-card hero-card-grocery">
              <Image
                src="/products/apples.svg"
                alt=""
                width={150}
                height={150}
              />
              <strong>Fresh grocery</strong>
              <span>Picked with care</span>
            </div>
            <div className="eta-pill">
              <ClockIcon />
              <span>
                <strong>12 min</strong>
                average grocery delivery
              </span>
            </div>
          </div>
        </section>

        <section className="mode-section content-width">
          <div className="mode-tabs" role="tablist" aria-label="Shopping mode">
            <button
              type="button"
              className={mode === "grocery" ? "active" : ""}
              onClick={() => setMode("grocery")}
            >
              <span>🛒</span>
              Grocery
              <small>Everyday essentials</small>
            </button>
            <button
              type="button"
              className={mode === "food" ? "active" : ""}
              onClick={() => setMode("food")}
            >
              <span>🍽️</span>
              Food
              <small>Restaurants near you</small>
            </button>
          </div>
        </section>

        <section className="content-section content-width">
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                {mode === "grocery" ? "SHOP BY CATEGORY" : "WHAT ARE YOU CRAVING?"}
              </span>
              <h2>
                {mode === "grocery"
                  ? "Everything your home needs"
                  : "Your favourite food, nearby"}
              </h2>
            </div>
            <button type="button">View all</button>
          </div>

          <div className="category-grid">
            {categories[mode].map((category) => (
              <button className="category-card" type="button" key={category.name}>
                <span className="category-image">
                  <Image
                    src={category.image}
                    alt=""
                    width={120}
                    height={120}
                  />
                </span>
                <strong>{category.name}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="offer-banner content-width">
          <div>
            <span className="offer-label">WELCOME OFFER</span>
            <h2>Save 20% on your first order</h2>
            <p>Use code <strong>WELCOME20</strong> at checkout.</p>
          </div>
          <button type="button">Explore offers</button>
        </section>

        <section className="content-section content-width products-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                {mode === "grocery" ? "POPULAR NEAR YOU" : "BESTSELLING DISHES"}
              </span>
              <h2>
                {search
                  ? `Results for “${search}”`
                  : mode === "grocery"
                    ? "Fast picks for today"
                    : "Loved by local customers"}
              </h2>
            </div>
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image">
                  {product.badge && <span className="product-badge">{product.badge}</span>}
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={260}
                    height={210}
                  />
                </div>
                <div className="product-content">
                  <div className="product-meta">
                    <span className="rating">
                      <StarIcon />
                      {product.rating}
                    </span>
                    <span>{product.eta}</span>
                  </div>
                  <h3>{product.name}</h3>
                  <p>{product.store}</p>
                  <div className="unit-row">{product.unit}</div>
                  <div className="price-row">
                    <span>
                      <strong>₹{product.price}</strong>
                      {product.mrp && <del>₹{product.mrp}</del>}
                    </span>
                    {(cart[product.id] ?? 0) === 0 ? (
                      <button
                        type="button"
                        onClick={() => changeQuantity(product.id, 1)}
                      >
                        ADD
                      </button>
                    ) : (
                      <div className="quantity-control">
                        <button
                          type="button"
                          aria-label={`Remove one ${product.name}`}
                          onClick={() => changeQuantity(product.id, -1)}
                        >
                          <MinusIcon />
                        </button>
                        <strong>{cart[product.id]}</strong>
                        <button
                          type="button"
                          aria-label={`Add one ${product.name}`}
                          onClick={() => changeQuantity(product.id, 1)}
                        >
                          <PlusIcon />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {visibleProducts.length === 0 && (
            <div className="empty-state">
              <SearchIcon />
              <h3>No matching items found</h3>
              <p>Try a product, dish or store name.</p>
            </div>
          )}
        </section>

        <section className="promise-section">
          <div className="content-width promise-grid">
            <article>
              <span>01</span>
              <h3>Local selection</h3>
              <p>Restaurants and grocery partners managed from private panels.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Clear tracking</h3>
              <p>Customers see every step from acceptance to delivery.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Built to scale</h3>
              <p>Food and grocery operations remain separate but work together.</p>
            </article>
          </div>
        </section>
      </main>

      <footer>
        <div className="content-width footer-inner">
          <a className="brand footer-brand" href="#top">
            <span className="brand-mark">Q</span>
            <span>
              <strong>QuickCart</strong>
              <small>Food & Grocery</small>
            </span>
          </a>
          <p>Professional starter platform for local quick commerce.</p>
          <a href="/panel-login">Private panel login</a>
        </div>
      </footer>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <a className="active" href="#top">
          <HomeIcon />
          <span>Home</span>
        </a>
        <a href="#categories">
          <GridIcon />
          <span>Categories</span>
        </a>
        <button type="button" onClick={() => setCartOpen(true)}>
          <span className="cart-nav-icon">
            <CartIcon />
            {itemCount > 0 && <b>{itemCount}</b>}
          </span>
          <span>Cart</span>
        </button>
        <a href="#orders">
          <PackageIcon />
          <span>Orders</span>
        </a>
        <a href="/panel-login">
          <UserIcon />
          <span>Account</span>
        </a>
      </nav>

      {cartOpen && (
        <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
          <aside
            className="cart-drawer"
            aria-label="Shopping cart"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <span>Your cart</span>
                <h2>{itemCount} item{itemCount === 1 ? "" : "s"}</h2>
              </div>
              <button type="button" onClick={() => setCartOpen(false)}>
                ×
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="drawer-empty">
                <CartIcon />
                <h3>Your cart is empty</h3>
                <p>Add food or groceries to continue.</p>
              </div>
            ) : (
              <>
                <div className="drawer-items">
                  {cartItems.map(({ product, quantity }) => (
                    <article key={product.id}>
                      <Image
                        src={product.image}
                        alt=""
                        width={70}
                        height={70}
                      />
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.unit}</span>
                        <b>₹{product.price * quantity}</b>
                      </div>
                      <div className="quantity-control compact">
                        <button
                          type="button"
                          onClick={() => changeQuantity(product.id, -1)}
                        >
                          <MinusIcon />
                        </button>
                        <strong>{quantity}</strong>
                        <button
                          type="button"
                          onClick={() => changeQuantity(product.id, 1)}
                        >
                          <PlusIcon />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="bill-card">
                  <div><span>Subtotal</span><strong>₹{subtotal}</strong></div>
                  <div><span>Delivery fee</span><strong>₹20</strong></div>
                  <div className="bill-total">
                    <span>Total</span><strong>₹{subtotal + 20}</strong>
                  </div>
                </div>

                <button className="checkout-button" type="button">
                  Continue to checkout
                  <span>₹{subtotal + 20}</span>
                </button>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { ReceiptText, ShoppingBag, UserRound } from "lucide-react";
import { brand } from "@/config/brand";

export function CustomerTopbar() {
  return (
    <header className="customer-header">
      <div className="customer-header-inner page-topbar-inner">
        <Link className="brand-lockup" href="/">
          <span className="brand-symbol">{brand.logoText}</span>
          <span><strong>{brand.name}</strong><small>FOOD + GROCERY</small></span>
        </Link>
        <nav className="page-topbar-nav">
          <Link href="/"><ShoppingBag /> Shop</Link>
          <Link href="/orders"><ReceiptText /> Orders</Link>
          <Link href="/profile"><UserRound /> Profile</Link>
          <form action="/api/auth/logout" method="post"><button type="submit">Logout</button></form>
        </nav>
      </div>
    </header>
  );
}

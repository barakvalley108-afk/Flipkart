import type { ReactNode } from "react";
import { LogoutIcon } from "@/components/icon";
import type { PanelRole } from "@/lib/types";

type NavItem = { label: string; href: string };

const panelMeta: Record<
  PanelRole,
  { title: string; eyebrow: string; nav: NavItem[] }
> = {
  SUPER_ADMIN: {
    title: "Super Admin",
    eyebrow: "CONTROL CENTER",
    nav: [
      { label: "Overview", href: "/admin" },
      { label: "Orders", href: "/admin/orders" },
      { label: "Partners", href: "/admin/partners" },
      { label: "Catalog", href: "/admin/catalog" },
      { label: "Reports", href: "/admin/reports" }
    ]
  },
  RESTAURANT: {
    title: "Restaurant Panel",
    eyebrow: "FOOD OPERATIONS",
    nav: [
      { label: "Overview", href: "/restaurant" },
      { label: "Orders", href: "/restaurant/orders" },
      { label: "Menu", href: "/restaurant/menu" },
      { label: "Reports", href: "/restaurant/reports" }
    ]
  },
  GROCERY: {
    title: "Grocery Panel",
    eyebrow: "STORE OPERATIONS",
    nav: [
      { label: "Overview", href: "/grocery" },
      { label: "Orders", href: "/grocery/orders" },
      { label: "Inventory", href: "/grocery/inventory" },
      { label: "Reports", href: "/grocery/reports" }
    ]
  },
  DELIVERY: {
    title: "Delivery Panel",
    eyebrow: "RIDER WORKSPACE",
    nav: [
      { label: "Available", href: "/delivery" },
      { label: "Active order", href: "/delivery/active" },
      { label: "Earnings", href: "/delivery/earnings" },
      { label: "Profile", href: "/delivery/profile" }
    ]
  }
};

export function PanelShell({
  role,
  email,
  children
}: {
  role: PanelRole;
  email: string;
  children: ReactNode;
}) {
  const meta = panelMeta[role];

  return (
    <div className="panel-shell">
      <aside className="panel-sidebar">
        <a className="brand light-brand" href="/">
          <span className="brand-mark">Q</span>
          <span>
            <strong>QuickCart</strong>
            <small>Operations Suite</small>
          </span>
        </a>
        <div className="panel-role">
          <span>{meta.eyebrow}</span>
          <strong>{meta.title}</strong>
        </div>
        <nav>
          {meta.nav.map((item, index) => (
            <a className={index === 0 ? "active" : ""} href={item.href} key={item.href}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-account">
          <span>Signed in as</span>
          <strong>{email}</strong>
          <form action="/api/auth/logout" method="post">
            <button type="submit">
              <LogoutIcon />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="panel-main">
        <header className="panel-header">
          <div>
            <span>{meta.eyebrow}</span>
            <h1>{meta.title}</h1>
          </div>
          <div className="panel-status">
            <i />
            System operational
          </div>
        </header>
        <main className="panel-content">{children}</main>
      </div>
    </div>
  );
}

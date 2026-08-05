import type { ReactNode } from "react";
import Link from "next/link";
import { BarChart3, Boxes, ClipboardList, House, LogOut, Settings, Users } from "lucide-react";
import { brand } from "@/config/brand";
import type { PanelRole } from "@/lib/types";

const panelMeta: Record<PanelRole, { title: string; eyebrow: string; sections: Array<{ label: string; href: string; icon: typeof House }> }> = {
  SUPER_ADMIN: { title: "Super Admin", eyebrow: "CONTROL CENTER", sections: [
    { label: "Overview", href: "#overview", icon: House }, { label: "Orders", href: "#orders", icon: ClipboardList }, { label: "Partners", href: "#partners", icon: Users }, { label: "Catalog", href: "#catalog", icon: Boxes }, { label: "Operations", href: "#operations", icon: Settings }, { label: "Reports", href: "#reports", icon: BarChart3 }
  ] },
  RESTAURANT: { title: "Restaurant Panel", eyebrow: "FOOD OPERATIONS", sections: [
    { label: "Overview", href: "#overview", icon: House }, { label: "Orders", href: "#orders", icon: ClipboardList }, { label: "Menu", href: "#catalog", icon: Boxes }, { label: "Reports", href: "#reports", icon: BarChart3 }
  ] },
  GROCERY: { title: "Grocery Panel", eyebrow: "STORE OPERATIONS", sections: [
    { label: "Overview", href: "#overview", icon: House }, { label: "Orders", href: "#orders", icon: ClipboardList }, { label: "Inventory", href: "#catalog", icon: Boxes }, { label: "Reports", href: "#reports", icon: BarChart3 }
  ] },
  DELIVERY: { title: "Delivery Rider", eyebrow: "RIDER WORKSPACE", sections: [
    { label: "Overview", href: "#overview", icon: House }, { label: "Assigned orders", href: "#orders", icon: ClipboardList }, { label: "Earnings", href: "#reports", icon: BarChart3 }
  ] }
};

export function PanelShell({ role, email, children }: { role: PanelRole; email?: string; children: ReactNode }) {
  const meta = panelMeta[role];
  return <div className="ops-shell"><aside className="ops-sidebar"><Link className="ops-brand" href="/"><span>{brand.logoText}</span><div><strong>{brand.name}</strong><small>OPERATIONS SUITE</small></div></Link><div className="ops-role"><span>{meta.eyebrow}</span><strong>{meta.title}</strong></div><nav>{meta.sections.map((item) => { const Icon = item.icon; return <a href={item.href} key={item.href}><Icon /> {item.label}</a>; })}</nav><div className="ops-account"><span>Signed in as</span><strong>{email ?? "Panel user"}</strong><form action="/api/auth/logout" method="post"><button type="submit"><LogOut /> Sign out</button></form></div></aside><div className="ops-main"><header className="ops-header"><div><span>{meta.eyebrow}</span><h1>{meta.title}</h1></div><div className="system-pill"><i /> System online</div></header><main className="ops-content">{children}</main></div></div>;
}

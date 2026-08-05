import type { Metadata, Viewport } from "next";
import "./globals.css";
import { brand } from "@/config/brand";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — Food & Grocery`,
    template: `%s | ${brand.name}`
  },
  description:
    brand.description,
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: brand.colors.primaryDark,
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<PwaRegister /></body>
    </html>
  );
}

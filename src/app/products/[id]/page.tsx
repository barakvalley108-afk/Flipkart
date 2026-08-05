import { CustomerTopbar } from "@/components/customer-topbar";
import { ProductDetailClient } from "@/components/product-detail-client";

export const metadata = { title: "Product Details" };
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <><CustomerTopbar /><ProductDetailClient productId={id} /></>; }

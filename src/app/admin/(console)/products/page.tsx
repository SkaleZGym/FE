import type { Metadata } from "next";
import ProductList from "./ProductList";

export const metadata: Metadata = { title: "상품 관리" };

export default function AdminProductsPage() {
  return <ProductList />;
}

import type { Metadata } from "next";
import ProductEditor from "./ProductEditor";

export const metadata: Metadata = { title: "상품 편집" };

/** /admin/products/edit (새 상품) · /admin/products/edit?id=12 (수정) */
export default function AdminProductEditPage() {
  return <ProductEditor />;
}

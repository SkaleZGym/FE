import type { Metadata } from "next";
import ProductEditor from "./ProductEditor";

export const metadata: Metadata = { title: "상품 편집" };

// 관리자 화면은 로그인 확인 뒤에 브라우저에서 그려서 미리 그린 화면(즉시 이동) 검증에서 뺀다
export const instant = false;

/** /admin/products/edit (새 상품) · /admin/products/edit?id=12 (수정) */
export default function AdminProductEditPage() {
  return <ProductEditor />;
}

import type { Metadata } from "next";
import SaleManager from "./SaleManager";

export const metadata: Metadata = { title: "세일 관리" };

// 관리자 화면은 로그인 확인 뒤에 브라우저에서 그려서 미리 그린 화면(즉시 이동) 검증에서 뺀다
export const instant = false;

export default function AdminSalesPage() {
  return <SaleManager />;
}

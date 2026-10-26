import type { Metadata } from "next";
import OrderManager from "./OrderManager";

export const metadata: Metadata = { title: "주문 관리" };

// 관리자 화면은 로그인 확인 뒤에 브라우저에서 그려서 미리 그린 화면(즉시 이동) 검증에서 뺀다
export const instant = false;

/** ?status=PAID 로 목록을, ?open=주문번호 로 상세를 바로 열 수 있다 (대시보드에서 넘어올 때) */
export default function AdminOrdersPage() {
  return <OrderManager />;
}

import type { Metadata } from "next";
import OrderManager from "./OrderManager";

export const metadata: Metadata = { title: "주문 관리" };

/** ?status=PAID 로 목록을, ?open=주문번호 로 상세를 바로 열 수 있다 (대시보드에서 넘어올 때) */
export default function AdminOrdersPage() {
  return <OrderManager />;
}

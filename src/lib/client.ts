// 브라우저에서 BE를 부르는 도우미. 항상 같은 주소의 BFF(/api/...)를 거친다.
import { formatMoney, type Currency } from "@/data/catalog";
import type { Locale } from "@/i18n/config";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

type Options = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; locale: Locale };

/** BE 오류는 BE가 언어에 맞게 만든 message 를 그대로 담아 ApiError 로 던진다 */
export async function api<T = void>(path: string, { method = "GET", body, locale }: Options): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: { "Accept-Language": locale, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.code, data?.message ?? "");
  return data as T;
}

/** BE 금액(최소 단위: 원·센트)을 화면 표시용으로 */
export function money(amount: number, currency: string, locale: Locale) {
  const code = (currency === "USD" ? "USD" : "KRW") as Currency;
  return formatMoney(code === "USD" ? amount / 100 : amount, code, locale);
}

/** 로그인 페이지로 보내면서 다 끝나면 돌아올 주소를 붙인다 */
export const loginHref = (locale: Locale, next?: string) =>
  `/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;

// ---------- BE 응답 모양 ----------

export type Me = { id: number; email: string; name: string; role: string; language: string };

export type BeProduct = {
  id: number;
  sku: string;
  name: string;
  imageUrl: string | null;
  price: number;
  listPrice: number | null;
  currency: string;
  soldOut: boolean;
  variants: { id: number; size: string; stock: number }[];
};

export type Cart = {
  items: {
    cartItemId: number;
    productId: number;
    variantId: number;
    name: string;
    size: string;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    stock: number;
  }[];
  currency: string;
  itemsAmount: number;
  shippingFee: number;
  totalAmount: number;
};

export type Order = {
  orderNumber: string;
  status: "PENDING_PAYMENT" | "PAID" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  currency: string;
  itemsAmount: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  couponCode: string | null;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: { productId: number; productName: string; size: string; unitPrice: number; quantity: number; lineTotal: number }[];
  createdAt: string;
};

export type Inquiry = {
  id: number;
  category: "PRODUCT" | "ORDER" | "DELIVERY" | "EXCHANGE_RETURN" | "ETC";
  title: string;
  content: string;
  orderNumber: string | null;
  status: "WAITING" | "ANSWERED";
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
};

export type CouponPreview = {
  code: string;
  name: string;
  currency: string;
  itemsAmount: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
};

/** FE 임시 카탈로그 상품 번호 ↔ BE 상품 코드 (BE 상품을 SKZ-{번호}로 등록한다) */
export const skuOf = (feId: number) => `SKZ-${feId}`;
export const feIdOf = (sku: string) => Number(sku.replace(/^SKZ-/, "")) || null;

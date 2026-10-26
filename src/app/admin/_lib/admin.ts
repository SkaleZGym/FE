// 관리자 화면 공통: BE 관리자 API(/api/admin → BFF) 호출, 응답 모양, 표시 도우미
import { ApiError } from "@/lib/client";

export { ApiError };

type Options = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown };

/** 관리자 로그인이 풀렸으면(401) 로그인 화면으로 보냈다가 지금 화면으로 돌아온다 */
export function toLogin() {
  const next = window.location.pathname + window.location.search;
  window.location.replace(`/admin/login?next=${encodeURIComponent(next)}`);
}

export async function adminApi<T = void>(path: string, { method = "GET", body }: Options = {}): Promise<T> {
  const response = await fetch(`/api/admin${path}`, {
    method,
    headers: { "Accept-Language": "ko", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (response.status === 401) {
    toLogin();
    throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요해요.");
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = response.status === 502 ? "서버에 연결할 수 없어요." : data?.message || "요청을 처리하지 못했어요.";
    throw new ApiError(response.status, data?.code, message);
  }
  return data as T;
}

/** 이미지 한 장 올리기 → 저장된 주소. JPG·PNG·WEBP·GIF, 10MB 이하 (서버가 파일 내용으로 다시 확인) */
export async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/admin/uploads", { method: "POST", body, headers: { "Accept-Language": "ko" } });
  if (response.status === 401) {
    toLogin();
    throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요해요.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.code, data?.message || "사진을 올리지 못했어요. 10MB 이하 JPG·PNG·WEBP·GIF 인지 확인해 주세요.");
  return data.url as string;
}

export const errorMessage = (error: unknown) => (error instanceof Error && error.message ? error.message : "요청을 처리하지 못했어요.");

/** 화면 아래 알림. 어느 화면에서든 부르면 관리자 틀(AdminShell)이 띄운다 */
export const TOAST_EVENT = "skz-admin-toast";
export function toast(message: string, error = false) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, error } }));
}

// ---------- 표시 ----------

/** BE 금액(최소 단위: 원·센트) → 화면 */
export function money(amount: number, currency: string) {
  return currency === "USD"
    ? `$${(amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₩${amount.toLocaleString("ko-KR")}`;
}

export const dateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "-";

export const dateOnly = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "-";

export const LANGS = [
  ["ko", "한국어"],
  ["en", "English"],
  ["ja", "日本語"],
  ["zh-CN", "中文"],
] as const;
export type Lang = (typeof LANGS)[number][0];

// ---------- BE 응답 모양 ----------

export type Page<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number };

export type Dashboard = {
  today: { orders: number; salesKrw: number; salesUsd: number; newMembers: number };
  salesByDay: { date: string; salesKrw: number; salesUsd: number; orders: number }[];
  ordersToShip: number;
  waitingInquiries: number;
  newReviews: number;
  memberCount: number;
  recentOrders: { orderNumber: string; status: OrderStatus; currency: string; totalAmount: number; itemCount: number; createdAt: string }[];
  lowStock: { productId: number; sku: string; productName: string; imageUrl: string | null; variantId: number; size: string; stock: number }[];
};

export type ProductStatus = "ON_SALE" | "HIDDEN";
export type BadgeCode = "NEW" | "SALE" | "BEST" | "HOT";
export const BADGES: BadgeCode[] = ["NEW", "SALE", "BEST", "HOT"];

export type AdminProduct = {
  id: number;
  sku: string;
  categoryCode: string;
  imageUrl: string | null;
  status: ProductStatus;
  translations: Partial<Record<Lang, { name: string; description: string | null }>>;
  prices: Partial<Record<"KRW" | "USD", { amount: number; listAmount: number | null }>>;
  variants: { id: number; size: string; stock: number }[];
  badges: BadgeCode[];
  createdAt: string;
};

export type Category = { id: number; code: string; parentCode: string | null; sortOrder: number; names: Partial<Record<Lang, string>> };

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  PENDING_PAYMENT: { label: "결제 대기", tone: "" },
  PAID: { label: "결제 완료", tone: "amber" },
  PREPARING: { label: "상품 준비", tone: "violet" },
  SHIPPED: { label: "배송 중", tone: "blue" },
  DELIVERED: { label: "배송 완료", tone: "green" },
  CANCELLED: { label: "취소", tone: "red" },
};

export type AdminOrder = {
  orderNumber: string;
  memberId: number;
  status: OrderStatus;
  currency: string;
  itemsAmount: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  couponCode: string | null;
  paymentId: string | null;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippingAddress: { recipient: string; phone: string; countryCode: string; postalCode: string; address1: string; address2: string | null };
  items: { productId: number; variantId: number; productName: string; size: string; unitPrice: number; quantity: number; lineTotal: number }[];
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

export type AdminInquiry = {
  id: number;
  memberId: number;
  category: "PRODUCT" | "ORDER" | "DELIVERY" | "EXCHANGE_RETURN" | "ETC";
  title: string;
  content: string;
  productId: number | null;
  orderNumber: string | null;
  status: "WAITING" | "ANSWERED";
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
};
export const INQUIRY_CATEGORY: Record<AdminInquiry["category"], string> = {
  PRODUCT: "상품",
  ORDER: "주문·결제",
  DELIVERY: "배송",
  EXCHANGE_RETURN: "교환·반품",
  ETC: "기타",
};

export type AdminMember = {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  marketingConsent: boolean;
  /** IMWEB = 아임웹에서 옮겨 온 회원 */
  legacySource: string | null;
  /** false = 옮겨 온 뒤 아직 새 비밀번호를 정하지 않음 */
  passwordSet: boolean;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  language: string;
  createdAt: string;
};

export type ReviewStatus = "VISIBLE" | "HIDDEN";
export type AdminReview = {
  id: number;
  productId: number;
  productName: string | null;
  productImageUrl: string | null;
  memberId: number;
  memberEmail: string | null;
  orderNumber: string;
  rating: number;
  content: string;
  status: ReviewStatus;
  reply: string | null;
  createdAt: string;
  repliedAt: string | null;
};

/** 인트로 애니메이션은 FE 고정이고, 인트로가 끝나면 보이는 히어로 상품 슬라이드부터 관리한다 */
export type BannerPosition = "MAIN_HERO" | "MAIN_SUB" | "POPUP";
export const MANAGED_POSITIONS: { value: BannerPosition; label: string; help: string }[] = [
  { value: "MAIN_HERO", label: "메인 히어로", help: "첫 화면 상품 슬라이드 (작은 글자·상품명·가격). 켜진 것들이 순서대로 넘어가고, 하나도 없으면 기본 상품이 나와요" },
  { value: "MAIN_SUB", label: "메인 중간 배너", help: "메인 화면 카테고리 타일 아래의 큰 배너 (DON'T FOLLOW THE TREND 자리)" },
  { value: "POPUP", label: "팝업", help: "사이트에 들어오면 뜨는 팝업. 모든 페이지 / 메인에서만 고를 수 있어요" },
];
export type AdminBanner = {
  id: number;
  position: BannerPosition;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  target: "ALL_PAGES" | "MAIN_ONLY";
  sortOrder: number;
  active: boolean;
  visibleNow: boolean;
  startAt: string | null;
  endAt: string | null;
  /** subtext 는 큰 글자 위에 작게, price 는 아래에 */
  texts: Partial<Record<Lang, { headline: string | null; subtext: string | null; price: string | null }>>;
};

import { cacheLife } from "next/cache";
import type { Locale } from "@/i18n/config";

// SKALEZ BE(스프링) API를 서버 컴포넌트에서 부른다 (브라우저용은 lib/client.ts → BFF).
import { API_BASE } from "./backend";

/**
 * GET 요청 결과를 몇 분간 캐시한다 ('minutes': 1분마다 새로 받아 옴). 관리자에서 고친 내용은 늦어도 몇 분 안에 반영된다.
 * BE가 꺼져 있거나 오류면 null — 화면은 기본 문구로 그린다. 실패도 그 1분 동안만 남고 BE가 켜지면 곧 회복한다.
 * 캐시 함수 안에서 오류를 던지면 배포 빌드(미리 그리기)가 멈추므로 여기서 받아 null로 돌린다 (Vercel 빌드에는 BE가 없다)
 */
async function getJson<T>(path: string, locale: Locale): Promise<T | null> {
  "use cache";
  cacheLife("minutes");
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "Accept-Language": locale },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** 금액은 최소 단위 (KRW=원, USD=센트) */
export type ShippingPolicy = {
  currency: "KRW" | "USD";
  baseFee: number;
  freeThreshold: number | null;
  jejuExtraFee: number;
  islandExtraFee: number;
};

export type NoticeSummary = {
  id: number;
  category: "NOTICE" | "EVENT";
  pinned: boolean;
  title: string;
  viewCount: number;
  createdAt: string;
};

export type Faq = {
  id: number;
  category: string;
  question: string;
  answer: string;
};

type Page<T> = { content: T[]; totalElements: number };

export const getShippingPolicy = (locale: Locale) => getJson<ShippingPolicy>("/api/shipping/policy", locale);

export async function getLatestNotices(locale: Locale, size = 5): Promise<NoticeSummary[] | null> {
  const page = await getJson<Page<NoticeSummary>>(`/api/notices?size=${size}`, locale);
  return page && page.content;
}

export type Notice = NoticeSummary & { content: string };

export const getNotice = (locale: Locale, id: number) => getJson<Notice>(`/api/notices/${id}`, locale);

export const getFaqs = (locale: Locale) => getJson<Faq[]>("/api/faqs", locale);

/** 관리자 '배너·팝업'에서 켠 배너 (현재 언어 문구). MAIN_HERO = 첫 화면 히어로 상품 슬라이드 (인트로 애니메이션은 FE 고정) */
export type SiteBanner = {
  id: number;
  position: "MAIN_HERO" | "MAIN_SUB" | "POPUP";
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  target: "ALL_PAGES" | "MAIN_ONLY";
  headline: string | null;
  /** 큰 글자 위에 작게 */
  subtext: string | null;
  /** 가격 문구 (예: ₩69,000) */
  price: string | null;
};

/** BE 상품 (현재 언어의 이름·통화). 금액은 최소 단위 (KRW=원, USD=센트) */
export type ApiProduct = {
  id: number;
  sku: string;
  categoryCode: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  listPrice: number | null;
  currency: "KRW" | "USD";
  badges: ("NEW" | "SALE" | "BEST" | "HOT")[];
  soldOut: boolean;
  variants: { id: number; size: string; stock: number }[];
  fit: string | null;
  fabric: string | null;
  createdAt: string;
};

/** 판매 중인 상품 전체 (최신순). 쇼핑몰은 상품 수가 많지 않아 한 번에 받아서 화면에서 나눈다 */
export async function getProducts(locale: Locale): Promise<ApiProduct[] | null> {
  const page = await getJson<Page<ApiProduct>>("/api/products?size=500", locale);
  return page && page.content;
}

export const getBanners = (locale: Locale, position: "MAIN_HERO" | "MAIN_SUB" | "POPUP") =>
  getJson<SiteBanner[]>(`/api/banners?position=${position}`, locale);

/** 관리자 '사이트 문구'에서 바꾼 글자 (현재 언어, 없으면 한국어). 키 예: footer.tagline */
export const getSiteTexts = (locale: Locale) => getJson<Record<string, string>>("/api/site-texts", locale);

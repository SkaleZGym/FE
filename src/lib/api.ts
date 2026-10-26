import { cacheLife } from "next/cache";
import type { Locale } from "@/i18n/config";

// SKALEZ BE(스프링) API를 서버 컴포넌트에서 부른다 (브라우저용은 lib/client.ts → BFF).
import { API_BASE } from "./backend";

/**
 * GET 요청 결과를 몇 분간 캐시한다. 관리자에서 고친 내용은 늦어도 몇 분 안에 반영된다.
 * BE가 꺼져 있거나 오류면 null — 화면은 기본 문구로 그린다 (페이지가 깨지지 않게)
 */
async function getJson<T>(path: string, locale: Locale): Promise<T | null> {
  "use cache";
  cacheLife("minutes");
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "Accept-Language": locale },
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? ((await response.json()) as T) : null;
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

export const getBanners = (locale: Locale, position: "MAIN_HERO" | "MAIN_SUB" | "POPUP") =>
  getJson<SiteBanner[]>(`/api/banners?position=${position}`, locale);

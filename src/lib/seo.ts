// 검색엔진(SEO)·AI 검색(GEO)용 공통 값. 페이지별 대표 주소·언어 연결과 구조화 데이터(JSON-LD)를 만든다
import type { Metadata } from "next";
import { business } from "@/data/catalog";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { SITE_URL } from "./backend";

/** 정식 주소일 때만 검색에 노출한다. 시험 주소(new.skalez.com)·로컬은 통째로 막는다 (robots.ts, 레이아웃의 noindex) */
export const LIVE_HOSTS = ["skalez.com", "www.skalez.com"];
export const isLiveSite = LIVE_HOSTS.includes(new URL(SITE_URL).hostname);

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;

/**
 * 이 페이지의 대표 주소(canonical)와 4개 언어 주소(hreflang). path 는 언어 뒤 경로 ("" = 메인, "/shop/all").
 * 레이아웃에 한 번만 적으면 모든 하위 페이지가 메인 주소를 가리키게 되므로, 검색에 나갈 페이지마다 부른다
 */
export function pageAlternates(locale: Locale, path = ""): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((code) => [code, `/${code}${path}`])),
      "x-default": `/${defaultLocale}${path}`,
    },
  };
}

/** 회사 정보 (메인 화면에 한 번). 검색 결과의 회사 카드와 AI 답변의 출처 표기에 쓰인다 */
export function organizationLd(locale: Locale, description: string, logo: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: "SKALEZ",
    alternateName: ["스케일즈", business.company],
    url: absoluteUrl(`/${locale}`),
    logo,
    description,
    email: business.email,
    telephone: business.contact,
    address: { "@type": "PostalAddress", streetAddress: business.address, addressCountry: "KR" },
  };
}

/** 사이트 정보 + 사이트 안 검색 주소 */
export function websiteLd(locale: Locale, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name,
    url: absoluteUrl(`/${locale}`),
    inLanguage: locale,
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: absoluteUrl(`/${locale}/search?q={search_term_string}`) },
      "query-input": "required name=search_term_string",
    },
  };
}

/** 현재 위치 (메인 › 카테고리 › 상품). items 의 path 는 언어 뒤 경로 */
export function breadcrumbLd(locale: Locale, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(`/${locale}${item.path}`),
    })),
  };
}

type LdProduct = { id: number; sku: string; name: string; description: string | null; image: string; price: number; currency: string; soldOut: boolean };

/** 상품 한 개 (가격·재고·브랜드). 검색 결과에 가격이 붙고, AI 검색이 상품 정보를 정확히 인용한다 */
export function productLd(locale: Locale, product: LdProduct) {
  const url = absoluteUrl(`/${locale}/product/${product.id}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    image: [product.image.startsWith("/") ? absoluteUrl(product.image) : product.image],
    sku: product.sku,
    brand: { "@type": "Brand", name: "SKALEZ" },
    offers: {
      "@type": "Offer",
      url,
      price: product.price,
      priceCurrency: product.currency,
      availability: product.soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": absoluteUrl("/#organization") },
    },
  };
}

/** 상품 목록 (카테고리 페이지) */
export function itemListLd(locale: Locale, name: string, products: { id: number; name: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 50).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: absoluteUrl(`/${locale}/product/${product.id}`),
    })),
  };
}

/** 자주 묻는 질문. AI 검색이 질문·답을 그대로 가져다 쓰기 좋은 형식 */
export function faqLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

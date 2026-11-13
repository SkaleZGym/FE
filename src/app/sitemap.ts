import type { MetadataRoute } from "next";
import { categoryPages } from "@/data/catalog";
import { defaultLocale, locales } from "@/i18n/config";
import { getProducts } from "@/lib/api";
import { SITE_URL } from "@/lib/backend";

/** 검색엔진용 페이지 목록: 4개 언어 주소를 서로 묶어서 (hreflang) 알려 준다. 상품은 BE 에서 받은 판매 중 상품만 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entry = (path: string, lastModified?: string, priority = 0.5): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}/${defaultLocale}${path}`,
    lastModified,
    priority,
    alternates: { languages: Object.fromEntries(locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`])) },
  });

  const products = (await getProducts(defaultLocale)) ?? [];
  return [
    entry("", undefined, 1),
    ...categoryPages.map((category) => entry(`/shop/${category}`, undefined, 0.8)),
    ...products.map((product) => entry(`/product/${product.id}`, product.createdAt, 0.7)),
    ...["/notice", "/faq", "/guide", "/terms", "/privacy"].map((path) => entry(path, undefined, 0.3)),
  ];
}

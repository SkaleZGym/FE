import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import SearchView, { type SearchItem } from "@/components/SearchView";
import { locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getShopProducts, priceText } from "@/lib/shop";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.search.title} | ${dict.meta.title}`, robots: { index: false } };
}

/**
 * 상품 검색 (/ko/search?q=타이즈). 상품 목록은 카테고리 페이지와 같은 카탈로그를 쓰고,
 * 검색어는 브라우저에서 거른다 → 모든 언어의 상품명으로 찾을 수 있다 (한국어 화면에서 'tights'도 됨)
 */
export default async function SearchPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  // 모든 언어의 상품명으로 찾을 수 있게 언어별 목록(각각 캐시됨)에서 이름을 모은다
  const [products, ...others] = await Promise.all([getShopProducts(locale), ...locales.filter((other) => other !== locale).map(getShopProducts)]);
  const namesById = new Map<number, string[]>();
  for (const list of others) for (const product of list) namesById.set(product.id, [...(namesById.get(product.id) ?? []), product.name]);

  const items: SearchItem[] = products.map((product) => ({
    id: product.id,
    image: product.image,
    name: product.name,
    keywords: [product.name, ...(namesById.get(product.id) ?? [])].join(" ").toLowerCase(),
    soldOut: product.soldOut,
    best: product.badges.includes("BEST"),
    price: priceText(product, locale).price,
    listPrice: priceText(product, locale).listPrice ?? null,
  }));

  return (
    <PageShell title={dict.search.title}>
      <SearchView locale={locale} items={items} labels={{ ...dict.search, soldOut: dict.shelves.soldOut, sale: dict.shelves.sale }} />
    </PageShell>
  );
}

import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import SearchView, { type SearchItem } from "@/components/SearchView";
import { currencyFor, formatMoney, products } from "@/data/catalog";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

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
  const currency = currencyFor(locale);

  const items: SearchItem[] = products.map((product) => ({
    id: product.id,
    image: product.image,
    name: product.name[locale],
    keywords: Object.values(product.name).join(" ").toLowerCase(),
    soldOut: Boolean(product.soldOut),
    best: product.badges.includes("BEST"),
    price: formatMoney(product.price[currency], currency, locale),
    listPrice: product.listPrice ? formatMoney(product.listPrice[currency], currency, locale) : null,
  }));

  return (
    <PageShell title={dict.search.title}>
      <SearchView locale={locale} items={items} labels={{ ...dict.search, soldOut: dict.shelves.soldOut, sale: dict.shelves.sale }} />
    </PageShell>
  );
}

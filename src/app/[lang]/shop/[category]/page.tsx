import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryBrowser, { type BrowserItem } from "@/components/CategoryBrowser";
import ProductPanel, { type PanelProduct } from "@/components/ProductPanel";
import QuickMenu from "@/components/QuickMenu";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { siteNav } from "@/components/siteNav";
import {
  categoryPages,
  currencyFor,
  descriptions,
  fabricOf,
  fitOf,
  formatMoney,
  images,
  isCategoryPage,
  productsOf,
  sizeOrder,
  sizesOf,
} from "@/data/catalog";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import styles from "./page.module.css";

export function generateStaticParams() {
  return categoryPages.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/shop/[category]">): Promise<Metadata> {
  const { category } = await params;
  const dict = await getDictionary();
  if (!isCategoryPage(category)) return {};
  return { title: `${dict.category.pages[category].title} | ${dict.meta.title}` };
}

/** 카테고리 페이지: 가운데 제목 → 카테고리 이동 → 툴바(보기·정렬) → 왼쪽 필터 + 상품 그리드 */
export default async function CategoryPage({ params }: PageProps<"/[lang]/shop/[category]">) {
  const { category } = await params;
  if (!isCategoryPage(category)) notFound();

  const locale = await getLocale();
  const dict = await getDictionary();
  const currency = currencyFor(locale);
  const page = dict.category.pages[category];
  const products = productsOf(category);

  const items: BrowserItem[] = products.map((product) => ({
    id: product.id,
    image: product.image,
    name: product.name[locale],
    fit: dict.fit[fitOf(product)],
    sizes: sizesOf(product),
    soldOut: Boolean(product.soldOut),
    isNew: product.badges.includes("NEW"),
    isBest: product.badges.includes("BEST"),
    price: formatMoney(product.price[currency], currency, locale),
    listPrice: product.listPrice && formatMoney(product.listPrice[currency], currency, locale),
    priceValue: product.price[currency],
  }));
  const panelProducts: PanelProduct[] = products.map((product, index) => ({
    id: product.id,
    image: product.image,
    name: items[index].name,
    badges: product.badges,
    price: items[index].price,
    listPrice: items[index].listPrice,
    soldOut: items[index].soldOut,
    desc: descriptions[product.id]?.[locale],
    sizes: items[index].sizes,
    fit: items[index].fit,
    fabric: dict.fabric[fabricOf(product)],
  }));

  return (
    <>
      <SiteHeader
        locale={locale}
        logo={images.wordmark}
        nav={siteNav(locale, dict.nav)}
        labels={{ cart: dict.nav.cart, language: dict.nav.language, menu: dict.nav.menu, close: dict.nav.close }}
      />

      <main className={styles.main}>
        <header className={styles.head}>
          <h1>{page.title}</h1>
          <p>{page.sub}</p>
          <nav className={styles.categories} aria-label={dict.nav.shop}>
            {categoryPages.map((key) => (
              <a key={key} href={`/${locale}/shop/${key}`} aria-current={key === category ? "page" : undefined}>
                {dict.category.pages[key].title}
              </a>
            ))}
          </nav>
        </header>

        <CategoryBrowser
          items={items}
          sizeOrder={sizeOrder}
          labels={{
            ...dict.category,
            sale: dict.shelves.sale,
            soldOutTag: dict.shelves.soldOut,
            newTag: "NEW",
          }}
        />
      </main>

      <SiteFooter labels={dict.footer} />
      <QuickMenu labels={dict.quick} />
      <ProductPanel products={panelProducts} labels={dict.panel} />
    </>
  );
}

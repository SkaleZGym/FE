import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryBrowser, { type BrowserItem } from "@/components/CategoryBrowser";
import ProductPanel, { type PanelProduct } from "@/components/ProductPanel";
import QuickMenu from "@/components/QuickMenu";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { headerLabels, siteNav } from "@/components/siteNav";
import { categoryPages, images, isCategoryPage, sizeOrder } from "@/data/catalog";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getShopProducts, priceText, productsOfPage } from "@/lib/shop";
import styles from "./page.module.css";

// 상품 목록은 BE에서 받아 몇 분 캐시한다 (관리자 수정이 곧 반영되게). 요청 때 그린다
export const instant = false;

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
  const page = dict.category.pages[category];
  const products = productsOfPage(await getShopProducts(locale), category);

  const items: BrowserItem[] = products.map((product) => ({
    id: product.id,
    image: product.image,
    name: product.name,
    fit: dict.fit[product.fit],
    sizes: product.sizes,
    soldOut: product.soldOut,
    isNew: product.badges.includes("NEW"),
    isBest: product.badges.includes("BEST"),
    ...priceText(product, locale),
    priceValue: product.price,
  }));
  const panelProducts: PanelProduct[] = products.map((product, index) => ({
    id: product.id,
    sku: product.sku,
    image: product.image,
    name: items[index].name,
    badges: product.badges,
    price: items[index].price,
    listPrice: items[index].listPrice,
    soldOut: items[index].soldOut,
    desc: product.description ?? undefined,
    sizes: items[index].sizes,
    fit: items[index].fit,
    fabric: dict.fabric[product.fabric],
  }));

  return (
    <>
      <SiteHeader
        locale={locale}
        logo={images.wordmark}
        nav={siteNav(locale, dict.nav)}
        labels={headerLabels(dict.nav)}
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
          locale={locale}
          items={items}
          sizeOrder={sizeOrder}
          labels={{
            ...dict.category,
            sale: dict.shelves.sale,
            soldOutTag: dict.shelves.soldOut,
            pager: dict.pager,
            newTag: "NEW",
          }}
        />
      </main>

      <SiteFooter locale={locale} labels={dict.footer} />
      <QuickMenu locale={locale} labels={dict.quick} />
      <ProductPanel locale={locale} products={panelProducts} labels={dict.panel} />
    </>
  );
}

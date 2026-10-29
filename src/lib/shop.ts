// 쇼핑몰 화면(서버 컴포넌트)이 쓰는 상품 데이터. BE 상품 API를 화면 모양으로 바꾼다.
// 관리자에서 고친 가격·재고·품절·새 상품이 몇 분 안에 쇼핑몰에 반영된다 (lib/api.ts 캐시)
import { currencyFor, formatMoney, type Badge, type CategoryPage, type Currency, type Fabric, type Fit } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import { getProducts, type ApiProduct } from "./api";

export type ShopProduct = {
  id: number;
  sku: string;
  categoryCode: string;
  name: string;
  description: string | null;
  image: string;
  badges: Badge[];
  soldOut: boolean;
  currency: Currency;
  /** 화면 단위 금액 (원 · 달러) */
  price: number;
  listPrice: number | null;
  /** 판매 중인 사이즈 (재고 0인 사이즈도 보여 주고 품절 표시는 화면이 한다) */
  sizes: string[];
  fit: Fit;
  fabric: Fabric;
};

/** 사진이 없는 상품 (관리자가 사진을 아직 안 올린 경우) */
export const PLACEHOLDER_IMAGE = "/product-placeholder.svg";

/** 카테고리 페이지 주소 → BE 카테고리 코드. 관리자 '카테고리'의 코드와 같아야 한다 */
const PAGE_CATEGORIES: Partial<Record<CategoryPage, string[]>> = {
  tights: ["MEN_TIGHTS", "WOMEN_LEGGINGS"],
  tops: ["MEN_TOP"],
  hoodies: ["MEN_HOODIE"],
  goods: ["GOODS"],
};

const isTights = (code: string) => code.includes("TIGHTS") || code.includes("LEGGINGS");

/** 핏·소재를 관리자가 비워 두면 카테고리 기본값 (타이즈=컴프레션·나일론 스판, 굿즈=프리, 그 외=오버핏·코튼) */
const defaultFit = (code: string): Fit => (isTights(code) ? "compression" : code === "GOODS" ? "free" : "oversized");
const defaultFabric = (code: string): Fabric => (isTights(code) ? "nylonSpandex" : "cotton");

function toShop(product: ApiProduct): ShopProduct {
  const minor = (amount: number) => (product.currency === "USD" ? amount / 100 : amount);
  return {
    id: product.id,
    sku: product.sku,
    categoryCode: product.categoryCode,
    name: product.name,
    description: product.description,
    image: product.imageUrl || PLACEHOLDER_IMAGE,
    badges: product.badges,
    soldOut: product.soldOut,
    currency: product.currency,
    price: minor(product.price),
    listPrice: product.listPrice == null ? null : minor(product.listPrice),
    sizes: product.variants.map((variant) => variant.size),
    fit: (product.fit as Fit | null) ?? defaultFit(product.categoryCode),
    fabric: (product.fabric as Fabric | null) ?? defaultFabric(product.categoryCode),
  };
}

/** 판매 중인 상품 전체 (최신순). BE가 꺼져 있으면 빈 목록 */
export async function getShopProducts(locale: Locale): Promise<ShopProduct[]> {
  return ((await getProducts(locale)) ?? []).map(toShop);
}

export function productsOfPage(products: ShopProduct[], page: CategoryPage): ShopProduct[] {
  switch (page) {
    case "all":
      return products;
    case "new":
      return products.filter((product) => product.badges.includes("NEW"));
    case "best":
      return products.filter((product) => product.badges.includes("BEST"));
    case "sale":
      return products.filter((product) => product.listPrice != null);
    default:
      return products.filter((product) => PAGE_CATEGORIES[page]?.includes(product.categoryCode));
  }
}

/** 상품이 속한 카테고리 페이지 (상세 화면의 '목록으로') */
export function pageOfProduct(product: ShopProduct): CategoryPage {
  const found = (Object.keys(PAGE_CATEGORIES) as CategoryPage[]).find((page) => PAGE_CATEGORIES[page]?.includes(product.categoryCode));
  return found ?? "all";
}

export function priceText(product: ShopProduct, locale: Locale) {
  const currency = currencyFor(locale);
  return {
    price: formatMoney(product.price, currency, locale),
    listPrice: product.listPrice == null ? undefined : formatMoney(product.listPrice, currency, locale),
  };
}

/** 예전 상품 번호(SKZ-번호)로 찾기. 메인 화면의 기본 히어로·타일 사진 자리 */
export const bySku = (products: ShopProduct[], legacyId: number) => products.find((product) => product.sku === `SKZ-${legacyId}`);

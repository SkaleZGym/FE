import type { CategoryPage } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

/**
 * 헤더 메뉴 5개 (19번 시안). 상품 메뉴는 카테고리 페이지로, COLLAB·ABOUT은 메인 화면의 해당 자리로 간다.
 * ABOUT은 아직 소개 페이지가 없어 배송·신뢰 안내로.
 *
 * NEW DROPS·TIGHTS 는 그 칸에 상품이 하나도 없으면 숨기고, 상품을 등록하면 다시 나온다 (상품 목록 캐시라 몇 분 안에).
 * filled 가 null(BE 응답 없음)이면 숨기지 않는다 → 서버가 잠깐 끊겨도 메뉴가 사라지지 않게. SHOP 은 늘 보인다
 */
export function siteNav(locale: Locale, nav: Dictionary["nav"], filled: ReadonlySet<CategoryPage> | null = null) {
  const items: { label: string; href: string; page?: CategoryPage }[] = [
    { label: nav.shop, href: `/${locale}/shop/all` },
    { label: nav.newDrops, href: `/${locale}/shop/new`, page: "new" },
    { label: nav.tights, href: `/${locale}/shop/tights`, page: "tights" },
    { label: nav.collab, href: `/${locale}#drop` },
    { label: nav.about, href: `/${locale}#shipping` },
  ];
  return items.filter((item) => !item.page || !filled || filled.has(item.page)).map(({ label, href }) => ({ label, href }));
}

/** 헤더 오른쪽 글자들 (장바구니·언어·메뉴·로그인/MY) */
export const headerLabels = (nav: Dictionary["nav"]) => ({
  cart: nav.cart,
  search: nav.search,
  language: nav.language,
  menu: nav.menu,
  close: nav.close,
  login: nav.login,
  my: nav.my,
  logout: nav.logout,
  theme: nav.theme,
});

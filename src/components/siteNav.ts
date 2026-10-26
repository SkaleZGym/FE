import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

/**
 * 헤더 메뉴 5개 (19번 시안). 상품 메뉴는 카테고리 페이지로, COLLAB·ABOUT은 메인 화면의 해당 자리로 간다.
 * ABOUT은 아직 소개 페이지가 없어 배송·신뢰 안내로
 */
export function siteNav(locale: Locale, nav: Dictionary["nav"]) {
  return [
    { label: nav.shop, href: `/${locale}/shop/all` },
    { label: nav.newDrops, href: `/${locale}/shop/new` },
    { label: nav.tights, href: `/${locale}/shop/tights` },
    { label: nav.collab, href: `/${locale}#drop` },
    { label: nav.about, href: `/${locale}#shipping` },
  ];
}

/** 헤더 오른쪽 글자들 (장바구니·언어·메뉴·로그인/MY) */
export const headerLabels = (nav: Dictionary["nav"]) => ({
  cart: nav.cart,
  language: nav.language,
  menu: nav.menu,
  close: nav.close,
  login: nav.login,
  my: nav.my,
});

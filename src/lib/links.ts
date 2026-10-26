// 서버·브라우저 어디서나 쓰는 링크 도우미 (서버 전용 lib/api.ts 와 나눠 둔다)
import type { Locale } from "@/i18n/config";

/**
 * 관리자가 고른 상품 링크(/product/166)에 지금 언어를 붙인다 (/ko/product/166).
 * 이미 언어가 붙은 주소(/ko/...)나 바깥 주소(https://...)는 그대로
 */
export function localHref(link: string | null | undefined, locale: Locale, fallback: string) {
  if (!link) return fallback;
  if (!link.startsWith("/") || link.startsWith("//")) return link;
  return /^\/(ko|en|ja|zh-CN)(\/|$)/.test(link) ? link : `/${locale}${link}`;
}

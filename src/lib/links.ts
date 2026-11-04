// 서버·브라우저 어디서나 쓰는 링크 도우미 (서버 전용 lib/api.ts 와 나눠 둔다)
import type { Locale } from "@/i18n/config";

/**
 * 로그인 뒤 돌아갈 주소(?next=)는 우리 사이트 안 경로만 받는다.
 * "/\t/evil.com" 처럼 탭·줄바꿈·역슬래시를 섞으면 브라우저가 다른 사이트로 읽기 때문에
 * 글자 검사 대신 실제로 주소를 풀어 보고 같은 사이트인지 확인한다
 */
export function safePath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/")) return fallback;
  const base = "https://skalez.invalid";
  try {
    const url = new URL(value, base);
    return url.origin === base ? url.pathname + url.search + url.hash : fallback;
  } catch {
    return fallback;
  }
}

/**
 * 관리자가 고른 상품 링크(/product/166)에 지금 언어를 붙인다 (/ko/product/166).
 * 이미 언어가 붙은 주소(/ko/...)나 바깥 주소(https://...)는 그대로
 */
export function localHref(link: string | null | undefined, locale: Locale, fallback: string) {
  if (!link) return fallback;
  if (!link.startsWith("/") || link.startsWith("//")) return link;
  return /^\/(ko|en|ja|zh-CN)(\/|$)/.test(link) ? link : `/${locale}${link}`;
}

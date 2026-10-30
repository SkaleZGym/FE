// 로그인·회원가입 요청 (브라우저 → FE 서버). 토큰은 FE 서버가 httpOnly 쿠키로만 보관한다
import type { Locale } from "@/i18n/config";
import { api, ApiError } from "@/lib/client";

/** remember=false 면 브라우저를 닫을 때 로그인이 풀린다 */
export async function login(locale: Locale, email: string, password: string, remember = true) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": locale },
    body: JSON.stringify({ email, password, remember }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, data?.code, data?.message ?? "");
  }
}

/** 회원가입 API 응답은 쓰지 않는다 — 가입 직후 같은 정보로 로그인한다. agreeTerms·agreePrivacy·over14 는 필수 동의 (BE 가 각각 확인) */
export const signup = (
  locale: Locale,
  body: { email: string; password: string; name: string; agreeTerms: true; agreePrivacy: true; over14: true; marketingConsent: boolean },
) =>
  api("/auth/signup", { method: "POST", body, locale });

/** 카카오·네이버 로그인 시작 주소 (FE 서버가 위조 방지 값을 만들고 로그인 창으로 보낸다) */
export const socialStartHref = (provider: "kakao" | "naver", locale: Locale, next: string) =>
  `/api/auth/oauth/${provider}/start?${new URLSearchParams({ lang: locale, next })}`;

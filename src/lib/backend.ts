// SKALEZ BE(스프링) 주소와 로그인 토큰 쿠키. 서버(서버 컴포넌트·라우트 핸들러)에서만 쓴다.
// 로컬은 http://localhost:8080, 배포 때는 환경변수 SKALEZ_API_URL 에 BE 주소를 넣는다.
export const API_BASE = process.env.SKALEZ_API_URL ?? "http://localhost:8080";

/** BE가 발급한 JWT를 담는 쿠키. httpOnly라 브라우저 스크립트가 읽을 수 없다 (XSS로 토큰이 새지 않게) */
export const TOKEN_COOKIE = "skz_at";

/**
 * 관리자 토큰 쿠키. 손님 로그인과 따로 두고, /api/admin 아래 요청에만 실려 가도록 path를 좁힌다.
 * (관리자도 쇼핑몰 화면에서는 손님으로 로그인할 수 있게)
 */
export const ADMIN_TOKEN_COOKIE = "skz_admin";
export const ADMIN_COOKIE_PATH = "/api/admin";

/** 고객이 보는 쇼핑몰 주소 (간편 로그인 콜백 주소용). BE 의 skalez.site.url 과 같아야 한다 */
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3010";
/** 간편 로그인 진행 중 위조 방지 값(state)과 돌아갈 곳을 담는 쿠키 */
export const OAUTH_STATE_COOKIE = "skz_oauth";
/** 간편 로그인으로 처음 온 사람의 가입 표 (약관 동의 화면까지 10분) */
export const SOCIAL_SIGNUP_COOKIE = "skz_social";

/** 로그인 토큰 쿠키. remember=false 면 브라우저를 닫을 때 지워지는 쿠키 */
export function tokenCookie(accessToken: string, expiresIn: number, remember = true) {
  return {
    name: TOKEN_COOKIE,
    value: accessToken,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: expiresIn } : {}),
  };
}

/**
 * 로그인 유지(리프레시 토큰) 쿠키. FE 서버 경로(/api)로만 보내지고 브라우저 스크립트는 읽을 수 없다.
 * 값 앞에 '로그인 상태 유지' 여부(1/0)를 붙여 두어 토큰을 갱신할 때도 같은 방식으로 쿠키를 다시 만든다
 */
export const REFRESH_COOKIE = "skz_rt";

/** BE 로그인 응답 (관리자 로그인은 refreshToken 없음) */
export type TokenPayload = { accessToken: string; expiresIn: number; refreshToken?: string | null; refreshExpiresIn?: number | null };

type CookieTarget = { cookies: { set: (cookie: ReturnType<typeof tokenCookie>) => unknown } };

/** 로그인·갱신 결과를 쿠키 두 개로 (접근 토큰, 로그인 유지 토큰) */
export function setSessionCookies(response: CookieTarget, token: TokenPayload, remember = true) {
  response.cookies.set(tokenCookie(token.accessToken, token.expiresIn, remember));
  if (token.refreshToken) {
    response.cookies.set({
      name: REFRESH_COOKIE,
      value: `${remember ? 1 : 0}.${token.refreshToken}`,
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/api",
      ...(remember && token.refreshExpiresIn ? { maxAge: token.refreshExpiresIn } : {}),
    });
  }
}

/** 쿠키 값 → { 유지 여부, 토큰 } */
export function readRefreshCookie(value: string | undefined) {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  return { remember: value.slice(0, dot) === "1", token: value.slice(dot + 1) };
}

/** 리프레시 토큰으로 새 한 쌍 받기. 실패(만료·폐기)면 null */
export async function refreshSession(refreshToken: string): Promise<TokenPayload | null> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    return response.ok ? ((await response.json()) as TokenPayload) : null;
  } catch {
    return null;
  }
}

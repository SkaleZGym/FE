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

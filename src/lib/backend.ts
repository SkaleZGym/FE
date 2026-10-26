// SKALEZ BE(스프링) 주소와 로그인 토큰 쿠키. 서버(서버 컴포넌트·라우트 핸들러)에서만 쓴다.
// 로컬은 http://localhost:8080, 배포 때는 환경변수 SKALEZ_API_URL 에 BE 주소를 넣는다.
export const API_BASE = process.env.SKALEZ_API_URL ?? "http://localhost:8080";

/** BE가 발급한 JWT를 담는 쿠키. httpOnly라 브라우저 스크립트가 읽을 수 없다 (XSS로 토큰이 새지 않게) */
export const TOKEN_COOKIE = "skz_at";

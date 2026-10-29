import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE_PATH,
  ADMIN_TOKEN_COOKIE,
  API_BASE,
  readRefreshCookie,
  REFRESH_COOKIE,
  refreshSession,
  setSessionCookies,
  TOKEN_COOKIE,
  type TokenPayload,
} from "@/lib/backend";

/**
 * BFF(브라우저 → FE 서버 → BE). 브라우저는 같은 주소의 /api/... 만 부르고,
 * 여기서 로그인 쿠키의 토큰을 Authorization 헤더로 바꿔 BE에 그대로 넘긴다.
 * 그래서 토큰이 브라우저 스크립트에 노출되지 않고, BE CORS 설정도 필요 없다.
 * 로그인·로그아웃은 쿠키를 다뤄야 해서 /api/auth/login, /api/auth/logout 이 따로 있다 (더 구체적인 경로가 먼저 잡힌다).
 * /api/admin/... 은 관리자 쿠키, 나머지는 손님 쿠키를 쓴다.
 * 손님 접근 토큰(2시간)이 없거나 만료됐으면 로그인 유지 토큰으로 새로 받아 한 번 더 보낸다.
 */
async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = `${API_BASE}/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const name of ["content-type", "accept-language"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const admin = path[0] === "admin";
  const cookieName = admin ? ADMIN_TOKEN_COOKIE : TOKEN_COOKIE;
  let token = request.cookies.get(cookieName)?.value;
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  const send = (accessToken: string | undefined) => {
    const sendHeaders = new Headers(headers);
    if (accessToken) sendHeaders.set("authorization", `Bearer ${accessToken}`);
    return fetch(url, { method: request.method, headers: sendHeaders, body, cache: "no-store", redirect: "manual" });
  };

  const refresh = admin ? null : readRefreshCookie(request.cookies.get(REFRESH_COOKIE)?.value);
  let renewed: TokenPayload | null = null;
  let refreshFailed = false;
  // 접근 토큰 쿠키가 이미 만료돼 사라졌으면 먼저 갱신
  if (!token && refresh) {
    renewed = await refreshSession(refresh.token);
    if (renewed) token = renewed.accessToken;
    else refreshFailed = true;
  }

  let response: Response;
  try {
    response = await send(token);
    if (response.status === 401 && refresh && !renewed && !refreshFailed) {
      renewed = await refreshSession(refresh.token);
      if (renewed) {
        token = renewed.accessToken;
        response = await send(token);
      } else {
        refreshFailed = true;
      }
    }
  } catch {
    return NextResponse.json({ code: "BACKEND_UNAVAILABLE", message: "" }, { status: 502 });
  }

  const result = new NextResponse(response.status === 204 ? null : response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
  if (renewed) setSessionCookies(result, renewed, refresh?.remember ?? true);
  // 토큰이 만료됐거나 잘못됐으면 쿠키도 지운다 → 화면은 로그아웃 상태로
  if (response.status === 401 && token) {
    result.cookies.delete({ name: cookieName, path: admin ? ADMIN_COOKIE_PATH : "/" });
  }
  if (refreshFailed) result.cookies.delete({ name: REFRESH_COOKIE, path: "/api" });
  return result;
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };

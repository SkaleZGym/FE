import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_PATH, ADMIN_TOKEN_COOKIE, API_BASE, TOKEN_COOKIE } from "@/lib/backend";

/**
 * BFF(브라우저 → FE 서버 → BE). 브라우저는 같은 주소의 /api/... 만 부르고,
 * 여기서 로그인 쿠키의 토큰을 Authorization 헤더로 바꿔 BE에 그대로 넘긴다.
 * 그래서 토큰이 브라우저 스크립트에 노출되지 않고, BE CORS 설정도 필요 없다.
 * 로그인·로그아웃은 쿠키를 다뤄야 해서 /api/auth/login, /api/auth/logout 이 따로 있다 (더 구체적인 경로가 먼저 잡힌다).
 * /api/admin/... 은 관리자 쿠키, 나머지는 손님 쿠키를 쓴다.
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
  const token = request.cookies.get(cookieName)?.value;
  if (token) headers.set("authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return NextResponse.json({ code: "BACKEND_UNAVAILABLE", message: "" }, { status: 502 });
  }

  const result = new NextResponse(response.status === 204 ? null : response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
  // 토큰이 만료됐거나 잘못됐으면 쿠키도 지운다 → 화면은 로그아웃 상태로
  if (response.status === 401 && token) {
    result.cookies.delete({ name: cookieName, path: admin ? ADMIN_COOKIE_PATH : "/" });
  }
  return result;
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };

import { NextResponse, type NextRequest } from "next/server";
import { API_BASE, readRefreshCookie, REFRESH_COOKIE, TOKEN_COOKIE } from "@/lib/backend";

/** 로그아웃: BE에서 로그인 유지 토큰을 폐기하고 쿠키 두 개를 지운다 */
export async function POST(request: NextRequest) {
  const refresh = readRefreshCookie(request.cookies.get(REFRESH_COOKIE)?.value);
  if (refresh) {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh.token }),
      cache: "no-store",
    }).catch(() => undefined);
  }
  const result = new NextResponse(null, { status: 204 });
  result.cookies.delete(TOKEN_COOKIE);
  result.cookies.delete({ name: REFRESH_COOKIE, path: "/api" });
  return result;
}

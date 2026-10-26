import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_PATH, ADMIN_TOKEN_COOKIE, API_BASE } from "@/lib/backend";

/**
 * 지금 로그인한 관리자 정보. BE에는 관리자 전용 '내 정보' API가 없어서
 * 관리자 토큰으로 /api/members/me 를 부르고, ADMIN 권한이 아니면 401로 돌려보낸다.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ code: "UNAUTHORIZED", message: "" }, { status: 401 });

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/members/me`, {
      headers: { authorization: `Bearer ${token}`, "accept-language": "ko" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ code: "BACKEND_UNAVAILABLE", message: "서버에 연결할 수 없어요." }, { status: 502 });
  }

  const me = response.ok ? ((await response.json()) as { role?: string }) : null;
  if (me?.role === "ADMIN") return NextResponse.json(me);

  const result = NextResponse.json({ code: "UNAUTHORIZED", message: "" }, { status: 401 });
  result.cookies.delete({ name: ADMIN_TOKEN_COOKIE, path: ADMIN_COOKIE_PATH });
  return result;
}

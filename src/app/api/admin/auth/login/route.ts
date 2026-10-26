import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_PATH, ADMIN_TOKEN_COOKIE, API_BASE } from "@/lib/backend";

/** 관리자 로그인: BE 관리자 로그인으로 토큰을 받아 /api/admin 전용 httpOnly 쿠키에 넣는다 */
export async function POST(request: NextRequest) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/admin/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "accept-language": "ko" },
      body: await request.text(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ code: "BACKEND_UNAVAILABLE", message: "서버에 연결할 수 없어요." }, { status: 502 });
  }

  if (!response.ok) {
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  }

  const { accessToken, expiresIn } = (await response.json()) as { accessToken: string; expiresIn: number };
  const result = new NextResponse(null, { status: 204 });
  result.cookies.set(ADMIN_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_COOKIE_PATH,
    maxAge: expiresIn,
  });
  return result;
}

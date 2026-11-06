import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_PATH, ADMIN_TOKEN_COOKIE, API_BASE, clientHeaders } from "@/lib/backend";

type AdminLoginResult = { step: "OK" | "CODE" | "SETUP"; accessToken?: string; expiresIn?: number; otpSecret?: string; otpUri?: string };

/**
 * 관리자 로그인 (비밀번호 + OTP 앱 6자리). BE 가 step 으로 다음 할 일을 알려 준다.
 * OK 면 토큰을 /api/admin 전용 httpOnly 쿠키에 넣고 204, CODE·SETUP 이면 그 내용을 그대로 화면에 돌려준다 (토큰은 화면에 안 감)
 */
export async function POST(request: NextRequest) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/admin/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "accept-language": "ko", ...clientHeaders(request) },
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

  const data = (await response.json()) as AdminLoginResult;
  if (data.step !== "OK" || !data.accessToken) {
    return NextResponse.json({ step: data.step, otpSecret: data.otpSecret, otpUri: data.otpUri }, { headers: { "cache-control": "no-store" } });
  }
  const result = new NextResponse(null, { status: 204 });
  result.cookies.set(ADMIN_TOKEN_COOKIE, data.accessToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_COOKIE_PATH,
    maxAge: data.expiresIn,
  });
  return result;
}

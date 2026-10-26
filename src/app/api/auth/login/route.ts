import { NextResponse, type NextRequest } from "next/server";
import { API_BASE, TOKEN_COOKIE } from "@/lib/backend";

/** 로그인: BE에서 토큰을 받아 httpOnly 쿠키에 넣는다. 토큰은 응답 본문으로 돌려주지 않는다 */
export async function POST(request: NextRequest) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept-language": request.headers.get("accept-language") ?? "ko",
      },
      body: await request.text(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ code: "BACKEND_UNAVAILABLE", message: "" }, { status: 502 });
  }

  if (!response.ok) {
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  }

  const { accessToken, expiresIn } = (await response.json()) as { accessToken: string; expiresIn: number };
  const result = new NextResponse(null, { status: 204 });
  result.cookies.set(TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: expiresIn,
  });
  return result;
}

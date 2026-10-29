import { NextResponse, type NextRequest } from "next/server";
import { API_BASE, setSessionCookies, type TokenPayload } from "@/lib/backend";

/**
 * 로그인: BE에서 토큰을 받아 httpOnly 쿠키에 넣는다. 토큰은 응답 본문으로 돌려주지 않는다.
 * remember=false('로그인 상태 유지' 해제)면 브라우저를 닫을 때 쿠키가 지워진다
 */
export async function POST(request: NextRequest) {
  const { remember = true, ...credentials } = (await request.json().catch(() => ({}))) as { remember?: boolean; email?: string; password?: string };
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept-language": request.headers.get("accept-language") ?? "ko",
      },
      body: JSON.stringify(credentials),
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

  const token = (await response.json()) as TokenPayload;
  const result = new NextResponse(null, { status: 204 });
  setSessionCookies(result, token, remember !== false);
  return result;
}

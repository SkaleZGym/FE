import { NextResponse, type NextRequest } from "next/server";
import { API_BASE, SOCIAL_SIGNUP_COOKIE, tokenCookie } from "@/lib/backend";

type Pending = { ticket: string; email: string; name: string; provider: string; next: string };

function read(request: NextRequest): Pending | null {
  try {
    return JSON.parse(request.cookies.get(SOCIAL_SIGNUP_COOKIE)?.value ?? "null");
  } catch {
    return null;
  }
}

/** 약관 동의 화면에 보여 줄 정보 (가입 표 자체는 돌려주지 않는다) */
export async function GET(request: NextRequest) {
  const pending = read(request);
  if (!pending) return NextResponse.json({ code: "SOCIAL_SIGNUP_EXPIRED" }, { status: 404 });
  return NextResponse.json({ email: pending.email, name: pending.name, provider: pending.provider });
}

/** 약관 동의 → BE 가 회원을 만들고 토큰을 준다 → 로그인 쿠키, 가입 표 쿠키는 지운다 */
export async function POST(request: NextRequest) {
  const pending = read(request);
  if (!pending) return NextResponse.json({ code: "SOCIAL_SIGNUP_EXPIRED", message: "" }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as { name?: string; agreeTerms?: boolean; marketingConsent?: boolean };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/auth/oauth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json", "accept-language": request.headers.get("accept-language") ?? "ko" },
      body: JSON.stringify({ ticket: pending.ticket, name: body.name, agreeTerms: body.agreeTerms, marketingConsent: body.marketingConsent }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ code: "BACKEND_UNAVAILABLE", message: "" }, { status: 502 });
  }
  if (!response.ok) {
    return new NextResponse(response.body, { status: response.status, headers: { "content-type": "application/json" } });
  }
  const { accessToken, expiresIn } = (await response.json()) as { accessToken: string; expiresIn: number };
  const result = NextResponse.json({ next: pending.next });
  result.cookies.set(tokenCookie(accessToken, expiresIn));
  result.cookies.delete(SOCIAL_SIGNUP_COOKIE);
  return result;
}

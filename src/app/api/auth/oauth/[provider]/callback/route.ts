import { NextResponse, type NextRequest } from "next/server";
import { API_BASE, OAUTH_STATE_COOKIE, SITE_URL, SOCIAL_SIGNUP_COOKIE, tokenCookie } from "@/lib/backend";

type Pending = { state: string; provider: string; lang: string; next: string };

/**
 * 카카오·네이버 로그인 창에서 돌아오는 곳.
 * state 쿠키와 맞는지 확인 → BE 가 code 로 회원을 찾음 →
 *   기존 회원이면 로그인 쿠키를 넣고 원래 보던 곳으로, 처음 온 사람이면 가입 표를 쿠키에 넣고 약관 동의 화면으로
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  let pending: Pending | null = null;
  try {
    pending = JSON.parse(request.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "null");
  } catch {
    pending = null;
  }
  const lang = pending?.lang ?? "ko";
  const redirect = (path: string) => {
    const result = NextResponse.redirect(new URL(path, SITE_URL));
    result.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/auth/oauth" });
    return result;
  };
  const back = (code: string) => redirect(`/${lang}/login?social=${code}`);

  const query = request.nextUrl.searchParams;
  if (query.get("error")) return back("CANCELLED"); // 로그인 창에서 취소·동의 거부
  const code = query.get("code");
  const state = query.get("state");
  if (!pending || !code || !state || state !== pending.state || provider !== pending.provider) return back("STATE");

  let data: { token?: { accessToken: string; expiresIn: number }; ticket?: string; email?: string; name?: string; code?: string } | null;
  let ok = false;
  try {
    const response = await fetch(`${API_BASE}/api/auth/oauth/${provider}/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "accept-language": lang },
      body: JSON.stringify({ code, state, redirectUri: `${SITE_URL}/api/auth/oauth/${provider}/callback` }),
      cache: "no-store",
    });
    ok = response.ok;
    data = await response.json().catch(() => null);
  } catch {
    return back("SOCIAL_LOGIN_FAILED");
  }
  if (!ok || !data) return back(data?.code ?? "SOCIAL_LOGIN_FAILED");

  if (data.token) {
    const result = redirect(pending.next);
    result.cookies.set(tokenCookie(data.token.accessToken, data.token.expiresIn));
    return result;
  }

  // 처음 온 사람: 가입 표는 httpOnly 쿠키에만 (주소창·브라우저 스크립트에 남기지 않는다)
  const result = redirect(`/${lang}/signup/social`);
  result.cookies.set({
    name: SOCIAL_SIGNUP_COOKIE,
    value: JSON.stringify({ ticket: data.ticket, email: data.email, name: data.name ?? "", provider, next: pending.next }),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return result;
}

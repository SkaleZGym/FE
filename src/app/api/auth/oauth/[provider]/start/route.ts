import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "@/i18n/config";
import { API_BASE, OAUTH_STATE_COOKIE, SITE_URL } from "@/lib/backend";

const PROVIDERS = new Set(["kakao", "naver"]);

/** 돌아갈 곳은 우리 사이트 안 경로만 (다른 사이트로 튕기지 않게) */
const safePath = (value: string | null, fallback: string) =>
  value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback;

/**
 * 간편 로그인 시작: 위조 방지 값(state)을 만들어 쿠키에 넣고, 카카오·네이버 로그인 창으로 보낸다.
 * 예: /api/auth/oauth/kakao/start?lang=ko&next=/ko/mypage
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const langParam = request.nextUrl.searchParams.get("lang") ?? "ko";
  const lang = hasLocale(langParam) ? langParam : "ko";
  const next = safePath(request.nextUrl.searchParams.get("next"), `/${lang}`);
  const back = (code: string) => NextResponse.redirect(new URL(`/${lang}/login?social=${code}`, SITE_URL));
  if (!PROVIDERS.has(provider)) return back("SOCIAL_LOGIN_FAILED");

  const state = randomBytes(24).toString("base64url");
  const redirectUri = `${SITE_URL}/api/auth/oauth/${provider}/callback`;
  let url: string;
  try {
    const response = await fetch(
      `${API_BASE}/api/auth/oauth/${provider}/authorize-url?${new URLSearchParams({ redirectUri, state })}`,
      { cache: "no-store" },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return back(data?.code ?? "SOCIAL_LOGIN_FAILED");
    url = data.url;
  } catch {
    return back("SOCIAL_LOGIN_FAILED");
  }

  const result = NextResponse.redirect(url);
  result.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: JSON.stringify({ state, provider, lang, next }),
    httpOnly: true,
    sameSite: "lax", // 카카오·네이버에서 돌아오는 이동(최상위 GET)에는 실려 온다
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/oauth",
    maxAge: 600,
  });
  return result;
}

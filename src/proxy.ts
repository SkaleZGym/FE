import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, localeCookie, locales, type Locale } from "@/i18n/config";

/** 쿠키(직접 고른 언어) → Accept-Language(브라우저 언어) → 한국어 순으로 언어를 정한다. */
function resolveLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(localeCookie)?.value;
  if (saved && hasLocale(saved)) return saved;

  const accepted = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of accepted) {
    const exact = locales.find((locale) => locale.toLowerCase() === tag);
    if (exact) return exact;
    const sameLanguage = locales.find((locale) => locale.split("-")[0] === tag.split("-")[0]);
    if (sameLanguage) return sameLanguage;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocalePrefix = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocalePrefix) return;

  request.nextUrl.pathname = `/${resolveLocale(request)}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // _next, API, 정적 파일(확장자 있는 경로)은 건너뛴다
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};

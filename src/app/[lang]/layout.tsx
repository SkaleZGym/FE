import type { Metadata } from "next";
import { Anton, Barlow_Semi_Condensed, Noto_Sans_JP, Noto_Sans_KR, Noto_Sans_SC } from "next/font/google";
import { locales } from "@/i18n/config";
import CookieNotice from "@/components/CookieNotice";
import SitePopup from "@/components/SitePopup";
import { themeScript } from "@/components/ThemeToggle";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getBanners } from "@/lib/api";
import { SITE_URL } from "@/lib/backend";
import { isLiveSite } from "@/lib/seo";
import "../globals.css";

// 헤드라인용 영문 장체. 한·중·일 글자는 없어서 아래 본문 폰트로 자동 대체된다.
const display = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
// 영문 메뉴·꼬리표·가격용 좁은 고딕 (운동복 브랜드에서 흔히 쓰는 결). 예전에는 고정폭(JetBrains Mono)이었다
const ui = Barlow_Semi_Condensed({ variable: "--font-barlow", weight: ["500", "600", "700"], subsets: ["latin"] });
const notoKr = Noto_Sans_KR({ variable: "--font-noto-kr", preload: false });
const notoJp = Noto_Sans_JP({ variable: "--font-noto-jp", preload: false });
const notoSc = Noto_Sans_SC({ variable: "--font-noto-sc", preload: false });

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  const locale = await getLocale();
  return {
    // 공유 미리보기·hreflang 주소를 절대 주소로 만든다 (SITE_URL = 지금 서비스 중인 주소)
    metadataBase: new URL(SITE_URL),
    title: dict.meta.title,
    description: dict.meta.description,
    // 대표 주소·언어 연결(hreflang)은 페이지마다 다르므로 각 페이지의 generateMetadata 에서 pageAlternates 로 적는다
    // 시험 주소(new.skalez.com)·로컬은 검색에 남지 않게 (robots.txt 도 함께 막는다)
    robots: isLiveSite ? { index: true, follow: true } : { index: false, follow: false },
    // 구글 서치 콘솔·네이버 서치어드바이저의 '사이트 소유 확인' 값. 서버 fe.env 에 넣으면 <meta> 로 나간다
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.NAVER_SITE_VERIFICATION ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION } : undefined,
    },
    // 카카오톡·인스타 등에 링크를 붙였을 때 보이는 카드. 상품 상세는 상품 사진으로 덮어쓴다
    openGraph: {
      type: "website",
      siteName: "SKALEZ",
      title: dict.meta.title,
      description: dict.meta.description,
      locale: locale.replace("-", "_"),
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const fontVariables = [display, ui, notoKr, notoJp, notoSc].map((font) => font.variable).join(" ");

  const locale = await getLocale();
  const dict = await getDictionary();
  // 관리자에서 켠 팝업 (BE가 꺼져 있으면 없음)
  const popups = (await getBanners(locale, "POPUP")) ?? [];

  return (
    // data-theme 은 아래 머리 스크립트가 화면을 그리기 전에 붙인다 → 서버가 그린 것과 달라도 경고하지 않게
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        {/* 나이트·라이트: 고른 값(없으면 기기 설정)을 첫 화면이 그려지기 전에 정한다 */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <SitePopup locale={locale} banners={popups} labels={dict.popup} />
        <CookieNotice locale={locale} labels={dict.cookieNotice} />
      </body>
    </html>
  );
}

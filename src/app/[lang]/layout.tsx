import type { Metadata } from "next";
import { Anton, JetBrains_Mono, Noto_Sans_JP, Noto_Sans_KR, Noto_Sans_SC } from "next/font/google";
import { locales } from "@/i18n/config";
import CookieNotice from "@/components/CookieNotice";
import SitePopup from "@/components/SitePopup";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getBanners } from "@/lib/api";
import { SITE_URL } from "@/lib/backend";
import "../globals.css";

// 헤드라인용 영문 장체. 한·중·일 글자는 없어서 아래 본문 폰트로 자동 대체된다.
const display = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });
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
    alternates: {
      languages: Object.fromEntries(locales.map((code) => [code, `/${code}`])),
    },
    // 카카오톡·인스타 등에 링크를 붙였을 때 보이는 카드. 상품 상세는 상품 사진으로 덮어쓴다
    openGraph: {
      type: "website",
      siteName: "SKALEZ",
      title: dict.meta.title,
      description: dict.meta.description,
      locale: locale.replace("-", "_"),
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const fontVariables = [display, mono, notoKr, notoJp, notoSc].map((font) => font.variable).join(" ");

  const locale = await getLocale();
  const dict = await getDictionary();
  // 관리자에서 켠 팝업 (BE가 꺼져 있으면 없음)
  const popups = (await getBanners(locale, "POPUP")) ?? [];

  return (
    <html lang={locale} className={fontVariables}>
      <body>
        {children}
        <SitePopup locale={locale} banners={popups} labels={dict.popup} />
        <CookieNotice locale={locale} labels={dict.cookieNotice} />
      </body>
    </html>
  );
}

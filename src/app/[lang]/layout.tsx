import type { Metadata } from "next";
import { Anton, JetBrains_Mono, Noto_Sans_JP, Noto_Sans_KR, Noto_Sans_SC } from "next/font/google";
import { locales } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
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
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      languages: Object.fromEntries(locales.map((locale) => [locale, `/${locale}`])),
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const fontVariables = [display, mono, notoKr, notoJp, notoSc].map((font) => font.variable).join(" ");

  return (
    <html lang={await getLocale()} className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}

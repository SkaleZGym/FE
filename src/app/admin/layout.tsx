import type { Metadata } from "next";
import { Anton, JetBrains_Mono, Noto_Sans_KR } from "next/font/google";
import "./admin.css";

// 관리자 화면은 쇼핑몰(/[lang])과 따로 도는 두 번째 루트 레이아웃이다. 한국어 전용, 검색엔진 노출 안 함
const display = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });
const body = Noto_Sans_KR({ variable: "--font-noto-kr", preload: false });

export const metadata: Metadata = {
  title: { default: "SKALEZ ADMIN", template: "%s | SKALEZ ADMIN" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="ko" className={[display, mono, body].map((font) => font.variable).join(" ")}>
      <body>{children}</body>
    </html>
  );
}

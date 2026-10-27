import type { ReactNode } from "react";
import QuickMenu from "@/components/QuickMenu";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { headerLabels, siteNav } from "@/components/siteNav";
import { images } from "@/data/catalog";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import styles from "./account.module.css";

/** 회원·장바구니·마이페이지 화면 공통 틀: 헤더 + 가운데 제목 + 본문 + 푸터 */
export default async function PageShell({
  title,
  lead,
  narrow = false,
  children,
}: {
  /** 없으면 본문이 직접 제목을 그린다 (주문 결과처럼 주소에 따라 제목이 바뀌는 화면) */
  title?: string;
  lead?: string;
  /** 로그인·가입처럼 폭이 좁은 화면 */
  narrow?: boolean;
  children: ReactNode;
}) {
  const locale = await getLocale();
  const dict = await getDictionary();

  return (
    <>
      <SiteHeader locale={locale} logo={images.wordmark} nav={siteNav(locale, dict.nav)} labels={headerLabels(dict.nav)} />
      <main className={styles.main} data-narrow={narrow || undefined}>
        {title && (
          <header className={styles.head}>
            <h1>{title}</h1>
            {lead && <p>{lead}</p>}
          </header>
        )}
        {children}
      </main>
      <SiteFooter locale={locale} labels={dict.footer} />
      <QuickMenu locale={locale} labels={dict.quick} />
    </>
  );
}

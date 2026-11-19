import Image from "next/image";
import { business, images } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getSiteTexts } from "@/lib/api";
import styles from "./SiteFooter.module.css";

/**
 * 모든 페이지 공통 푸터. 위: 슬로건(크게) · 고객센터 · 안내 링크, 아래: 사업자 정보(법정 표기) · 저작권.
 * 슬로건은 관리자 '사이트 문구'(footer.tagline)에서 바꾼다
 */
export default async function SiteFooter({ locale, labels }: { locale: Locale; labels: Dictionary["footer"] }) {
  const texts = await getSiteTexts(locale);
  const tagline = texts?.["footer.tagline"] || labels.tagline;
  const rows = [
    [labels.company, business.company],
    [labels.ceo, business.ceo],
    [labels.businessNumber, business.businessNumber],
    [labels.mailOrder, business.mailOrder],
    [labels.address, business.address],
    [labels.privacyOfficer, business.ceo],
    [labels.hosting, business.hosting],
  ];
  const bizInfoUrl = `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${business.businessNumber.replaceAll("-", "")}`;

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <p className={styles.tagline}>{tagline}</p>

        <div className={styles.col}>
          <h2>{labels.contact}</h2>
          <a href={`tel:${business.contact}`}>{business.contact}</a>
          <a href={`mailto:${business.email}`}>{business.email}</a>
        </div>

        <nav className={styles.links} aria-label={labels.guide}>
          <a href={`/${locale}/notice`}>{labels.notice}</a>
          <a href={`/${locale}/faq`}>{labels.faq}</a>
          <a href={`/${locale}/guide`}>{labels.guide}</a>
          <a href={`/${locale}/terms`}>{labels.terms}</a>
          {/* 개인정보처리방침은 눈에 띄게 (개인정보 보호법 권고) */}
          <a href={`/${locale}/privacy`}>
            <b>{labels.privacy}</b>
          </a>
          <a href={`/${locale}/cookies`}>{labels.cookies}</a>
          <a href={`/${locale}/email-policy`}>{labels.emailRefusal}</a>
        </nav>
      </div>

      <div className={styles.bottom}>
        <div className={styles.mark}>
          <Image src={images.wordmark} alt="SKALEZ" width={150} height={30} style={{ height: "auto" }} />
          <p className={styles.copy}>© 2026 SKALEZ</p>
        </div>
        <dl className={styles.business}>
          {rows.map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>
                {value}
                {/* 통신판매업자는 공정위 사업자정보 공개 페이지로 연결해야 한다 (전자상거래법 제10조, 공정위 고시) */}
                {term === labels.businessNumber && (
                  <>
                    {" "}
                    <a className={styles.bizInfo} href={bizInfoUrl} target="_blank" rel="noreferrer">
                      {labels.bizInfo}
                    </a>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </footer>
  );
}

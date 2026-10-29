import Image from "next/image";
import { business, images } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getSiteTexts } from "@/lib/api";
import styles from "./SiteFooter.module.css";

/** 모든 페이지 공통 푸터: 로고 · 슬로건 · 사업자 정보 · 약관 */
export default async function SiteFooter({ locale, labels }: { locale: Locale; labels: Dictionary["footer"] }) {
  const texts = await getSiteTexts(locale);
  const tagline = texts?.["footer.tagline"] || labels.tagline;
  const rows = [
    [labels.company, business.company],
    [labels.ceo, business.ceo],
    [labels.businessNumber, business.businessNumber],
    [labels.mailOrder, business.mailOrder],
    [labels.address, business.address],
    [labels.contact, business.contact],
    [labels.email, business.email],
    [labels.privacyOfficer, business.ceo],
    [labels.hosting, business.hosting],
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <Image src={images.wordmark} alt="SKALEZ" width={150} height={30} style={{ height: "auto" }} />
        <span>{tagline} · © 2026 SKALEZ</span>
      </div>
      <dl className={styles.business}>
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.links}>
        <a href={`/${locale}/terms`}>{labels.terms}</a>
        <a href={`/${locale}/privacy`}>
          <b>{labels.privacy}</b>
        </a>
        <a href={`/${locale}/guide`}>{labels.guide}</a>
        <a href={`/${locale}/cookies`}>{labels.cookies}</a>
        <a href={`/${locale}/email-policy`}>{labels.emailRefusal}</a>
        <a href={`/${locale}/notice`}>{labels.notice}</a>
        <a href={`/${locale}/faq`}>{labels.faq}</a>
      </div>
    </footer>
  );
}

import Image from "next/image";
import { business, images } from "@/data/catalog";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./SiteFooter.module.css";

/** 모든 페이지 공통 푸터: 로고 · 슬로건 · 사업자 정보 · 약관 */
export default function SiteFooter({ labels }: { labels: Dictionary["footer"] }) {
  const rows = [
    [labels.company, business.company],
    [labels.ceo, business.ceo],
    [labels.businessNumber, business.businessNumber],
    [labels.mailOrder, business.mailOrder],
    [labels.address, business.address],
    [labels.contact, business.contact],
    [labels.email, business.email],
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <Image src={images.wordmark} alt="SKALEZ" width={110} height={22} style={{ height: "auto" }} />
        <span>{labels.tagline} · © 2026 SKALEZ</span>
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
        <a href="#">{labels.terms}</a>
        <a href="#">{labels.privacy}</a>
      </div>
    </footer>
  );
}

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getFaqs, getLatestNotices } from "@/lib/api";
import Reveal from "./Reveal";
import styles from "./NoticeBoard.module.css";

type Props = {
  locale: Locale;
  labels: Dictionary["board"];
};

/**
 * 공지사항(최신 5개) + FAQ. 관리자에서 등록한 글이 BE API로 들어온다.
 * BE가 꺼져 있거나 FAQ가 하나도 없으면 사전의 기본 FAQ를 보여 준다
 */
export default async function NoticeBoard({ locale, labels }: Props) {
  const [notices, faqs] = await Promise.all([getLatestNotices(locale), getFaqs(locale)]);
  const faqItems = faqs && faqs.length > 0 ? faqs : labels.fallbackFaqs.map((faq, index) => ({ id: -index - 1, ...faq }));
  const date = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" });

  return (
    <section className={styles.board} id="notice">
      <div className={styles.col}>
        <h2>{labels.noticeTitle}</h2>
        <a className={styles.more} href={`/${locale}/notice`}>
          {labels.more} →
        </a>
        {notices && notices.length > 0 ? (
          <ul className={styles.notices}>
            {notices.map((notice, index) => (
              <li key={notice.id}>
                <Reveal delay={index * 60}>
                  <a href={`/${locale}/notice/${notice.id}`} className={styles.notice}>
                    <span className={styles.tag} data-event={notice.category === "EVENT" || undefined}>
                      {notice.pinned ? labels.pinned : labels.categories[notice.category]}
                    </span>
                    <span className={styles.title}>{notice.title}</span>
                    <time dateTime={notice.createdAt}>{date.format(new Date(notice.createdAt))}</time>
                  </a>
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>{labels.empty}</p>
        )}
      </div>

      <div className={styles.col}>
        <h2>{labels.faqTitle}</h2>
        <a className={styles.more} href={`/${locale}/faq`}>
          {labels.more} →
        </a>
        <div className={styles.faqs}>
          {faqItems.slice(0, 6).map((faq) => (
            <details key={faq.id} className={styles.faq}>
              <summary>
                <span className={styles.q}>Q.</span>
                {faq.question}
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

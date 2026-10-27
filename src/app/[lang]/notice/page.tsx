import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import styles from "@/components/board/Board.module.css";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getLatestNotices } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.footer.notice} | ${dict.meta.title}` };
}

/** 공지사항 목록 (고정 글이 먼저, 최신순). 공지는 많지 않아 최근 100개를 한 화면에 */
export default async function NoticeListPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const labels = dict.board;
  const notices = (await getLatestNotices(locale, 100)) ?? [];
  const date = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" });

  return (
    <PageShell title={labels.noticeTitle} lead={labels.noticeLead}>
      <div className={styles.wrap}>
        {notices.length === 0 ? (
          <p className={styles.empty}>{labels.empty}</p>
        ) : (
          <ul className={styles.list}>
            {notices.map((notice) => (
              <li key={notice.id}>
                <a className={styles.row} href={`/${locale}/notice/${notice.id}`}>
                  <span className={styles.tag} data-tone={notice.pinned ? "solid" : notice.category === "EVENT" ? "red" : undefined}>
                    {notice.pinned ? labels.pinned : labels.categories[notice.category]}
                  </span>
                  <span className={styles.title}>{notice.title}</span>
                  <time dateTime={notice.createdAt}>{date.format(new Date(notice.createdAt))}</time>
                  <span className={styles.arrow} aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}

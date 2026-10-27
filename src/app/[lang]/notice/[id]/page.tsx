import type { Metadata } from "next";
import { Suspense } from "react";
import PageShell from "@/components/account/PageShell";
import styles from "@/components/board/Board.module.css";
import type { Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import { getNotice } from "@/lib/api";

// 글 번호를 미리 알 수 없어 요청 때 그린다 (헤더·팝업의 주소 읽기까지 함께 기다림)
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.footer.notice} | ${dict.meta.title}` };
}

/** 공지 상세. 글 번호는 관리자가 새로 쓸 때마다 늘어나서 미리 만들어 둘 수 없다 → 요청 때 그린다 */
export default async function NoticePage({ params }: PageProps<"/[lang]/notice/[id]">) {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell>
      <div className={styles.wrap}>
        <Suspense fallback={<p className={styles.empty}>…</p>}>
          <NoticeBody params={params} locale={locale} labels={dict.board} />
        </Suspense>
        <a className={styles.back} href={`/${locale}/notice`}>
          {dict.board.back}
        </a>
      </div>
    </PageShell>
  );
}

async function NoticeBody({ params, locale, labels }: { params: Promise<{ id: string }>; locale: Locale; labels: Dictionary["board"] }) {
  const { id } = await params;
  const notice = /^\d+$/.test(id) ? await getNotice(locale, Number(id)) : null;
  if (!notice) return <p className={styles.empty}>{labels.notFound}</p>;
  const date = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" });

  return (
    <article className={styles.article}>
      <header>
        <span className={styles.tag} data-tone={notice.pinned ? "solid" : notice.category === "EVENT" ? "red" : undefined}>
          {labels.categories[notice.category]}
        </span>
        <h1>{notice.title}</h1>
        <div className={styles.meta}>
          <time dateTime={notice.createdAt}>{date.format(new Date(notice.createdAt))}</time>
        </div>
      </header>
      <div className={styles.content}>{notice.content}</div>
    </article>
  );
}

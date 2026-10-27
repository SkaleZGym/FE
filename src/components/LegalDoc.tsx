import type { LegalDocument } from "@/data/legal";
import styles from "./LegalDoc.module.css";

/**
 * 약관·방침 본문. 넓은 화면은 왼쪽에 조항 목차(따라 내려옴), 좁은 화면은 본문만.
 * 한국어가 기준이라 다른 언어 화면에는 위에 안내 한 줄을 붙인다
 */
export default function LegalDoc({ doc, effectiveLabel, notice }: { doc: LegalDocument; effectiveLabel: string; notice?: string }) {
  return (
    <div className={styles.layout} lang="ko">
      <nav className={styles.toc} aria-label={doc.title}>
        <ol>
          {doc.sections.map((section, index) => (
            <li key={section.heading}>
              <a href={`#s${index + 1}`}>{section.heading}</a>
            </li>
          ))}
        </ol>
      </nav>

      <article className={styles.doc}>
        <div className={styles.meta}>
          <span>
            {effectiveLabel} {doc.effective}
          </span>
        </div>
        {notice && <p className={styles.notice}>{notice}</p>}
        <p className={styles.intro}>{doc.intro}</p>
        {doc.sections.map((section, index) => (
          <section key={section.heading} id={`s${index + 1}`}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}

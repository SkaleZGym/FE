"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Faq } from "@/lib/api";
import styles from "./Board.module.css";

type Category = keyof Dictionary["board"]["faqCategories"];

/** FAQ 분류 탭 + 접었다 펴는 목록. 실제로 글이 있는 분류만 탭으로 보여 준다 */
export default function FaqList({ locale, items, labels }: { locale: Locale; items: Faq[]; labels: Dictionary["board"] }) {
  const [category, setCategory] = useState<Category>("ALL");
  const used = Object.keys(labels.faqCategories).filter(
    (key) => key === "ALL" || items.some((faq) => faq.category === key),
  ) as Category[];
  const shown = category === "ALL" ? items : items.filter((faq) => faq.category === category);

  return (
    <div className={styles.wrap}>
      {used.length > 2 && (
        <div className={styles.tabs}>
          {used.map((key) => (
            <button key={key} type="button" aria-pressed={key === category} onClick={() => setCategory(key)}>
              {labels.faqCategories[key]}
            </button>
          ))}
        </div>
      )}
      <ul className={styles.list}>
        {shown.map((faq) => (
          <li key={faq.id}>
            <details className={styles.faq}>
              <summary>
                <span className={styles.q}>Q.</span>
                {faq.question}
              </summary>
              <p>{faq.answer}</p>
            </details>
          </li>
        ))}
      </ul>
      <p className={styles.help}>
        {labels.faqHelp}
        <a href={`/${locale}/mypage?tab=inquiries`}>{labels.faqAsk}</a>
      </p>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useSearchOrNull } from "@/components/account/useMember";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./SearchView.module.css";

export type SearchItem = {
  id: number;
  image: string;
  name: string;
  /** 모든 언어 상품명 (소문자) */
  keywords: string;
  soldOut: boolean;
  /** 검색 전 추천 상품 */
  best: boolean;
  price: string;
  listPrice: string | null;
};

type Labels = Dictionary["search"] & { soldOut: string; sale: string };

/** 띄어쓰기로 나눈 단어가 모두 들어간 상품. '카모 타이즈', '블랙 후드'처럼 찾는다 */
function match(items: SearchItem[], query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return items.filter((item) => words.every((word) => item.keywords.includes(word)));
}

export default function SearchView({ locale, items, labels }: { locale: Locale; items: SearchItem[]; labels: Labels }) {
  // 서버 그림에는 주소 쿼리가 없다(null) → 브라우저가 주소를 읽기 전까지 결과 자리를 비워 둬 안내 문구가 깜빡이지 않게
  const search = useSearchOrNull();
  const urlQuery = new URLSearchParams(search ?? "").get("q") ?? "";
  const [typed, setTyped] = useState<string | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const current = query ?? urlQuery;
  const results = match(items, current);
  // 검색 전: BEST 상품부터, 모자라면 판매 중인 다른 상품으로 8개
  const onSale = items.filter((item) => !item.soldOut);
  const recommended = [...onSale.filter((item) => item.best), ...onSale.filter((item) => !item.best)].slice(0, 8);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = (typed ?? urlQuery).trim();
    setQuery(next);
    window.history.replaceState(null, "", next ? `/${locale}/search?q=${encodeURIComponent(next)}` : `/${locale}/search`);
  };
  const pick = (keyword: string) => {
    setTyped(keyword);
    setQuery(keyword);
    window.history.replaceState(null, "", `/${locale}/search?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <div className={styles.wrap}>
      <form className={styles.form} role="search" onSubmit={submit}>
        <input
          type="search"
          name="q"
          value={typed ?? urlQuery}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          autoFocus
        />
        <button type="submit">{labels.submit}</button>
      </form>

      <div className={styles.keywords}>
        <span>{labels.popular}</span>
        {labels.keywords.map((keyword) => (
          <button key={keyword} type="button" onClick={() => pick(keyword)}>
            {keyword}
          </button>
        ))}
      </div>

      {search === null ? null : current.trim() === "" ? (
        recommended.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.heading}>{labels.recommend}</h2>
            <Grid locale={locale} items={recommended} labels={labels} />
          </section>
        )
      ) : results.length === 0 ? (
        <div className={styles.none}>
          <p>{labels.empty.replace("{query}", current)}</p>
          <span>{labels.emptyTip}</span>
        </div>
      ) : (
        <section className={styles.section}>
          <h2 className={styles.heading}>
            <b>{current}</b>
            <span>{labels.results.replace("{count}", String(results.length))}</span>
          </h2>
          <Grid locale={locale} items={results} labels={labels} />
        </section>
      )}
    </div>
  );
}

function Grid({ locale, items, labels }: { locale: Locale; items: SearchItem[]; labels: Labels }) {
  return (
    <ul className={styles.grid}>
      {items.map((item) => (
        <li key={item.id}>
          <a className={styles.card} href={`/${locale}/product/${item.id}`} data-soldout={item.soldOut || undefined}>
            <span className={styles.image}>
              <Image src={item.image} alt="" fill sizes="(max-width: 860px) 50vw, 25vw" />
              {item.soldOut ? <span className={styles.tag}>{labels.soldOut}</span> : item.listPrice && <span className={styles.tag} data-tone="red">{labels.sale}</span>}
            </span>
            <span className={styles.name}>{item.name}</span>
            <span className={styles.price}>
              {item.price}
              {item.listPrice && <s>{item.listPrice}</s>}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

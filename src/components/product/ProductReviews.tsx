"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAccount } from "@/components/account/accountStore";
import { errorText } from "@/components/account/useMember";
import type { Locale } from "@/i18n/config";
import { api, loginHref } from "@/lib/client";
import type { DetailLabels } from "./ProductDetail";
import styles from "./ProductDetail.module.css";

type Review = { id: number; author: string; rating: number; content: string; reply: string | null; createdAt: string; repliedAt: string | null };
type Page<T> = { content: T[]; page: number; totalPages: number; totalElements: number };

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

function Stars({ rating, size = "small" }: { rating: number; size?: "small" | "large" }) {
  const full = Math.round(rating);
  return (
    <span className={styles.stars} data-size={size} aria-label={`${rating} / 5`}>
      {"★".repeat(full)}
      <i>{"★".repeat(5 - full)}</i>
    </span>
  );
}

/** 리뷰 탭: 평균 별점 · 개수 · 목록(10개씩 더 보기) · 쓰기(배송 완료된 주문의 상품만) */
export default function ProductReviews({
  locale,
  productId,
  productName,
  labels,
  onCount,
}: {
  locale: Locale;
  productId: number | null;
  productName: string;
  labels: DetailLabels;
  onCount: (count: number) => void;
}) {
  const account = useAccount(locale);
  const pathname = usePathname();
  const [summary, setSummary] = useState<{ count: number; average: number } | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState<Page<Review> | null>(null);
  const [writing, setWriting] = useState(false);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchPage = useCallback(
    (pageNumber: number) =>
      Promise.all([
        api<{ count: number; average: number }>(`/products/${productId}/reviews/summary`, { locale }),
        api<Page<Review>>(`/products/${productId}/reviews?page=${pageNumber}&size=10`, { locale }),
      ]),
    [productId, locale],
  );

  const apply = useCallback(
    ([nextSummary, nextPage]: [{ count: number; average: number }, Page<Review>]) => {
      setSummary(nextSummary);
      onCount(nextSummary.count);
      setPage(nextPage);
      setReviews((current) => (nextPage.page === 0 ? nextPage.content : [...current, ...nextPage.content]));
    },
    [onCount],
  );

  const load = (pageNumber: number) => (productId ? fetchPage(pageNumber).then(apply) : Promise.resolve());

  useEffect(() => {
    if (!productId) return;
    fetchPage(0)
      .then(apply)
      .catch(() => undefined);
  }, [productId, fetchPage, apply]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productId) return;
    const formElement = event.currentTarget;
    const content = String(new FormData(formElement).get("content")).trim();
    setBusy(true);
    setMessage(null);
    try {
      await api("/reviews", { method: "POST", body: { productId, rating, content }, locale });
      formElement.reset();
      setWriting(false);
      setMessage({ ok: true, text: labels.reviewDone });
      await load(0);
    } catch (caught) {
      setMessage({ ok: false, text: errorText(caught, labels.common) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.reviews}>
      <div className={styles.reviewHead}>
        <div className={styles.score}>
          <b>{summary ? summary.average.toFixed(1) : "-"}</b>
          <Stars rating={summary?.average ?? 0} size="large" />
          <span>{fill(labels.reviewCount, { n: summary?.count ?? 0 })}</span>
        </div>
        {account.status === "member" ? (
          <button className={styles.secondary} type="button" onClick={() => setWriting((value) => !value)}>
            {labels.writeReview}
          </button>
        ) : (
          <a className={styles.secondary} href={loginHref(locale, `${pathname}?tab=reviews`)}>
            {labels.reviewLogin}
          </a>
        )}
      </div>

      {writing && (
        <form className={styles.reviewForm} onSubmit={submit}>
          <p className={styles.muted}>{labels.reviewRule}</p>
          <div className={styles.ratingPick} role="radiogroup" aria-label={labels.rating}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" role="radio" aria-checked={rating === value} data-on={value <= rating || undefined} onClick={() => setRating(value)}>
                ★
              </button>
            ))}
          </div>
          <textarea name="content" required maxLength={1000} placeholder={labels.reviewPlaceholder} />
          <button className={styles.primary} type="submit" disabled={busy}>
            {labels.reviewSubmit}
          </button>
        </form>
      )}
      {message && (
        <p className={styles.notice} data-tone={message.ok ? undefined : "error"} role="status">
          {message.text}
        </p>
      )}

      {reviews.length === 0 ? (
        <p className={styles.empty}>{labels.noReviews}</p>
      ) : (
        <ul className={styles.reviewList}>
          {reviews.map((review) => (
            <li key={review.id}>
              <Stars rating={review.rating} />
              <p>{review.content}</p>
              <span className={styles.byline}>
                {review.author} · {productName} · {new Date(review.createdAt).toLocaleDateString(locale)}
              </span>
              {review.reply && (
                <div className={styles.reply}>
                  <b>{labels.reply}</b>
                  {review.reply}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {page && page.page + 1 < page.totalPages && (
        <button className={styles.secondary} type="button" onClick={() => load(page.page + 1).catch(() => undefined)}>
          {labels.more}
        </button>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { refreshCart, refreshWishes, useAccount } from "@/components/account/accountStore";
import { useSearch } from "@/components/account/useMember";
import { formatMoney, type Badge, type Currency } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { api, ApiError, loginHref, type BeProduct } from "@/lib/client";
import ProductReviews from "./ProductReviews";
import styles from "./ProductDetail.module.css";

export type DetailProduct = {
  /** BE 상품 번호 */
  id: number;
  sku: string;
  image: string;
  name: string;
  /** 이름 위 작은 영문 제목 */
  kicker: string;
  badges: Badge[];
  soldOut: boolean;
  /** 화면 단위 금액 (원 · 달러) */
  price: number;
  listPrice: number | null;
  currency: Currency;
  sizes: string[];
  fit: string;
  fabric: string;
  description: string | null;
  categoryHref: string;
};

type Shipping = { fee: number; freeThreshold: number | null; text: string; extra: string | null };

export type DetailLabels = Dictionary["product"] & {
  panel: Dictionary["panel"];
  common: Dictionary["common"];
  soldOutTag: string;
  sale: string;
};

type Tab = "detail" | "size" | "reviews";
const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

export default function ProductDetail({ locale, product, shipping, labels }: { locale: Locale; product: DetailProduct; shipping: Shipping; labels: DetailLabels }) {
  const account = useAccount(locale);
  const tabParam = new URLSearchParams(useSearch()).get("tab");
  const [picked, setPicked] = useState<Tab | null>(null);
  const tab: Tab = picked ?? (tabParam === "reviews" || tabParam === "size" ? tabParam : "detail");
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [be, setBe] = useState<BeProduct | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ text: string; cart?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const money = (amount: number) => formatMoney(amount, product.currency, locale);
  const wished = account.wishes.has(product.sku);

  // BE 상품(재고·후기용 번호). BE가 꺼져 있어도 화면은 그대로 보인다
  useEffect(() => {
    api<BeProduct>(`/products/${product.id}`, { locale })
      .then(setBe)
      .catch(() => setBe(null));
  }, [product.id, locale]);

  useEffect(() => {
    if (!be) return;
    api<{ count: number }>(`/products/${be.id}/reviews/summary`, { locale })
      .then((summary) => setReviewCount(summary.count))
      .catch(() => undefined);
  }, [be, locale]);

  // 리뷰 탭으로 바로 들어오면 (?tab=reviews) 탭 위치로 내려 준다
  useEffect(() => {
    if (tabParam === "reviews") tabsRef.current?.scrollIntoView({ block: "start" });
  }, [tabParam]);

  const stockOf = (value: string) => be?.variants.find((variant) => variant.size === value)?.stock;
  const total = product.price * qty;
  const left = shipping.freeThreshold == null ? null : Math.max(0, shipping.freeThreshold - total);
  const progress = shipping.freeThreshold ? Math.min(100, (total / shipping.freeThreshold) * 100) : 0;
  const goLogin = () => window.location.assign(loginHref(locale, window.location.pathname + window.location.search));

  const addToCart = async (thenCheckout: boolean) => {
    if (busy) return;
    if (product.soldOut) return setNotice({ text: labels.panel.restockSoon });
    if (!size) {
      // 모바일 아래 막대에서 눌렀을 때도 사이즈 고르는 곳이 보이게
      document.getElementById("detail-size")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return setNotice({ text: labels.selectSize });
    }
    if (account.status === "guest") return goLogin();
    setBusy(true);
    setNotice(null);
    try {
      const variant = (be ?? (await api<BeProduct>(`/products/${product.id}`, { locale }))).variants.find((item) => item.size === size);
      if (!variant || variant.stock < qty) {
        setNotice({ text: labels.panel.unavailable });
        return;
      }
      await api("/cart/items", { method: "POST", body: { variantId: variant.id, quantity: qty }, locale });
      await refreshCart(locale);
      if (thenCheckout) {
        // 결제 화면은 전체 새로고침으로 열어 장바구니를 처음부터 다시 읽는다
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`/${locale}/checkout`);
        return;
      }
      setNotice({ text: labels.panel.added, cart: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) return goLogin();
      setNotice({ text: caught instanceof ApiError && caught.message ? caught.message : labels.panel.unavailable });
    } finally {
      setBusy(false);
    }
  };

  const toggleWish = async () => {
    if (account.status === "guest") return goLogin();
    if (!be || busy) return;
    setBusy(true);
    try {
      await api(`/wishes/${be.id}`, { method: wished ? "DELETE" : "PUT", locale });
      await refreshWishes(locale);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) return goLogin();
    } finally {
      setBusy(false);
    }
  };

  const heart = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.5 4.2 12.9a4.9 4.9 0 0 1 0-7 4.8 4.8 0 0 1 6.9 0l.9.9.9-.9a4.8 4.8 0 0 1 6.9 0 4.9 4.9 0 0 1 0 7Z" />
    </svg>
  );

  return (
    <div className={styles.page}>
      <section className={styles.top}>
        <div className={styles.media}>
          <Image src={product.image} alt={product.name} fill priority sizes="(max-width: 860px) 100vw, 50vw" />
          <span className={styles.tags}>
            {product.soldOut && <span>{labels.soldOutTag}</span>}
            {!product.soldOut && product.listPrice && <span data-tone="red">{labels.sale}</span>}
            {product.badges
              .filter((badge) => badge !== "SALE")
              .map((badge) => (
                <span key={badge}>{badge}</span>
              ))}
          </span>
        </div>

        <div className={styles.buy}>
          <p className={styles.kicker}>{product.kicker}</p>
          <h1 className={styles.name}>{product.name}</h1>
          <p className={styles.meta}>
            {product.fit} · {product.fabric}
          </p>

          <div className={styles.price}>
            <b>{money(product.price)}</b>
            {product.listPrice && <s>{money(product.listPrice)}</s>}
            {product.listPrice && <em>{Math.round((1 - product.price / product.listPrice) * 100)}%</em>}
          </div>

          <dl className={styles.rows}>
            <div>
              <dt>{labels.panel.shipping}</dt>
              <dd>
                {shipping.text}
                {shipping.extra && <small>{shipping.extra}</small>}
              </dd>
            </div>
            <div>
              <dt>{labels.panel.model}</dt>
              <dd>{labels.panel.modelValue}</dd>
            </div>
          </dl>

          <div className={styles.block}>
            <div className={styles.label} id="detail-size">
              {labels.panel.size}
            </div>
            <div className={styles.sizes} role="group" aria-labelledby="detail-size">
              {product.sizes.map((item) => {
                const stock = stockOf(item);
                const out = product.soldOut || stock === 0;
                return (
                  <button key={item} type="button" aria-pressed={item === size} disabled={out} onClick={() => setSize(item)}>
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.block} data-row="">
            <div className={styles.label}>{labels.panel.qty}</div>
            <div className={styles.qty}>
              <button type="button" aria-label={labels.panel.decrease} onClick={() => setQty((value) => Math.max(1, value - 1))}>
                −
              </button>
              <output aria-live="polite">{qty}</output>
              <button type="button" aria-label={labels.panel.increase} onClick={() => setQty((value) => Math.min(99, value + 1))}>
                +
              </button>
            </div>
          </div>

          <div className={styles.total}>
            <div>
              <b>{labels.total}</b>
              <small>{fill(labels.totalNote, { n: qty })}</small>
            </div>
            <strong>{money(total)}</strong>
          </div>

          {left != null && (
            <div className={styles.free}>
              <div>
                <span>{left > 0 ? fill(labels.freeLeft, { amount: money(left) }) : labels.freeDone}</span>
                <small>
                  {money(Math.min(total, shipping.freeThreshold ?? total))} / {money(shipping.freeThreshold ?? 0)}
                </small>
              </div>
              <span className={styles.track}>
                <i style={{ width: `${progress}%` }} />
              </span>
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.primary} type="button" onClick={() => addToCart(true)} disabled={busy}>
              {product.soldOut ? labels.panel.restock : labels.buyNow}
            </button>
            <div className={styles.pair}>
              <button className={styles.secondary} type="button" onClick={() => addToCart(false)} disabled={busy || product.soldOut}>
                {labels.addCart}
              </button>
              <button className={styles.wish} type="button" onClick={toggleWish} disabled={busy} aria-pressed={wished}>
                {heart}
                {wished ? labels.panel.unwish : labels.panel.wish}
              </button>
            </div>
          </div>
          <p className={styles.notice} role="status">
            {notice?.text}{" "}
            {notice?.cart && <a href={`/${locale}/cart`}>{labels.panel.viewCart} →</a>}
          </p>
        </div>
      </section>

      <div className={styles.tabs} role="tablist" ref={tabsRef}>
        {(["detail", "size", "reviews"] as Tab[]).map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setPicked(key)}>
            {labels.tabs[key]}
            {key === "reviews" && reviewCount != null && <span> {reviewCount}</span>}
          </button>
        ))}
      </div>

      <section className={styles.panel} role="tabpanel">
        {tab === "detail" && (
          <div className={styles.detail}>
            <h2>{labels.detailTitle}</h2>
            <p>{product.description ?? labels.detailEmpty}</p>
            <div className={styles.detailImage}>
              <Image src={product.image} alt="" fill sizes="(max-width: 860px) 100vw, 720px" />
            </div>
            <dl className={styles.specs}>
              <div>
                <dt>{labels.panel.fit}</dt>
                <dd>{product.fit}</dd>
              </div>
              <div>
                <dt>{labels.panel.fabric}</dt>
                <dd>{product.fabric}</dd>
              </div>
              <div>
                <dt>{labels.panel.model}</dt>
                <dd>{labels.panel.modelValue}</dd>
              </div>
              <div>
                <dt>{labels.panel.shipping}</dt>
                <dd>{shipping.text}</dd>
              </div>
            </dl>
          </div>
        )}

        {tab === "size" && (
          <div className={styles.detail}>
            <h2>{labels.sizeTitle}</h2>
            <dl className={styles.specs}>
              <div>
                <dt>{labels.sizeAvailable}</dt>
                <dd>{product.sizes.join(" · ")}</dd>
              </div>
              <div>
                <dt>{labels.panel.fit}</dt>
                <dd>{product.fit}</dd>
              </div>
              <div>
                <dt>{labels.panel.model}</dt>
                <dd>{labels.panel.modelValue}</dd>
              </div>
            </dl>
            <p className={styles.muted}>{labels.sizeNote}</p>
          </div>
        )}

        {tab === "reviews" && (
          <ProductReviews locale={locale} productId={be?.id ?? null} productName={product.name} labels={labels} onCount={setReviewCount} />
        )}
      </section>

      {/* 모바일: 화면 아래 고정 구매 막대 */}
      <div className={styles.bar} data-buy-bar="">
        <button className={styles.barWish} type="button" onClick={toggleWish} aria-pressed={wished} aria-label={wished ? labels.panel.unwish : labels.panel.wish}>
          {heart}
        </button>
        <button className={styles.secondary} type="button" onClick={() => addToCart(false)} disabled={busy || product.soldOut}>
          {labels.addCart}
        </button>
        <button className={styles.primary} type="button" onClick={() => addToCart(true)} disabled={busy}>
          {product.soldOut ? labels.panel.restock : labels.buyNow}
        </button>
      </div>
    </div>
  );
}

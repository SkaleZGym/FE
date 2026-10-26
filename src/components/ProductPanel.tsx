"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Badge } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import { api, ApiError, loginHref, skuOf, type BeProduct } from "@/lib/client";
import { refreshCart, refreshWishes, useAccount } from "./account/accountStore";
import { PRODUCT_EVENT } from "./productEvents";
import styles from "./ProductPanel.module.css";

/** 서버에서 언어·통화에 맞게 가공해서 넘기는 패널용 상품 정보 */
export type PanelProduct = {
  id: number;
  image: string;
  name: string;
  badges: Badge[];
  price: string;
  listPrice?: string;
  soldOut: boolean;
  desc?: string;
  sizes: string[];
  fit: string;
  fabric: string;
};

export type PanelLabels = {
  title: string;
  close: string;
  dialog: string;
  size: string;
  qty: string;
  decrease: string;
  increase: string;
  add: string;
  restock: string;
  soldOutNote: string;
  added: string;
  viewCart: string;
  unavailable: string;
  restockSoon: string;
  wish: string;
  unwish: string;
  fit: string;
  fabric: string;
  model: string;
  shipping: string;
  modelValue: string;
  shippingValue: string;
};

type Props = { locale: Locale; products: PanelProduct[]; labels: PanelLabels };

/** 담기 버튼 아래 안내: 담김(장바구니 링크) · 오류 문구 · 재입고 안내 */
type Notice = { kind: "added" } | { kind: "message"; text: string } | null;

/**
 * 19번 시안의 상품 정보 패널. PC는 오른쪽에서 밀려 나오고, 모바일은 아래에서 올라오는 시트.
 * openProduct(id)가 보내는 신호를 받아 열리고, 바깥·닫기·Esc로 닫힌다.
 * 담기·찜은 FE 상품 번호를 BE 상품 코드(SKZ-번호)로 찾아 BE 장바구니·위시리스트에 넣는다.
 */
export default function ProductPanel({ locale, products, labels }: Props) {
  const [id, setId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const account = useAccount(locale);
  const beProducts = useRef(new Map<number, BeProduct>());
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  // 닫히는 애니메이션 동안에도 내용이 남아 있도록 마지막 상품은 지우지 않는다
  const product = products.find((item) => item.id === id) ?? null;

  useEffect(() => {
    const onOpen = (event: Event) => {
      const next = products.find((item) => item.id === (event as CustomEvent<number>).detail);
      if (!next) return;
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setId(next.id);
      setSize(next.sizes[Math.min(1, next.sizes.length - 1)] ?? null); // 기본은 두 번째 사이즈 (보통 L)
      setQty(1);
      setNotice(null);
      setOpen(true);
    };
    window.addEventListener(PRODUCT_EVENT, onOpen);
    return () => window.removeEventListener(PRODUCT_EVENT, onOpen);
  }, [products]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.scrollTo({ top: 0 });
    closeRef.current?.focus({ preventScroll: true });
    const returnTo = opener.current;
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      returnTo?.focus({ preventScroll: true });
    };
  }, [open]);

  const wished = product ? account.wishes.has(skuOf(product.id)) : false;

  /** 로그인 전이면 로그인 화면으로 보냈다가 지금 페이지로 돌아온다 */
  const goLogin = () => window.location.assign(loginHref(locale, window.location.pathname));

  const beProductOf = async (feId: number) => {
    const cached = beProducts.current.get(feId);
    if (cached) return cached;
    const found = await api<BeProduct>(`/products/sku/${skuOf(feId)}`, { locale });
    beProducts.current.set(feId, found);
    return found;
  };

  const fail = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) return goLogin();
    const text = error instanceof ApiError && error.status === 404 ? labels.unavailable : error instanceof ApiError && error.message ? error.message : labels.unavailable;
    setNotice({ kind: "message", text });
  };

  const addToCart = async () => {
    if (!product || busy) return;
    if (product.soldOut) return setNotice({ kind: "message", text: labels.restockSoon });
    if (account.status === "guest") return goLogin();
    setBusy(true);
    setNotice(null);
    try {
      const variant = (await beProductOf(product.id)).variants.find((item) => item.size === size);
      if (!variant || variant.stock < qty) {
        setNotice({ kind: "message", text: labels.unavailable });
        return;
      }
      await api("/cart/items", { method: "POST", body: { variantId: variant.id, quantity: qty }, locale });
      await refreshCart(locale);
      setNotice({ kind: "added" });
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const toggleWish = async () => {
    if (!product || busy) return;
    if (account.status === "guest") return goLogin();
    setBusy(true);
    try {
      const productId = account.wishes.get(skuOf(product.id)) ?? (await beProductOf(product.id)).id;
      await api(`/wishes/${productId}`, { method: wished ? "DELETE" : "PUT", locale });
      await refreshWishes(locale);
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} data-open={open || undefined} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside
        ref={panelRef}
        className={styles.panel}
        data-open={open || undefined}
        role="dialog"
        aria-modal="true"
        aria-label={labels.dialog}
        inert={!open}
      >
        <div className={styles.head}>
          <span>{labels.title}</span>
          <button ref={closeRef} type="button" className={styles.close} onClick={() => setOpen(false)}>
            {labels.close} ✕
          </button>
        </div>
        {product && (
          <>
            <div className={styles.image}>
              <Image src={product.image} alt={product.name} fill sizes="(max-width: 720px) 100vw, 480px" />
            </div>
            <div className={styles.body}>
              {product.badges.length > 0 && (
                <div className={styles.badges}>
                  {product.badges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
              )}
              <h2 className={styles.name}>{product.name}</h2>
              <div className={styles.price}>
                {product.price}
                {product.listPrice && <s>{product.listPrice}</s>}
              </div>
              {product.soldOut && <span className={styles.soldOut}>{labels.soldOutNote}</span>}
              {product.desc && <p className={styles.desc}>{product.desc}</p>}

              <div className={styles.label} id="panel-size">
                {labels.size}
              </div>
              <div className={styles.sizes} role="group" aria-labelledby="panel-size">
                {product.sizes.map((item) => (
                  <button key={item} type="button" aria-pressed={item === size} onClick={() => setSize(item)}>
                    {item}
                  </button>
                ))}
              </div>

              <div className={styles.label}>{labels.qty}</div>
              <div className={styles.qty}>
                <button type="button" aria-label={labels.decrease} onClick={() => setQty((value) => Math.max(1, value - 1))}>
                  −
                </button>
                <output aria-live="polite">{qty}</output>
                <button type="button" aria-label={labels.increase} onClick={() => setQty((value) => Math.min(99, value + 1))}>
                  +
                </button>
              </div>

              <div className={styles.actions}>
                <button type="button" className={styles.add} onClick={addToCart} disabled={busy} aria-busy={busy}>
                  <span>{product.soldOut ? labels.restock : labels.add}</span>
                  <span aria-hidden="true">→</span>
                </button>
                <button
                  type="button"
                  className={styles.wish}
                  onClick={toggleWish}
                  disabled={busy}
                  aria-pressed={wished}
                  aria-label={wished ? labels.unwish : labels.wish}
                  title={wished ? labels.unwish : labels.wish}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 20.5 4.2 12.9a4.9 4.9 0 0 1 0-7 4.8 4.8 0 0 1 6.9 0l.9.9.9-.9a4.8 4.8 0 0 1 6.9 0 4.9 4.9 0 0 1 0 7Z" />
                  </svg>
                </button>
              </div>
              <p className={styles.note} role="status">
                {notice?.kind === "added" && (
                  <>
                    {labels.added} <a href={`/${locale}/cart`}>{labels.viewCart} →</a>
                  </>
                )}
                {notice?.kind === "message" && notice.text}
              </p>

              <dl className={styles.specs}>
                <div>
                  <dt>{labels.fit}</dt>
                  <dd>{product.fit}</dd>
                </div>
                <div>
                  <dt>{labels.fabric}</dt>
                  <dd>{product.fabric}</dd>
                </div>
                <div>
                  <dt>{labels.model}</dt>
                  <dd>{labels.modelValue}</dd>
                </div>
                <div>
                  <dt>{labels.shipping}</dt>
                  <dd>{labels.shippingValue}</dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { api, money, type Cart, type CouponPreview } from "@/lib/client";
import styles from "./account.module.css";
import { refreshCart } from "./accountStore";
import { errorText, useMember } from "./useMember";

type Props = { locale: Locale; labels: Dictionary["cart"]; common: Dictionary["common"] };

/** 결제 화면이 같은 할인코드를 이어 쓰도록 이 탭 동안만 기억한다 */
export const COUPON_KEY = "skz_coupon";

export const readCoupon = () => {
  try {
    return sessionStorage.getItem(COUPON_KEY) ?? "";
  } catch {
    return "";
  }
};

const saveCoupon = (code: string) => {
  try {
    if (code) sessionStorage.setItem(COUPON_KEY, code);
    else sessionStorage.removeItem(COUPON_KEY);
  } catch {
    // 저장소를 못 쓰는 브라우저면 결제 화면에서 다시 입력하면 된다
  }
};

export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

export default function CartView({ locale, labels, common }: Props) {
  const account = useMember(locale);
  const [cart, setCart] = useState<Cart | null>(null);
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /** 장바구니가 바뀌면 할인코드 금액도 다시 계산한다 (조건이 안 맞게 되면 해제) */
  const preview = useCallback(
    async (couponCode: string) => {
      if (!couponCode) return setCoupon(null);
      try {
        setCoupon(await api<CouponPreview>("/coupons/preview", { method: "POST", body: { code: couponCode }, locale }));
        saveCoupon(couponCode);
      } catch (caught) {
        setCoupon(null);
        saveCoupon("");
        throw caught;
      }
    },
    [locale],
  );

  const apply = useCallback(
    async (next: Cart) => {
      setCart(next);
      await refreshCart(locale);
      const saved = readCoupon();
      if (saved && next.items.length > 0) await preview(saved).catch(() => undefined);
      else setCoupon(null);
    },
    [locale, preview],
  );

  useEffect(() => {
    if (account.status !== "member") return;
    api<Cart>("/cart", { locale })
      .then((next) => {
        setCode(readCoupon());
        return apply(next);
      })
      .catch((caught) => setError(errorText(caught, common)));
  }, [account.status, locale, apply, common]);

  const run = async (task: () => Promise<Cart>) => {
    setBusy(true);
    setError("");
    try {
      await apply(await task());
    } catch (caught) {
      setError(errorText(caught, common));
    } finally {
      setBusy(false);
    }
  };

  const changeQuantity = (cartItemId: number, quantity: number) =>
    run(() => api<Cart>(`/cart/items/${cartItemId}`, { method: "PATCH", body: { quantity }, locale }));
  const remove = (cartItemId: number) => run(() => api<Cart>(`/cart/items/${cartItemId}`, { method: "DELETE", locale }));

  const applyCoupon = async () => {
    setBusy(true);
    setError("");
    try {
      await preview(code.trim().toUpperCase());
    } catch (caught) {
      setError(errorText(caught, common));
    } finally {
      setBusy(false);
    }
  };

  const clearCoupon = () => {
    saveCoupon("");
    setCode("");
    setCoupon(null);
  };

  if (!cart) {
    return error ? <p className={styles.error}>{error}</p> : <p className={styles.muted}>{common.loading}</p>;
  }

  if (cart.items.length === 0) {
    return (
      <div className={styles.empty}>
        {labels.empty}
        <a className={styles.button} data-variant="ghost" href={`/${locale}/shop/all`}>
          {labels.shop} →
        </a>
      </div>
    );
  }

  const amounts = coupon ?? { ...cart, discountAmount: 0 };
  const show = (amount: number) => money(amount, cart.currency, locale);

  return (
    <div className={styles.layout}>
      <ul className={styles.lines} style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {cart.items.map((item) => (
          <li className={styles.line} key={item.cartItemId}>
            <div className={styles.thumb}>
              {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="96px" />}
            </div>
            <div className={styles.lineInfo}>
              <b>{item.name}</b>
              <span>
                {labels.size} {item.size} · {show(item.unitPrice)}
              </span>
              {item.stock < 5 && <span>{fill(labels.stockLeft, { n: item.stock })}</span>}
            </div>
            <div className={styles.lineSide}>
              <span>{show(item.lineTotal)}</span>
              <div className={styles.stepper}>
                <button
                  type="button"
                  aria-label="-"
                  disabled={busy || item.quantity <= 1}
                  onClick={() => changeQuantity(item.cartItemId, item.quantity - 1)}
                >
                  −
                </button>
                <output>{item.quantity}</output>
                <button
                  type="button"
                  aria-label="+"
                  disabled={busy || item.quantity >= Math.min(99, item.stock)}
                  onClick={() => changeQuantity(item.cartItemId, item.quantity + 1)}
                >
                  +
                </button>
              </div>
              <button type="button" className={styles.textButton} disabled={busy} onClick={() => remove(item.cartItemId)}>
                {labels.remove}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <aside className={styles.summary}>
        <h2>{labels.coupon}</h2>
        {coupon ? (
          <div className={styles.boxHead}>
            <b>{fill(labels.couponApplied, { name: `${coupon.name} (${coupon.code})` })}</b>
            <button type="button" className={styles.textButton} onClick={clearCoupon}>
              {labels.couponRemove}
            </button>
          </div>
        ) : (
          <form
            className={styles.coupon}
            onSubmit={(event) => {
              event.preventDefault();
              void applyCoupon();
            }}
          >
            <input
              className={styles.input}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={labels.couponPlaceholder}
              maxLength={30}
              aria-label={labels.coupon}
            />
            <button className={styles.button} data-variant="ghost" data-size="small" type="submit" disabled={busy || !code.trim()}>
              {labels.apply}
            </button>
          </form>
        )}

        <dl className={styles.amounts}>
          <div>
            <dt>{labels.items}</dt>
            <dd>{show(amounts.itemsAmount)}</dd>
          </div>
          {amounts.discountAmount > 0 && (
            <div data-discount="">
              <dt>{labels.discount}</dt>
              <dd>−{show(amounts.discountAmount)}</dd>
            </div>
          )}
          <div>
            <dt>{labels.shipping}</dt>
            <dd>{amounts.shippingFee === 0 ? labels.free : show(amounts.shippingFee)}</dd>
          </div>
          <div data-total="">
            <dt>{labels.total}</dt>
            <dd>{show(amounts.totalAmount)}</dd>
          </div>
        </dl>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <a className={styles.button} data-variant="red" href={`/${locale}/checkout`}>
          {labels.checkout} →
        </a>
        <p className={styles.muted}>{labels.shippingNote}</p>
      </aside>
    </div>
  );
}

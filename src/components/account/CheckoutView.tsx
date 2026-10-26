"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { api, money, type Cart, type CouponPreview, type Order } from "@/lib/client";
import styles from "./account.module.css";
import { refreshCart } from "./accountStore";
import { fill, readCoupon } from "./CartView";
import { errorText, useMember } from "./useMember";

type Props = {
  locale: Locale;
  labels: Dictionary["checkout"];
  cartLabels: Dictionary["cart"];
  common: Dictionary["common"];
  /** 결제창 상품명 "OO 외 n건" */
  more: string;
};

/** 나이스페이 결제창 (공개 값이라 브라우저에 있어도 된다. 비밀키는 BE 환경변수에만) */
const NICE_CLIENT_ID = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID ?? "";
/** 결제창이 끝나면 돌아올 BE 주소: https://api.skalez.com/api/payments/nice/return */
const NICE_RETURN_URL = process.env.NEXT_PUBLIC_NICEPAY_RETURN_URL ?? "";
const NICE_SDK = "https://pay.nicepay.co.kr/v1/js/";

type NicePay = {
  requestPay: (options: {
    clientId: string;
    method: "card";
    orderId: string;
    amount: number;
    goodsName: string;
    returnUrl: string;
    fnError: (result: { errorMsg?: string }) => void;
  }) => void;
};

function loadNicePay(): Promise<NicePay> {
  const existing = (window as unknown as { AUTHNICE?: NicePay }).AUTHNICE;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = NICE_SDK;
    script.onload = () => {
      const loaded = (window as unknown as { AUTHNICE?: NicePay }).AUTHNICE;
      if (loaded) resolve(loaded);
      else reject(new Error("AUTHNICE"));
    };
    script.onerror = () => reject(new Error("AUTHNICE"));
    document.head.append(script);
  });
}

const countries = ["KR", "US", "JP", "CN", "TW", "HK", "SG", "CA", "AU", "GB", "DE", "FR"];
const defaultCountry: Record<Locale, string> = { ko: "KR", en: "US", ja: "JP", "zh-CN": "CN" };

export default function CheckoutView({ locale, labels, cartLabels, common, more }: Props) {
  const account = useMember(locale);
  const [cart, setCart] = useState<Cart | null>(null);
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const countryName = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);

  useEffect(() => {
    if (account.status !== "member") return;
    (async () => {
      const next = await api<Cart>("/cart", { locale });
      if (next.items.length === 0) return window.location.replace(`/${locale}/cart`);
      setCart(next);
      const code = readCoupon();
      if (code) setCoupon(await api<CouponPreview>("/coupons/preview", { method: "POST", body: { code }, locale }).catch(() => null));
    })().catch((caught) => setError(errorText(caught, common)));
  }, [account.status, locale, common]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    setBusy(true);
    setError("");

    let order: Order;
    try {
      order = await api<Order>("/orders", {
        method: "POST",
        locale,
        body: {
          shippingAddress: {
            recipient: text("recipient"),
            phone: text("phone"),
            countryCode: text("countryCode"),
            postalCode: text("postalCode"),
            address1: text("address1"),
            address2: text("address2") || null,
          },
          couponCode: coupon?.code ?? null,
        },
      });
    } catch (caught) {
      setError(errorText(caught, common));
      setBusy(false);
      return;
    }

    const resultHref = (status: "success" | "fail", code?: string) =>
      `/${locale}/order/result?orderNumber=${encodeURIComponent(order.orderNumber)}&status=${status}${code ? `&code=${encodeURIComponent(code)}` : ""}`;

    // 실결제: 나이스페이 결제창 → 카드 인증 → BE returnUrl 이 승인하고 결과 화면으로 보낸다
    if (NICE_CLIENT_ID && NICE_RETURN_URL && order.currency === "KRW") {
      try {
        const nice = await loadNicePay();
        nice.requestPay({
          clientId: NICE_CLIENT_ID,
          method: "card",
          orderId: order.orderNumber,
          amount: order.totalAmount,
          goodsName: order.items.length > 1 ? `${order.items[0].productName} ${fill(more, { n: order.items.length - 1 })}` : order.items[0].productName,
          returnUrl: NICE_RETURN_URL,
          fnError: (result) => {
            setError(result.errorMsg || common.error);
            setBusy(false);
          },
        });
      } catch {
        setError(common.backendDown);
        setBusy(false);
      }
      return;
    }

    // 로컬 개발: BE 가짜 결제(PAYMENT_PROVIDER=fake)는 test_{통화}_{금액} 을 결제 성공으로 본다
    try {
      await api<Order>(`/orders/${order.orderNumber}/payment`, {
        method: "POST",
        locale,
        body: { paymentId: `test_${order.currency}_${order.totalAmount}` },
      });
      await refreshCart(locale);
      window.location.assign(resultHref("success"));
    } catch (caught) {
      window.location.assign(resultHref("fail", errorText(caught, common)));
    }
  };

  if (!cart) {
    return error ? <p className={styles.error}>{error}</p> : <p className={styles.muted}>{common.loading}</p>;
  }

  const amounts = coupon ?? { ...cart, discountAmount: 0 };
  const show = (amount: number) => money(amount, cart.currency, locale);
  const devMode = !(NICE_CLIENT_ID && NICE_RETURN_URL);

  return (
    <form className={styles.layout} onSubmit={onSubmit}>
      <div className={styles.form}>
        <section className={styles.section} style={{ borderTop: 0, paddingTop: 0 }}>
          <h2>{labels.address}</h2>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>{labels.recipient}</span>
              <input className={styles.input} name="recipient" autoComplete="name" defaultValue={account.me?.name} maxLength={50} required />
            </label>
            <label className={styles.field}>
              <span>{labels.phone}</span>
              <input className={styles.input} name="phone" type="tel" autoComplete="tel" maxLength={30} required />
            </label>
          </div>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>{labels.country}</span>
              <select className={styles.input} name="countryCode" defaultValue={defaultCountry[locale]}>
                {countries.map((code) => (
                  <option key={code} value={code}>
                    {countryName.of(code)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>{labels.postalCode}</span>
              <input className={styles.input} name="postalCode" autoComplete="postal-code" maxLength={20} required />
            </label>
          </div>
          <label className={styles.field}>
            <span>{labels.address1}</span>
            <input className={styles.input} name="address1" autoComplete="address-line1" maxLength={200} required />
          </label>
          <label className={styles.field}>
            <span>{labels.address2}</span>
            <input className={styles.input} name="address2" autoComplete="address-line2" maxLength={200} />
          </label>
        </section>

        <section className={styles.section}>
          <h2>{labels.summary}</h2>
          <ul className={styles.lines} style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {cart.items.map((item) => (
              <li key={item.cartItemId} className={styles.boxFoot} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                <span>
                  {item.name} · {item.size} × {item.quantity}
                </span>
                <span>{show(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className={styles.summary}>
        <h2>{labels.summary}</h2>
        <dl className={styles.amounts}>
          <div>
            <dt>{cartLabels.items}</dt>
            <dd>{show(amounts.itemsAmount)}</dd>
          </div>
          {amounts.discountAmount > 0 && (
            <div data-discount="">
              <dt>
                {cartLabels.discount} ({coupon?.code})
              </dt>
              <dd>−{show(amounts.discountAmount)}</dd>
            </div>
          )}
          <div>
            <dt>{cartLabels.shipping}</dt>
            <dd>{amounts.shippingFee === 0 ? cartLabels.free : show(amounts.shippingFee)}</dd>
          </div>
          <div data-total="">
            <dt>{cartLabels.total}</dt>
            <dd>{show(amounts.totalAmount)}</dd>
          </div>
        </dl>
        <label className={styles.check}>
          <input type="checkbox" name="agree" required />
          {labels.agree}
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button className={styles.button} data-variant="red" type="submit" disabled={busy}>
          {busy ? labels.paying : fill(labels.pay, { amount: show(amounts.totalAmount) })}
        </button>
        <p className={styles.muted}>{labels.finalNote}</p>
        {devMode && <p className={styles.muted}>{labels.devNote}</p>}
      </aside>
    </form>
  );
}

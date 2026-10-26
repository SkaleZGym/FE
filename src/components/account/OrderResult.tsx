"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { api, money, type Order } from "@/lib/client";
import styles from "./account.module.css";
import { refreshCart } from "./accountStore";
import { useMember, useSearch } from "./useMember";

type Props = { locale: Locale; labels: Dictionary["order"] };

/**
 * 결제 결과. 로컬 테스트 결제는 결제 화면이, 나이스페이는 BE returnUrl 이
 * /order/result?orderNumber=…&status=success|fail(&code=…) 로 보낸다.
 * 화면에 보이는 성공 여부는 주소가 아니라 BE 주문 상태로 정한다.
 */
export default function OrderResult({ locale, labels }: Props) {
  const account = useMember(locale);
  const query = new URLSearchParams(useSearch());
  const orderNumber = query.get("orderNumber");
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (account.status !== "member" || !orderNumber) return;
    api<Order>(`/orders/${encodeURIComponent(orderNumber)}`, { locale })
      .then(setOrder)
      .catch(() => setOrder(null));
    void refreshCart(locale);
  }, [account.status, orderNumber, locale]);

  const paid = order ? order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED" : query.get("status") === "success";

  return (
    <>
      <header className={styles.head}>
        <h1>{paid ? labels.successTitle : labels.failTitle}</h1>
        <p>{paid ? labels.successLead : labels.failLead}</p>
      </header>
      <div className={styles.result}>
        {orderNumber && (
          <dl>
            <dt>{labels.orderNumber}</dt>
            <dd>{orderNumber}</dd>
            {order && (
              <>
                <dt style={{ marginTop: 12 }}>{labels.paidTotal}</dt>
                <dd>{money(order.totalAmount, order.currency, locale)}</dd>
              </>
            )}
          </dl>
        )}
        <div className={styles.actions}>
          <a className={styles.button} href={`/${locale}/mypage`}>
            {labels.viewOrders}
          </a>
          {!paid && (
            <a className={styles.button} data-variant="ghost" href={`/${locale}/cart`}>
              {labels.backToCart}
            </a>
          )}
        </div>
      </div>
    </>
  );
}

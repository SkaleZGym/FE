"use client";

import { useState, type FormEvent } from "react";
import { sizeOrder } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { api, money, type Claim, type Order } from "@/lib/client";
import styles from "./account.module.css";
import { errorText } from "./useMember";

/** 교환·반품은 배송 완료 후 7일 안에만 (BE와 같은 규칙) */
const CLAIM_DAYS = 7;
const reasons = ["SIZE", "DEFECT", "WRONG_ITEM", "CHANGE_OF_MIND", "OTHER"] as const;

/** 주문 상품별로 이미 반품 완료된 수량 (그만큼은 다시 신청할 수 없다) */
const returnedOf = (order: Order, claims: Claim[]) => {
  const returned: Record<number, number> = {};
  for (const claim of claims) {
    if (claim.orderNumber !== order.orderNumber || claim.type !== "RETURN" || claim.status !== "COMPLETED") continue;
    for (const item of claim.items) returned[item.orderItemId] = (returned[item.orderItemId] ?? 0) + item.quantity;
  }
  return returned;
};

export const canClaim = (order: Order, claims: Claim[]) =>
  order.status === "DELIVERED" &&
  order.items.some((item) => item.quantity > (returnedOf(order, claims)[item.id] ?? 0)) &&
  order.deliveredAt !== null &&
  Date.now() - new Date(order.deliveredAt).getTime() < CLAIM_DAYS * 24 * 60 * 60 * 1000 &&
  !claims.some((claim) => claim.orderNumber === order.orderNumber && (claim.status === "REQUESTED" || claim.status === "APPROVED"));

const dateOf = (iso: string, locale: Locale) => new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });

type Labels = { claim: Dictionary["claim"]; common: Dictionary["common"] };

/** 주문 카드 아래에 펼쳐지는 신청서: 종류 → 상품·수량(교환이면 바꿀 사이즈) → 사유 → 내용 */
export function ClaimForm({
  locale,
  order,
  claims,
  labels,
  onDone,
  onClose,
}: {
  locale: Locale;
  order: Order;
  claims: Claim[];
  labels: Labels;
  onDone: (claim: Claim) => void;
  onClose: () => void;
}) {
  const text = labels.claim;
  const [type, setType] = useState<Claim["type"]>("EXCHANGE");
  const [picked, setPicked] = useState<Record<number, { quantity: number; size: string }>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const returned = returnedOf(order, claims);
  const items = order.items
    .map((item) => ({ ...item, quantity: item.quantity - (returned[item.id] ?? 0) }))
    .filter((item) => item.quantity > 0);

  const toggle = (item: Order["items"][number]) =>
    setPicked((current) => {
      const next = { ...current };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = { quantity: item.quantity, size: "" };
      return next;
    });
  const update = (id: number, change: Partial<{ quantity: number; size: string }>) =>
    setPicked((current) => ({ ...current, [id]: { ...current[id], ...change } }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const items = Object.entries(picked).map(([id, value]) => ({
      orderItemId: Number(id),
      quantity: value.quantity,
      exchangeSize: type === "EXCHANGE" ? value.size || null : null,
    }));
    if (items.length === 0) return setError(text.pickItem);
    setBusy(true);
    setError("");
    try {
      const claim = await api<Claim>("/claims", {
        method: "POST",
        locale,
        body: { orderNumber: order.orderNumber, type, reason: form.get("reason"), detail: String(form.get("detail") ?? "").trim() || null, items },
      });
      onDone(claim);
    } catch (caught) {
      setError(errorText(caught, labels.common));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} style={{ paddingTop: 14, borderTop: "1px solid var(--line)" }}>
      <div className={styles.field}>
        <span>{text.type}</span>
        <div className={styles.actions} style={{ justifyContent: "flex-start" }}>
          {(["EXCHANGE", "RETURN"] as const).map((key) => (
            <label key={key} className={styles.check}>
              <input type="radio" name="type" checked={type === key} onChange={() => setType(key)} />
              {text.types[key]}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <span>{text.items}</span>
        {items.map((item) => {
          const chosen = picked[item.id];
          return (
            <div key={item.id} style={{ display: "grid", gap: 8 }}>
              <label className={styles.check}>
                <input type="checkbox" checked={Boolean(chosen)} onChange={() => toggle(item)} />
                {item.productName} · {item.size} × {item.quantity}
              </label>
              {chosen && (
                <div className={styles.row} style={{ paddingLeft: 26 }}>
                  <select
                    className={styles.input}
                    value={chosen.quantity}
                    onChange={(event) => update(item.id, { quantity: Number(event.target.value) })}
                    aria-label={text.quantity}
                  >
                    {Array.from({ length: item.quantity }, (_, index) => index + 1).map((count) => (
                      <option key={count} value={count}>
                        {text.quantity} {count}
                      </option>
                    ))}
                  </select>
                  {type === "EXCHANGE" && (
                    <select className={styles.input} value={chosen.size} onChange={(event) => update(item.id, { size: event.target.value })} aria-label={text.exchangeSize}>
                      <option value="">{text.sameSize}</option>
                      {sizeOrder
                        .filter((size) => size !== item.size && size !== "FREE")
                        .map((size) => (
                          <option key={size} value={size}>
                            {text.exchangeSize}: {size}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <label className={styles.field}>
        <span>{text.reason}</span>
        <select className={styles.input} name="reason" defaultValue="SIZE">
          {reasons.map((key) => (
            <option key={key} value={key}>
              {text.reasons[key]}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span>{text.detail}</span>
        <textarea className={styles.input} name="detail" maxLength={1000} placeholder={text.detailPlaceholder} style={{ minHeight: 100 }} />
        <small>{text.shippingNote}</small>
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions} style={{ justifyContent: "flex-end" }}>
        <button className={styles.button} data-variant="ghost" data-size="small" type="button" onClick={onClose}>
          {text.close}
        </button>
        <button className={styles.button} data-size="small" type="submit" disabled={busy}>
          {text.submit}
        </button>
      </div>
    </form>
  );
}

const claimTone = (status: Claim["status"]) => (status === "COMPLETED" ? "done" : status === "REJECTED" ? "off" : status === "REQUESTED" ? "red" : undefined);

/** 교환·반품 탭: 신청 내역과 처리 상태 */
export function ClaimList({ locale, claims, labels }: { locale: Locale; claims: Claim[] | null; labels: Labels }) {
  const text = labels.claim;
  if (!claims) return <p className={styles.muted}>{labels.common.loading}</p>;
  if (claims.length === 0) {
    return (
      <div className={styles.empty}>
        {text.none}
        <small className={styles.muted}>{text.deadline}</small>
      </div>
    );
  }

  return (
    <div className={styles.cards}>
      {claims.map((claim) => (
        <article className={styles.box} key={claim.id}>
          <div className={styles.boxHead}>
            <span>
              <b>{text.types[claim.type]}</b> · {claim.orderNumber} · {dateOf(claim.createdAt, locale)}
            </span>
            <span className={styles.status} data-tone={claimTone(claim.status)}>
              {text.status[claim.status]}
            </span>
          </div>
          {claim.status !== "REJECTED" && <ClaimSteps status={claim.status} labels={text} />}
          <div className={styles.boxBody}>
            {claim.items.map((item) => (
              <span key={item.orderItemId}>
                {item.productName} · {item.size}
                {item.exchangeSize && ` → ${item.exchangeSize}`} × {item.quantity}
              </span>
            ))}
            <span className={styles.muted}>{text.reasons[claim.reason]}</span>
          </div>
          {claim.adminMemo && (
            <div className={styles.answer}>
              <b>{text.memo}</b>
              {claim.adminMemo}
            </div>
          )}
          {(claim.refundAmount !== null || claim.trackingUrl) && (
            <div className={styles.boxFoot}>
              {claim.refundAmount !== null && (
                <span>
                  {text.refund} {money(claim.refundAmount, claim.currency, locale)}
                </span>
              )}
              {claim.trackingUrl && (
                <a className={styles.button} data-variant="ghost" data-size="small" href={claim.trackingUrl} target="_blank" rel="noopener noreferrer">
                  {text.resend}
                </a>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

const STEPS: Claim["status"][] = ["REQUESTED", "APPROVED", "COMPLETED"];

/** 진행 단계 줄: 접수 → 승인·회수 중 → 완료 (거절은 상태 배지로만) */
function ClaimSteps({ status, labels }: { status: Claim["status"]; labels: Dictionary["claim"] }) {
  const current = STEPS.indexOf(status);
  return (
    <ol className={styles.claimSteps} aria-label={labels.status[status]}>
      {STEPS.map((step, index) => (
        <li key={step} data-done={index <= current || undefined} aria-current={index === current && status !== "COMPLETED" ? "step" : undefined}>
          {labels.status[step]}
        </li>
      ))}
    </ol>
  );
}

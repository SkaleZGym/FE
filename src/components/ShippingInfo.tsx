import { Fragment } from "react";
import { formatMoney } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getShippingPolicy, type ShippingPolicy } from "@/lib/api";
import Reveal from "./Reveal";
import styles from "./ShippingInfo.module.css";

/** BE가 꺼져 있을 때 쓰는 값 (BE 기본 설정과 같다) */
const fallback: Record<"KRW" | "USD", ShippingPolicy> = {
  KRW: { currency: "KRW", baseFee: 3_000, freeThreshold: 100_000, jejuExtraFee: 3_000, islandExtraFee: 5_000 },
  USD: { currency: "USD", baseFee: 15_00, freeThreshold: 150_00, jejuExtraFee: 0, islandExtraFee: 0 },
};

type Props = {
  locale: Locale;
  labels: Dictionary["shipping"];
};

/** 배송 안내: 기본 배송비 · 무료 배송 기준 · 제주/도서산간 추가비. 값은 BE 배송 설정(관리자에서 수정)에서 온다 */
export default async function ShippingInfo({ locale, labels }: Props) {
  const currency = locale === "ko" ? "KRW" : "USD";
  const policy = (await getShippingPolicy(locale)) ?? fallback[currency];
  // BE 금액은 최소 단위라 달러는 100으로 나눠 표시한다
  const money = (amount: number) => formatMoney(currency === "USD" ? amount / 100 : amount, currency, locale);

  // value 를 여러 개로 주면 ' / ' 사이에서만 줄이 바뀐다 (₩ 와 숫자가 갈라지지 않게)
  const stats: { label: string; value: string | string[] }[] = [
    { label: labels.base, value: money(policy.baseFee) },
    {
      label: labels.free,
      value: policy.freeThreshold == null ? labels.noFree : labels.freeValue.replace("{amount}", money(policy.freeThreshold)),
    },
  ];
  // 국내(원화)만 제주·도서산간 추가비가 있다
  if (policy.jejuExtraFee > 0 || policy.islandExtraFee > 0) {
    stats.push({
      label: labels.remote,
      value: [`+${money(policy.jejuExtraFee)}`, `+${money(policy.islandExtraFee)}`],
    });
  }

  return (
    <section className={styles.shipping} id="shipping">
      <div className={styles.head}>
        <h2>{labels.title}</h2>
      </div>
      <dl className={styles.stats}>
        {stats.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 80}>
            <div className={styles.stat}>
              <dt>{stat.label}</dt>
              <dd>
                {(Array.isArray(stat.value) ? stat.value : [stat.value]).map((part, partIndex) => (
                  <Fragment key={part + partIndex}>
                    {partIndex > 0 && " / "}
                    <span className={styles.part}>{part}</span>
                  </Fragment>
                ))}
              </dd>
              {stat.label === labels.remote && <small>{labels.remoteNote}</small>}
            </div>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}

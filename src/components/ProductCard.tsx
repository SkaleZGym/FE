"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./ProductCard.module.css";

/** 서버에서 언어·통화에 맞게 가공해서 넘기는 카드 데이터 */
export type CardData = {
  id: number;
  image: string;
  name: string;
  /** 핏 · 카테고리 (예: 오버핏 · GYMWEAR) */
  sub: string;
  price: string;
  listPrice?: string;
  sizes: string[];
  soldOut: boolean;
  badge?: { label: string; tone?: "red" };
};

type Props = {
  product: CardData;
  labels: { add: string; restock: string; wish: string };
};

/** 12번 시안의 흰 상품 카드: 사진 · 뱃지 · 이름 · 핏 · 가격 · 사이즈 · 담기/찜 */
export default function ProductCard({ product, labels }: Props) {
  const [wished, setWished] = useState(false);

  return (
    <article className={styles.card} data-soldout={product.soldOut || undefined}>
      <a href="#" className={styles.image}>
        <Image src={product.image} alt={product.name} fill sizes="(max-width: 560px) 50vw, (max-width: 1100px) 45vw, 22vw" />
        {product.badge && (
          <span className={styles.badge} data-tone={product.badge.tone}>
            {product.badge.label}
          </span>
        )}
      </a>
      <h3 className={styles.name}>{product.name}</h3>
      <div className={styles.sub}>{product.sub}</div>
      <div className={styles.price} data-sale={product.listPrice ? "" : undefined}>
        {product.price}
        {product.listPrice && <s>{product.listPrice}</s>}
      </div>
      <div className={styles.sizes}>
        {product.sizes.map((size) => (
          <span key={size}>{size}</span>
        ))}
      </div>
      <div className={styles.row}>
        <button type="button" className={styles.add}>
          {product.soldOut ? labels.restock : labels.add}
        </button>
        <button type="button" className={styles.heart} aria-pressed={wished} aria-label={labels.wish} onClick={() => setWished((w) => !w)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
          </svg>
        </button>
      </div>
    </article>
  );
}

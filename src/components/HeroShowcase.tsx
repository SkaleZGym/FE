"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { openProduct } from "./productEvents";
import styles from "./HeroShowcase.module.css";

/**
 * 히어로 슬라이드 한 장. 관리자 배너(MAIN_HERO)로 만든 장은 href(연결 상품)로 가고,
 * 올린 사진을 그대로 쓴다(remote). 배너가 없으면 기본 상품 목록으로 돌린다
 */
export type ShowcaseItem = { id: number; image: string; name: string; line: string; price: string; listPrice?: string; href?: string; remote?: boolean };

type Props = { items: ShowcaseItem[]; labels: { prev: string; next: string } };

const INTERVAL = 5000;
const pad = (n: number) => String(n).padStart(2, "0");

/** 히어로 오른쪽: 대표 상품 사진이 5초마다 바뀐다 (빛나는 원 위에 떠 있고, 바뀔 때 옆으로 밀려 나간다) */
export default function HeroShowcase({ items, labels }: Props) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [round, setRound] = useState(0); // 진행 막대 애니메이션을 처음부터 다시 돌리기 위한 키

  const go = (next: number) => {
    setLeaving(index);
    setIndex((next + items.length) % items.length);
    setRound((r) => r + 1);
  };

  useEffect(() => {
    const id = setInterval(() => {
      setLeaving(index);
      setIndex((index + 1) % items.length);
      setRound((r) => r + 1);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [index, items.length]);

  useEffect(() => {
    if (leaving === null) return;
    const id = setTimeout(() => setLeaving(null), 900);
    return () => clearTimeout(id);
  }, [leaving]);

  const current = items[index];

  return (
    <>
      <div className={styles.prod}>
        {items.map((item, i) => (
          <Image
            key={item.id}
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 860px) 90vw, 45vw"
            priority={i === 0}
            unoptimized={item.remote}
            data-state={i === index ? "on" : i === leaving ? "off" : undefined}
          />
        ))}
      </div>
      <div className={styles.nav}>
        <button type="button" aria-label={labels.prev} onClick={() => go(index - 1)}>
          ‹
        </button>
        <span>
          {pad(index + 1)} / {pad(items.length)}
        </span>
        <div className={styles.bar}>
          <i key={round} />
        </div>
        <button type="button" aria-label={labels.next} onClick={() => go(index + 1)}>
          ›
        </button>
      </div>
      <InfoTag item={current}>
        <small>{current.line}</small>
        <b>{current.name}</b>
        <span className={styles.price}>
          {current.price}
          {current.listPrice && <s>{current.listPrice}</s>}
        </span>
      </InfoTag>
    </>
  );
}

/** 지금 상품 이름·가격: 연결 상품이 있으면 링크, 아니면 상품 정보 패널을 연다 */
function InfoTag({ item, children }: { item: ShowcaseItem; children: React.ReactNode }) {
  if (item.href) {
    return (
      <a className={styles.info} href={item.href}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={styles.info} onClick={() => openProduct(item.id)}>
      {children}
    </button>
  );
}

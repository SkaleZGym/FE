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

/**
 * 히어로 오른쪽: 룩북 한 장처럼 평평한 판 위에 대표 상품 사진을 올리고, 아래 줄에 이름·가격과 넘기기를 둔다.
 * 사진은 5초마다 바뀐다. 판은 테마와 상관없이 밝은 색이라(어두운 옷이 잘 보이게) 안쪽은 밝은 구역(data-zone="light")
 */
export default function HeroShowcase({ items, labels }: Props) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [round, setRound] = useState(0); // 진행 막대 애니메이션을 처음부터 다시 돌리기 위한 키
  const many = items.length > 1;

  const go = (next: number) => {
    setLeaving(index);
    setIndex((next + items.length) % items.length);
    setRound((r) => r + 1);
  };

  useEffect(() => {
    if (items.length < 2) return;
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
    <div className={styles.plate} data-zone="light">
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
      <div className={styles.caption}>
        <InfoTag item={current}>
          {current.line && <small>{current.line}</small>}
          <b>{current.name}</b>
          {current.price && (
            <span className={styles.price}>
              {current.price}
              {current.listPrice && <s>{current.listPrice}</s>}
            </span>
          )}
        </InfoTag>
        {many && (
          <div className={styles.nav}>
            <button type="button" aria-label={labels.prev} onClick={() => go(index - 1)}>
              ‹
            </button>
            <span>
              {pad(index + 1)} / {pad(items.length)}
            </span>
            <button type="button" aria-label={labels.next} onClick={() => go(index + 1)}>
              ›
            </button>
          </div>
        )}
      </div>
      {many && (
        <div className={styles.bar} aria-hidden="true">
          <i key={round} />
        </div>
      )}
    </div>
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

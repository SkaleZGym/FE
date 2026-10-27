"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { openProduct } from "./productEvents";
import Reveal from "./Reveal";
import styles from "./ProductShelf.module.css";

/** 서버에서 언어·통화에 맞게 가공해서 넘기는 카드 데이터 */
export type ShelfItem = {
  id: number;
  image: string;
  name: string;
  badges: string[];
  price: string;
  listPrice?: string;
  soldOut: boolean;
};

type Props = {
  /** 섹션 앵커 (#best 등) */
  id: string;
  /** 세로로 세우는 큰 제목. 예: BESTSELLER */
  title: string;
  /** 제목 옆 작은 글씨. 예: [ 01 · MOST WANTED ] */
  /** true면 제목이 오른쪽 */
  flip?: boolean;
  /** true면 카드에 01, 02 … 순위 */
  ranked?: boolean;
  items: ShelfItem[];
  moreHref: string;
  labels: { viewAll: string; more: string; quickAdd: string; restock: string; soldOut: string; sale: string };
};

/**
 * 13번 시안의 세로 제목 상품 섹션.
 * 큰 제목이 세로로 서 있다가 스크롤하는 만큼 아래에서 위로(모바일은 왼쪽에서 오른쪽으로) 채워진다.
 * 카드 7개 + 마지막 칸 "전체 보기". 카드를 누르면 상품 정보 패널이 열린다.
 */
export default function ProductShelf({ id, title, flip, ranked, items, moreHref, labels }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const heading = titleRef.current;
    if (!section || !heading) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (rect.height * 0.8)));
      heading.style.setProperty("--fill", `${(progress * 100).toFixed(1)}%`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.shelf} data-flip={flip || undefined} id={id}>
      <div className={styles.titleCol}>
        <h2 ref={titleRef}>{title}</h2>
        <a href={moreHref}>{labels.viewAll} →</a>
      </div>

      <div className={styles.grid}>
        {items.map((item, index) => (
          <Reveal key={item.id} delay={(index % 4) * 70}>
            <a
              className={styles.card}
              href={`#product-${item.id}`}
              data-soldout={item.soldOut || undefined}
              onClick={(event) => {
                event.preventDefault();
                openProduct(item.id);
              }}
            >
              <span className={styles.image}>
                <Image src={item.image} alt="" fill sizes="(max-width: 860px) 50vw, (max-width: 1100px) 30vw, 20vw" />
                {ranked && <span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span>}
                {item.soldOut ? (
                  <span className={styles.tag}>{labels.soldOut}</span>
                ) : (
                  item.listPrice && <span className={styles.tag} data-tone="red">{labels.sale}</span>
                )}
                <span className={styles.quick}>{item.soldOut ? labels.restock : labels.quickAdd}</span>
              </span>
              <span className={styles.name}>{item.name}</span>
              {item.badges.length > 0 && (
                <span className={styles.badges}>
                  {item.badges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </span>
              )}
              <span className={styles.price} data-sale={item.listPrice ? "" : undefined}>
                {item.price}
                {item.listPrice && <s>{item.listPrice}</s>}
              </span>
            </a>
          </Reveal>
        ))}
        <Reveal delay={210} className={styles.moreCell}>
          <a className={styles.more} href={moreHref}>
            <span>
              {labels.more} <i>→</i>
            </span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}

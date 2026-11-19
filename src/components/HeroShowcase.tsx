"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { openProduct } from "./productEvents";
import { scaleWipe } from "./scaleTransition";
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
 * 사진의 바탕색을 읽는다 (네 귀퉁이 색이 서로 같고 밝을 때만). 상품 사진은 대개 밝은 단색 배경이라,
 * 판을 그 색으로 칠하면 사진과 판의 경계가 사라져 한 장의 스튜디오 사진처럼 보인다.
 * 배경을 지운(투명) 사진이나 배경이 어둡거나 얼룩덜룩한 사진은 null → 판의 기본 색을 쓴다.
 * 다른 주소의 사진은 캔버스로 못 읽어서, 같은 주소로 나가는 작은 사본(/_next/image)을 읽는다
 */
function readTone(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!/^https?:/.test(src)) return resolve(null);
    const probe = new window.Image();
    probe.onerror = () => resolve(null);
    probe.onload = () => {
      try {
        const w = probe.naturalWidth;
        const h = probe.naturalHeight;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const context = canvas.getContext("2d");
        if (!context || w < 4 || h < 4) return resolve(null);
        context.drawImage(probe, 0, 0);
        const corners = [
          [1, 1],
          [w - 2, 1],
          [1, h - 2],
          [w - 2, h - 2],
        ].map(([x, y]) => context.getImageData(x, y, 1, 1).data);
        if (corners.some((pixel) => pixel[3] < 250)) return resolve(null); // 투명 배경
        const channel = (i: number) => corners.map((pixel) => pixel[i]);
        const spread = Math.max(...[0, 1, 2].map((i) => Math.max(...channel(i)) - Math.min(...channel(i))));
        const [r, g, b] = [0, 1, 2].map((i) => Math.round(channel(i).reduce((sum, v) => sum + v, 0) / 4));
        const light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        resolve(spread <= 16 && light >= 0.72 ? `rgb(${r} ${g} ${b})` : null);
      } catch {
        resolve(null);
      }
    };
    probe.src = `/_next/image?url=${encodeURIComponent(src)}&w=64&q=75`;
  });
}

/**
 * 히어로 오른쪽: 룩북 한 장처럼 평평한 판 위에 대표 상품 사진을 올리고, 아래 줄에 이름·가격과 넘기기를 둔다.
 * 사진은 5초마다 바뀌고, 바뀔 때 새 사진이 비늘이 돋듯 위에서부터 덮인다 (나이트·라이트 전환과 같은 비늘 쓸기).
 * 판은 테마와 상관없이 밝은 색이라(어두운 옷이 잘 보이게) 안쪽은 밝은 구역(data-zone="light")
 */
export default function HeroShowcase({ items, labels }: Props) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [round, setRound] = useState(0); // 진행 막대 애니메이션을 처음부터 다시 돌리기 위한 키
  const [tones, setTones] = useState<Record<string, string | null>>({}); // 사진마다 읽은 바탕색
  const many = items.length > 1;
  const prodRef = useRef<HTMLDivElement>(null);
  const shown = useRef(0); // 지금 화면에 다 그려진 사진 (처음 사진에는 비늘 효과를 주지 않는다)

  // 사진 바탕색을 한 번씩 읽어 둔다 (읽기 전·못 읽으면 판의 기본 색)
  useEffect(() => {
    let alive = true;
    for (const item of items) {
      void readTone(item.image).then((tone) => {
        if (alive) setTones((known) => (item.image in known ? known : { ...known, [item.image]: tone }));
      });
    }
    return () => {
      alive = false;
    };
  }, [items]);

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
    const id = setTimeout(() => setLeaving(null), 1500);
    return () => clearTimeout(id);
  }, [leaving]);

  // 사진이 바뀌면 새 사진을 비늘 쓸기로 드러낸다 (움직임 줄이기 설정에서는 바로 바뀐다)
  useEffect(() => {
    if (shown.current === index) return;
    shown.current = index;
    const image = prodRef.current?.querySelector<HTMLImageElement>("img[data-state=\"on\"]");
    if (!image || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = image.getBoundingClientRect();
    const { frames, duration } = scaleWipe(box.width, box.height);
    const animation = image.animate({ clipPath: frames }, { duration, easing: "linear" });
    return () => animation.cancel();
  }, [index]);

  const current = items[index];

  return (
    <div className={styles.plate} data-zone="light" style={tones[current.image] ? { backgroundColor: tones[current.image] ?? undefined } : undefined}>
      <div ref={prodRef} className={styles.prod}>
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
            // 사진 둘레 여백까지 그 사진의 바탕색으로 칠해서, 비늘이 덮을 때 새 면이 통째로 드러난다
            style={{ backgroundColor: tones[item.image] ?? undefined }}
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

"use client";

import Image from "next/image";
import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import styles from "./CategoryPanels.module.css";

export type CategoryPanel = { key: string; href: string; image: string; title: string; small: string };

/**
 * 메인 '카테고리' 칸: 가로로 나란한 세로 패널. 고른 패널이 넓게 펼쳐지고 나머지는 좁은 띠(세로 글자)로 접힌다.
 * PC: 마우스를 올리면 펼쳐지고 누르면 그 카테고리로 간다.
 * 휴대폰(손가락): 접힌 패널을 누르면 먼저 펼쳐지고, 펼쳐진 패널을 누르면 이동한다.
 * 키보드: 패널에 초점이 가면 펼쳐지고 Enter 로 이동한다.
 * 세로로 쌓던 예전 타일보다 휴대폰에서 훨씬 짧다 (한 화면 높이 안).
 */
export default function CategoryPanels({ panels }: { panels: CategoryPanel[] }) {
  const [active, setActive] = useState(0);
  // 손가락으로 누를 때 브라우저가 누름 직전에 '마우스 올림'·초점까지 흉내 내서 패널이 먼저 펼쳐져 버린다.
  // 그래서 누르기 시작한 순간(pointerdown)에 그 패널이 이미 펼쳐져 있었는지를 적어 두고, 그걸로 이동할지 정한다
  const touchOpened = useRef<{ index: number; wasActive: boolean } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLAnchorElement>, index: number) => {
    touchOpened.current = event.pointerType === "mouse" ? null : { index, wasActive: index === active };
  };

  const onClick = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    const touch = touchOpened.current;
    touchOpened.current = null;
    if (touch && touch.index === index && !touch.wasActive) {
      event.preventDefault(); // 첫 번째 누름은 펼치기만
      setActive(index);
    }
  };

  return (
    <div className={styles.panels}>
      {panels.map((panel, index) => (
        <a
          key={panel.key}
          href={panel.href}
          className={styles.panel}
          data-active={index === active || undefined}
          aria-current={index === active ? "true" : undefined}
          onPointerEnter={(event) => event.pointerType === "mouse" && setActive(index)}
          onPointerDown={(event) => onPointerDown(event, index)}
          onFocus={() => setActive(index)}
          onClick={(event) => onClick(event, index)}
        >
          <Image src={panel.image} alt="" fill sizes="(max-width: 860px) 70vw, 55vw" className={styles.image} />
          <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
          {/* 접혔을 때: 아래에서 위로 읽는 세로 글자 */}
          <span className={styles.vertical} aria-hidden="true">
            {panel.title}
          </span>
          {/* 펼쳤을 때: 큰 제목 + 한 줄 + 화살표 */}
          <span className={styles.content}>
            <span className={styles.text}>
              <small>{panel.small}</small>
              <b>{panel.title}</b>
            </span>
            <span className={styles.go} aria-hidden="true">
              →
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}

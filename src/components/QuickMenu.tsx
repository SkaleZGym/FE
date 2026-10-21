"use client";

import { useEffect, useState } from "react";
import { kakaoChannelUrl } from "@/data/catalog";
import styles from "./QuickMenu.module.css";

type Props = {
  labels: { title: string; cart: string; wish: string; chat: string; top: string };
};

/** 화면 오른쪽 아래에 떠 있는 퀵메뉴. 맨 위로 버튼은 조금 내려왔을 때만 보인다 */
export default function QuickMenu({ labels }: Props) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={styles.quick} aria-label={labels.title}>
      <a href="#" className={styles.item}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
        <span>{labels.cart}</span>
      </a>
      <a href="#" className={styles.item}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        </svg>
        <span>{labels.wish}</span>
      </a>
      <a href={kakaoChannelUrl} target="_blank" rel="noopener noreferrer" className={styles.item}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4c4.97 0 9 3.13 9 7s-4.03 7-9 7c-.7 0-1.38-.06-2.03-.18L6 20l.9-3.4C4.5 15.3 3 13.3 3 11c0-3.87 4.03-7 9-7Z" />
        </svg>
        <span>{labels.chat}</span>
      </a>
      <button
        type="button"
        className={styles.item}
        data-hidden={!showTop || undefined}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
        <span>{labels.top}</span>
      </button>
    </nav>
  );
}

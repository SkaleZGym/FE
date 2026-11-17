"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { kakaoChannelUrl } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import styles from "./QuickMenu.module.css";
import { switchTheme, useTheme } from "./ThemeToggle";

type Props = {
  locale: Locale;
  labels: { title: string; cart: string; wish: string; chat: string; top: string; theme: string };
  /** 인트로가 끝날 때까지 숨겼다가, 인트로 스크립트가 이 요소에 올리는 --qv/--nav 값에 맞춰 나타난다 */
  introDim?: boolean;
};

type Item = { key: string; label: string; icon: ReactNode; className?: string; href?: string; external?: boolean; onClick?: () => void; switchOn?: boolean };

/**
 * 화면 오른쪽 아래에 떠 있는 퀵메뉴. 평소에는 동그란 버튼 하나이고, 누르면 그 위로 동그란 버튼들이
 * 가까운 것부터 차례로 촤라락 올라온다 (다시 누르거나, 바깥을 누르거나, Esc 로 접힌다).
 * 맨 위로 버튼은 조금 내려왔을 때만, 나이트·라이트 버튼은 휴대폰에서만 (PC는 헤더에 토글이 있다)
 */
export default function QuickMenu({ locale, labels, introDim = false }: Props) {
  const [open, setOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const theme = useTheme();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 펼쳐져 있을 때: 바깥을 누르거나 Esc 를 누르면 접는다
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 위에서 아래 순서. 펼칠 때는 아래(동그란 버튼에 가까운 것)부터 올라온다
  const items: Item[] = [
    {
      key: "theme",
      label: labels.theme,
      className: styles.theme,
      onClick: switchTheme, // 테마를 바꿔도 메뉴는 펼친 채로 (몇 번 눌러 비교해 보게)
      switchOn: theme === "light",
      // 지금이 나이트면 해, 라이트면 달 — 누르면 그쪽으로 바뀐다는 뜻
      icon: (
        <>
          <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.sun}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
          </svg>
          <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.moon}>
            <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2Z" />
          </svg>
        </>
      ),
    },
    {
      key: "cart",
      label: labels.cart,
      href: `/${locale}/cart`,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      ),
    },
    {
      key: "wish",
      label: labels.wish,
      href: `/${locale}/wishlist`,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        </svg>
      ),
    },
    {
      key: "chat",
      label: labels.chat,
      href: kakaoChannelUrl,
      external: true,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4c4.97 0 9 3.13 9 7s-4.03 7-9 7c-.7 0-1.38-.06-2.03-.18L6 20l.9-3.4C4.5 15.3 3 13.3 3 11c0-3.87 4.03-7 9-7Z" />
        </svg>
      ),
    },
    ...(showTop
      ? [
          {
            key: "top",
            label: labels.top,
            onClick: () => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setOpen(false);
            },
            icon: (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 19V5M6 11l6-6 6 6" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  return (
    <nav ref={navRef} className={styles.quick} aria-label={labels.title} data-open={open || undefined} data-intro-quick={introDim || undefined}>
      <div id="quick-menu-list" className={styles.list} inert={!open}>
        {items.map((item, index) => {
          // --i: 동그란 버튼에서 몇 번째 위인지 (0 = 바로 위). 펼칠 때 이 순서로 늦게 나온다
          const style = { "--i": items.length - 1 - index } as CSSProperties;
          const className = `${styles.item} ${item.className ?? ""}`;
          const body = (
            <>
              {item.icon}
              <span>{item.label}</span>
            </>
          );
          if (item.href) {
            return (
              <a
                key={item.key}
                href={item.href}
                className={className}
                style={style}
                aria-label={item.label}
                {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                onClick={() => setOpen(false)}
              >
                {body}
              </a>
            );
          }
          return (
            <button
              key={item.key}
              type="button"
              className={className}
              style={style}
              aria-label={item.label}
              {...(item.switchOn === undefined ? {} : { role: "switch", "aria-checked": item.switchOn })}
              onClick={item.onClick}
            >
              {body}
            </button>
          );
        })}
      </div>

      <button type="button" className={styles.fab} aria-expanded={open} aria-controls="quick-menu-list" aria-label={labels.title} onClick={() => setOpen((value) => !value)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </nav>
  );
}

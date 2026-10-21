"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import LanguageSwitcher from "./LanguageSwitcher";
import styles from "./SiteHeader.module.css";

type Props = {
  locale: Locale;
  logo: string;
  nav: { label: string; href: string }[];
  labels: { cart: string; language: string; menu: string; close: string };
};

/** 히어로 위에서는 투명, 스크롤하면 배경이 생기는 고정 헤더 */
export default function SiteHeader({ locale, logo, nav, labels }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <>
      <header className={styles.header} data-scrolled={scrolled || menuOpen || undefined}>
        <a href={`/${locale}`} className={styles.logo} aria-label="SKALEZ">
          <Image src={logo} alt="SKALEZ" width={122} height={24} priority />
        </a>

        <nav className={styles.nav}>
          {nav.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <LanguageSwitcher current={locale} label={labels.language} />
          <a href="#" className={styles.cart}>
            {labels.cart} <span>(0)</span>
          </a>
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? labels.close : labels.menu}
          </button>
        </div>
      </header>

      {/* 헤더의 backdrop-filter 안에 두면 position: fixed가 헤더 크기로 갇혀서 바깥에 둔다 */}
      <nav className={styles.drawer} data-open={menuOpen || undefined} inert={!menuOpen}>
        {nav.map((item, index) => (
          <a
            key={item.label}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            style={{ transitionDelay: menuOpen ? `${80 + index * 50}ms` : "0ms" }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.label}
          </a>
        ))}
      </nav>
    </>
  );
}

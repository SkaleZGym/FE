"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { useAccount } from "./account/accountStore";
import LanguageSwitcher from "./LanguageSwitcher";
import styles from "./SiteHeader.module.css";

export type HeaderLabels = { cart: string; search: string; language: string; menu: string; close: string; login: string; my: string };

type Props = {
  locale: Locale;
  logo: string;
  nav: { label: string; href: string }[];
  labels: HeaderLabels;
  /** 비늘 인트로가 끝날 때까지 숨겼다가, 인트로 스크립트가 :root에 올리는 --hdr 값에 맞춰 나타난다 */
  introDim?: boolean;
};

/** 히어로 위에서는 투명, 스크롤하면 배경이 생기는 고정 헤더 */
export default function SiteHeader({ locale, logo, nav, labels, introDim = false }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const account = useAccount(locale);
  const member = account.status === "member";
  const accountLink = { label: member ? labels.my : labels.login, href: member ? `/${locale}/mypage` : `/${locale}/login` };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    if (!menuOpen) return;
    // 키보드: Esc 로 메뉴를 닫는다
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <header className={styles.header} data-scrolled={scrolled || menuOpen || undefined} data-intro-dim={introDim || undefined}>
        <a href={`/${locale}`} className={styles.logo} aria-label="SKALEZ">
          <Image src={logo} alt="SKALEZ" width={140} height={28} priority data-intro-logo="" />
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
          <a href={`/${locale}/search`} className={styles.search}>
            {labels.search}
          </a>
          <a href={accountLink.href} className={styles.account} data-ready={account.status !== "loading" || undefined}>
            {accountLink.label}
          </a>
          <a href={`/${locale}/cart`} className={styles.cart}>
            {labels.cart} <span>({account.cartCount})</span>
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
        <a href={`/${locale}/search`} className={styles.drawerAccount} onClick={() => setMenuOpen(false)}>
          {labels.search}
        </a>
        <a href={accountLink.href} className={styles.drawerAccount} onClick={() => setMenuOpen(false)}>
          {accountLink.label}
        </a>
      </nav>
    </>
  );
}

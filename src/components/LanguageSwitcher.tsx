"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { localeCookie, localeLabels, locales, type Locale } from "@/i18n/config";
import styles from "./LanguageSwitcher.module.css";

type Props = { current: Locale; label: string };

/** 언어를 바꾸면 페이지를 새로 여는데, 보던 위치를 기억했다가 같은 자리로 돌려놓는다 (메인 인트로부터 다시 시작하지 않게) */
const SCROLL_KEY = "skz.lang-scroll";

export default function LanguageSwitcher({ current, label }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let saved: { path: string; y: number } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? "null");
      sessionStorage.removeItem(SCROLL_KEY);
    } catch {}
    if (!saved || saved.path !== window.location.pathname) return;
    const y = saved.y;
    const restore = () => scrollTo({ top: y, behavior: "instant" });
    // 사진이 늦게 들어와 페이지 길이가 바뀌어도 맞도록 한 번 더
    const frame = requestAnimationFrame(restore);
    const later = setTimeout(restore, 400);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(later);
    };
  }, []);

  function change(next: Locale) {
    // 다음 방문 때도 고른 언어로 열리도록 1년간 기억
    document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
    const rest = pathname.split("/").slice(2).join("/");
    const target = `/${next}${rest ? `/${rest}` : ""}`;
    try {
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ path: target, y: scrollY }));
    } catch {}
    router.push(target + window.location.search, { scroll: false });
  }

  return (
    <label className={styles.switcher}>
      <span className={styles.srOnly}>{label}</span>
      <select
        className={styles.select}
        value={current}
        onChange={(event) => change(event.target.value as Locale)}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeLabels[locale]}
          </option>
        ))}
      </select>
    </label>
  );
}

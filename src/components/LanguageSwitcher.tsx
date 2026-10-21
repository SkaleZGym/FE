"use client";

import { usePathname, useRouter } from "next/navigation";
import { localeCookie, localeLabels, locales, type Locale } from "@/i18n/config";
import styles from "./LanguageSwitcher.module.css";

type Props = { current: Locale; label: string };

export default function LanguageSwitcher({ current, label }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  function change(next: Locale) {
    // 다음 방문 때도 고른 언어로 열리도록 1년간 기억
    document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
    const rest = pathname.split("/").slice(2).join("/");
    router.push(`/${next}${rest ? `/${rest}` : ""}`);
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

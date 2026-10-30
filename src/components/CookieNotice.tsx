"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import styles from "./CookieNotice.module.css";

const KEY = "skz.cookie-notice"; // 쿠키 정책 문서의 '브라우저 저장소' 항목과 맞춘다

type Props = { locale: Locale; labels: { text: string; policy: string; accept: string } };

/**
 * 쿠키 안내 띠. 지금은 꼭 필요한 쿠키만 써서 동의를 받는 대신 알리기만 한다 (분석·광고 쿠키를 붙이면 동의 받는 배너로 바꿔야 한다).
 * '확인'을 누르면 다시 보이지 않는다
 */
export default function CookieNotice({ locale, labels }: Props) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    try {
      // 저장소는 브라우저에만 있어서 화면이 뜬 뒤 읽는다
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(localStorage.getItem(KEY) !== "1");
    } catch {
      setShown(true);
    }
  }, []);

  if (!shown) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // 저장이 안 되는 브라우저면 이번에만 닫는다
    }
    setShown(false);
  };

  return (
    <aside className={styles.notice} role="region" aria-label={labels.policy}>
      <p>
        {labels.text} <a href={`/${locale}/cookies`}>{labels.policy}</a>
      </p>
      <button type="button" onClick={accept}>
        {labels.accept}
      </button>
    </aside>
  );
}

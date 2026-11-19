"use client";

import { useEffect, useSyncExternalStore } from "react";
import { scaleTransition } from "./scaleTransition";
import styles from "./ThemeToggle.module.css";

/** 손님이 고른 화면 색. 브라우저에만 저장한다 (쿠키 정책 '브라우저 저장소'에 적어 둠) */
export const THEME_KEY = "skz.theme";
type Theme = "night" | "light";

/**
 * 화면이 그려지기 전에 <html data-theme> 를 정한다 (layout 의 <head> 에 그대로 넣는 스크립트).
 * 고른 값이 있으면 그 값, 없으면 기기 설정(다크 모드가 아니면 라이트). 여기서 정해야 처음에 다른 색이 번쩍이지 않는다
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="night")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"night";document.documentElement.dataset.theme=t}catch(e){}})()`;

const readTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "night");

/** <html data-theme> 가 바뀌면 알려 준다 (토글이 여러 개여도, 기기 설정이 바뀌어도 같이 움직이게) */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** 나이트 ↔ 라이트 바꾸기 (비늘 쓸기 효과와 함께). 헤더 토글과 휴대폰 퀵메뉴 버튼이 같이 쓴다 */
export function switchTheme() {
  const root = document.documentElement;
  const next: Theme = readTheme() === "light" ? "night" : "light";
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {}
  // 비늘이 위에서 아래로 한 줄씩 돋아나며 새 색을 드러낸다 (components/scaleTransition)
  scaleTransition(() => {
    root.dataset.theme = next;
  });
}

/** 지금 테마 (서버에서 그릴 때는 나이트로 친다). 바뀌면 다시 그린다 */
export const useTheme = () => useSyncExternalStore(subscribe, readTheme, (): Theme => "night");

/** 나이트 ↔ 라이트 토글. 손잡이 위치와 아이콘은 CSS 가 <html data-theme> 를 보고 정한다 (서버가 그린 화면과 어긋나지 않게) */
export default function ThemeToggle({ label }: { label: string }) {
  const theme = useTheme();

  // 아직 고른 적이 없는 손님은 기기 설정(다크 모드)을 바꾸면 따라간다
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: light)");
    const follow = () => {
      try {
        if (localStorage.getItem(THEME_KEY)) return;
      } catch {}
      document.documentElement.dataset.theme = media.matches ? "light" : "night";
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  return (
    <button type="button" className={styles.toggle} role="switch" aria-checked={theme === "light"} aria-label={label} title={label} onClick={switchTheme}>
      <span className={styles.knob} aria-hidden="true">
        <svg className={styles.moon} viewBox="0 0 24 24">
          <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2Z" />
        </svg>
        <svg className={styles.sun} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
        </svg>
      </span>
    </button>
  );
}

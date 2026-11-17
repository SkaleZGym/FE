"use client";

import { useEffect, useSyncExternalStore } from "react";
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
  const apply = () => {
    root.dataset.theme = next;
  };
  // 화면 전환(View Transition)을 모르는 브라우저, '움직임 줄이기'를 켠 손님은 효과 없이 바로 바꾼다
  if (typeof document.startViewTransition !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    apply();
    return;
  }
  // 비늘이 위에서 아래로 한 줄씩 돋아나며 새 색을 드러낸다 (SKALEZ = scales). 준비는 globals.css 의 [data-theme-wipe]
  const { frames, duration } = scaleWipe(window.innerWidth, window.innerHeight);
  root.dataset.themeWipe = "";
  const done = () => {
    delete root.dataset.themeWipe;
  };
  const transition = document.startViewTransition(apply);
  transition.ready.then(
    () => {
      root.animate({ clipPath: frames }, { duration, easing: "linear", fill: "both", pseudoElement: "::view-transition-new(root)" });
    },
    () => {},
  );
  transition.finished.then(done, done);
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * 비늘 쓸기의 clip-path 키프레임. 화면을 기왓장처럼 겹친 비늘 격자로 덮고(짝수·홀수 줄이 반 칸씩 어긋난다),
 * 윗줄부터 차례로 비늘이 윗줄 밑에서 돋아나 다 자라면 화면이 새 색으로 덮인다. 물결처럼 줄마다 살짝 굽이친다.
 * 키프레임마다 비늘 수·순서가 같아야 브라우저가 사이를 부드럽게 이어 준다 (path 보간).
 * 비늘 크기는 화면 폭에 맞춰서(가로 약 16개) 큰 화면에서도 개수가 늘지 않는다
 */
function scaleWipe(width: number, height: number) {
  const w = Math.max(52, width / 16); // 비늘 너비
  const rowH = w * 0.42; // 줄 간격
  const radius = w * 0.53; // 옆 비늘과 살짝 겹쳐 빈틈이 없게
  const cols = Math.ceil(width / w) + 1;
  const rows = Math.ceil(height / rowH) + 1;
  const GROW = 8; // 비늘 하나가 다 자라는 동안 지나가는 줄 수
  const WAVE = 2.2; // 굽이치는 깊이 (줄 수)
  const steps = Math.ceil(rows + GROW + WAVE * 2);
  const frames: string[] = [];
  for (let step = 0; step <= steps; step++) {
    let d = "";
    for (let row = 0; row < rows; row++) {
      const top = round((row - 1) * rowH);
      const shift = row % 2 ? w / 2 : 0;
      for (let col = 0; col < cols; col++) {
        const start = row + WAVE * (1 + Math.sin((col / cols) * Math.PI * 2 + row * 0.12));
        const u = Math.min(1, Math.max(0, (step - start) / GROW));
        const size = u * u * (3 - 2 * u); // 천천히 돋기 시작해 가운데서 빨라지고 끝에서 느려진다 (자라는 비늘이 여러 줄 보이게)
        const half = round(radius * size);
        // 윗변 → 오른쪽 변 → 둥근 아랫변 → 닫기
        d += `M${round(col * w + shift - radius * size)} ${top}h${half * 2}v${round(rowH * size)}a${half} ${half} 0 0 1 ${-half * 2} 0z`;
      }
    }
    frames.push(`path("${d}")`);
  }
  return { frames, duration: Math.min(1300, Math.max(900, steps * 26)) };
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

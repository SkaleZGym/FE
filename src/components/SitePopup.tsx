"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { SiteBanner } from "@/lib/api";
import { localHref } from "@/lib/links";
import styles from "./SitePopup.module.css";

type Props = {
  locale: Locale;
  banners: SiteBanner[];
  labels: { close: string; hideToday: string };
};

const HIDE_KEY = "skz.popup.hidden";
const today = () => new Date().toLocaleDateString("sv"); // 2026-10-26

/** '오늘 하루 보지 않기'를 누른 팝업 번호들 (오늘 날짜만 유효) */
function hiddenToday(): number[] {
  try {
    const saved = JSON.parse(localStorage.getItem(HIDE_KEY) ?? "null") as { date: string; ids: number[] } | null;
    return saved?.date === today() ? saved.ids : [];
  } catch {
    return [];
  }
}

/**
 * 관리자에서 켠 팝업. 메인 화면에서는 인트로가 끝난 뒤(헤더에 data-intro-done이 붙은 뒤)에 띄워
 * 인트로 연출을 가리지 않는다. 인트로 코드는 건드리지 않고 그 표시만 지켜본다.
 */
export default function SitePopup({ locale, banners, labels }: Props) {
  const pathname = usePathname();
  const isMain = pathname === `/${locale}`;
  const [ready, setReady] = useState(false);
  const [closed, setClosed] = useState<number[]>([]);
  const [hidden, setHidden] = useState<number[] | null>(null);

  useEffect(() => {
    // 저장소는 브라우저에만 있어서 화면이 뜬 뒤 읽는다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(hiddenToday());
    const header = document.querySelector<HTMLElement>("[data-intro-dim]");
    if (!header || header.hasAttribute("data-intro-done")) {
      setReady(true);
      return;
    }
    const observer = new MutationObserver(() => {
      if (header.hasAttribute("data-intro-done")) {
        setReady(true);
        observer.disconnect();
      }
    });
    observer.observe(header, { attributes: true, attributeFilter: ["data-intro-done"] });
    return () => observer.disconnect();
  }, [pathname]);

  const banner = banners.find(
    (item) => (item.target === "ALL_PAGES" || isMain) && !closed.includes(item.id) && !(hidden ?? []).includes(item.id),
  );
  const bannerId = banner?.id;

  // 키보드: Esc 로 닫는다
  useEffect(() => {
    if (bannerId == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setClosed((current) => [...current, bannerId]);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [bannerId]);

  if (!ready || hidden === null || !banner) return null;

  const hideToday = () => {
    try {
      localStorage.setItem(HIDE_KEY, JSON.stringify({ date: today(), ids: [...hiddenToday(), banner.id] }));
    } catch {
      // 저장이 안 되는 브라우저면 이번에만 닫는다
    }
    setClosed((current) => [...current, banner.id]);
  };

  const body = (
    <>
      <picture>
        {banner.mobileImageUrl && <source media="(max-width: 560px)" srcSet={banner.mobileImageUrl} />}
        <img src={banner.imageUrl} alt={banner.headline ?? ""} />
      </picture>
      {(banner.headline || banner.subtext || banner.price) && (
        <div className={styles.text}>
          {banner.subtext && <span>{banner.subtext}</span>}
          {banner.headline && <b>{banner.headline}</b>}
          {banner.price && <em>{banner.price}</em>}
        </div>
      )}
    </>
  );

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={banner.headline ?? "popup"}>
      <div className={styles.popup}>
        {banner.linkUrl ? (
          <a className={styles.media} href={localHref(banner.linkUrl, locale, `/${locale}`)}>
            {body}
          </a>
        ) : (
          <div className={styles.media}>{body}</div>
        )}
        <div className={styles.foot}>
          <button type="button" onClick={hideToday}>
            {labels.hideToday}
          </button>
          <button type="button" onClick={() => setClosed((current) => [...current, banner.id])}>
            {labels.close} ✕
          </button>
        </div>
      </div>
    </div>
  );
}

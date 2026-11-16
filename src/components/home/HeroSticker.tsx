import type { CSSProperties } from "react";
import { readableInk, type StickerDeco } from "@/lib/homeDeco";
import styles from "./homeDeco.module.css";

/** 히어로 오른쪽 아래 스티커: 둥근 배지 + 두 줄 문구. 자리(위치)는 부르는 쪽 className 이 정한다 */
export default function HeroSticker({ deco, className = "" }: { deco: StickerDeco; className?: string }) {
  const badge = deco.badge.filter(Boolean);
  const lines = deco.lines.filter(Boolean);
  if (badge.length === 0 && lines.length === 0) return null;
  const colors = { "--sticker-bg": deco.color, "--sticker-ink": readableInk(deco.color) } as CSSProperties;

  return (
    <div className={`${styles.sticker} ${className}`} aria-hidden="true">
      {badge.length > 0 && (
        <div className={styles.face} style={colors}>
          {badge.map((line, index) => (
            <span key={index}>{line}</span>
          ))}
        </div>
      )}
      {lines.length > 0 && (
        <div className={styles.tag}>
          {/* 한 줄만 있으면 흰 상자 하나, 두 줄이면 위는 검은 상자·아래는 흰 상자 */}
          {lines.map((line, index) => (
            <b key={index} data-solid={index === lines.length - 1 ? "" : undefined} data-shift={index > 0 ? "" : undefined}>
              {line}
            </b>
          ))}
        </div>
      )}
    </div>
  );
}

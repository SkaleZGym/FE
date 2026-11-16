import type { CSSProperties } from "react";
import { readableInk, tapeLoop, type TapeDeco } from "@/lib/homeDeco";
import styles from "./homeDeco.module.css";

/** 같은 문장을 두 벌 이어 붙여 절반 지점에서 되감겨도 끊김이 없다 */
function Line({ deco, kind }: { deco: TapeDeco; kind: "front" | "back" }) {
  const { repeat, seconds } = tapeLoop(deco.text, kind);
  const vars = { "--tape-bg": deco.color, "--tape-ink": readableInk(deco.color), "--tape-seconds": `${seconds}s` } as CSSProperties;
  return (
    <div className={`${styles.tapeLine} ${kind === "front" ? styles.front : styles.back}`} style={vars}>
      <p>
        {Array.from({ length: repeat * 2 }, (_, index) => (
          <span key={index}>{deco.text}</span>
        ))}
      </p>
    </div>
  );
}

/** 히어로 아래 비스듬한 띠 두 줄 (앞: 굵은 글자, 뒤: 작은 고정폭 글자). 둘 다 꺼져 있으면 아무것도 그리지 않는다 */
export default function HeroTape({ front, back, className = "" }: { front: TapeDeco; back: TapeDeco; className?: string }) {
  if (!front.on && !back.on) return null;
  return (
    <div className={`${styles.tape} ${className}`} aria-hidden="true">
      {front.on && <Line deco={front} kind="front" />}
      {back.on && <Line deco={back} kind="back" />}
    </div>
  );
}

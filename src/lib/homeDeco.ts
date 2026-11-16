/**
 * 메인 화면 꾸미기: 히어로 스티커(둥근 배지 + 두 줄 문구)와 히어로 아래 띠 두 줄.
 * 관리자 '메인 꾸미기' 화면에서 켜고 끄고, 문구와 색을 바꾼다.
 * 저장은 사이트 문구의 home.deco 한 칸에 JSON 으로 한다 (BE 를 고치지 않고, 한 번에 저장되게).
 */
export const HOME_DECO_KEY = "home.deco";

export type StickerDeco = { on: boolean; badge: string[]; lines: string[]; color: string };
export type TapeDeco = { on: boolean; text: string; color: string };
export type HomeDeco = { sticker: StickerDeco; front: TapeDeco; back: TapeDeco };

/**
 * 글자 수 상한 (칸 수 기준: 영어·숫자·기호 1칸, 한글·한자·일본어 2칸).
 * badge: 둥근 배지 한 줄. 지름 76px 원 안에 15px 글자로 세 줄이 들어가는 폭.
 * line: 스티커 문구 한 줄. 26px 글자로 PC 화면이 가장 좁을 때(861px)도 상품 사진을 덮지 않는 폭.
 * tape: 띠 문구. 흘러가는 글이라 깨지지는 않지만 한 바퀴가 너무 길어지지 않게.
 */
export const DECO_LIMITS = { badge: 6, line: 12, tape: 120 } as const;

export const DECO_COLORS = { red: "#e0261b", ink: "#ededed" } as const;

const WIDE = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-｠]/;

/** 화면에서 차지하는 폭을 칸 수로 센다 (한글 같은 넓은 글자는 2칸) */
export function textUnits(text: string): number {
  let units = 0;
  for (const char of text) units += WIDE.test(char) ? 2 : 1;
  return units;
}

/** 상한을 넘는 뒷부분을 잘라 낸다 */
export function clipUnits(text: string, max: number): string {
  let units = 0;
  let result = "";
  for (const char of text) {
    units += WIDE.test(char) ? 2 : 1;
    if (units > max) break;
    result += char;
  }
  return result;
}

const HEX = /^#[0-9a-f]{6}$/i;

export const isHexColor = (value: unknown): value is string => typeof value === "string" && HEX.test(value);

/** 바탕색 위 글자색. 브랜드 띠는 색 바탕에 검은 글자가 기본이라, 검정과의 명암비가 4 이상이면 검정, 어두운 색에서만 흰색 */
export function readableInk(background: string): "#000" | "#fff" {
  const channel = (index: number) => {
    const value = parseInt(background.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  // 검정과의 명암비는 (L+0.05)/0.05
  return (luminance + 0.05) / 0.05 >= 4 ? "#000" : "#fff";
}

/** 기본값 (관리자가 아무것도 저장하지 않았을 때). 모든 언어 화면에서 같은 영어 문구다 */
export function defaultHomeDeco(): HomeDeco {
  return {
    sticker: { on: true, badge: ["KAIDO", "×", "SKZ"], lines: ["LIMITED", "FORGE IT."], color: DECO_COLORS.red },
    front: { on: true, text: "/ COMPRESSION TIGHTS / KAIDO × SKALEZ / FORGED, NOT BORN / BUILT FOR LEG DAY", color: DECO_COLORS.red },
    back: { on: true, text: "SAME-DAY SHIPPING · FREE SIZE EXCHANGE · WORLDWIDE 2027 ·", color: DECO_COLORS.ink },
  };
}

const oneLine = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

/** 저장된 JSON 을 읽는다. 없거나 깨졌으면 기본값, 일부만 있으면 그 부분만 덮어쓴다. 길이·색은 여기서 한 번 더 걸러 화면이 깨지지 않게 한다 */
export function parseHomeDeco(raw: string | null | undefined, defaults: HomeDeco): HomeDeco {
  if (!raw) return defaults;
  let saved: Record<string, Record<string, unknown> | undefined>;
  try {
    saved = JSON.parse(raw);
  } catch {
    return defaults;
  }
  if (!saved || typeof saved !== "object") return defaults;

  const texts = (value: unknown, count: number, max: number, fallback: string[]) =>
    Array.isArray(value) ? Array.from({ length: count }, (_, index) => clipUnits(oneLine(value[index]), max)) : fallback;
  const tape = (value: Record<string, unknown> | undefined, fallback: TapeDeco): TapeDeco => {
    if (!value || typeof value !== "object") return fallback;
    const text = oneLine(value.text).slice(0, DECO_LIMITS.tape);
    return {
      on: typeof value.on === "boolean" ? value.on : fallback.on,
      text: text || fallback.text,
      color: isHexColor(value.color) ? value.color : fallback.color,
    };
  };

  const sticker = saved.sticker;
  return {
    sticker:
      sticker && typeof sticker === "object"
        ? {
            on: typeof sticker.on === "boolean" ? sticker.on : defaults.sticker.on,
            badge: texts(sticker.badge, 3, DECO_LIMITS.badge, defaults.sticker.badge),
            lines: texts(sticker.lines, 2, DECO_LIMITS.line, defaults.sticker.lines),
            color: isHexColor(sticker.color) ? sticker.color : defaults.sticker.color,
          }
        : defaults.sticker,
    front: tape(saved.front, defaults.front),
    back: tape(saved.back, defaults.back),
  };
}

/**
 * 띠가 끊기지 않게 문구를 몇 번 이어 붙일지와 한 바퀴 시간.
 * 문구 한 벌의 폭을 어림해(앞 띠 22px 굵은 글자, 뒤 띠 12px 고정폭) 아주 넓은 화면(3200px)도 채우고,
 * 문구 길이가 달라도 흐르는 빠르기는 같게 한다.
 */
export function tapeLoop(text: string, kind: "front" | "back"): { repeat: number; seconds: number } {
  const [unit, speed] = kind === "front" ? [9.7, 68] : [9.4, 65];
  const width = textUnits(text) * unit + 40;
  const repeat = Math.min(60, Math.max(2, Math.ceil(3200 / width)));
  return { repeat, seconds: Math.round((repeat * width) / speed) };
}

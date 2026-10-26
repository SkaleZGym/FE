// 아임웹 회원 CSV 읽기 도우미 (브라우저에서만 쓴다 — 파일 자체는 서버로 올리지 않는다)

/** 엑셀 'CSV UTF-8'이면 UTF-8, 그냥 'CSV(쉼표로 분리)'면 한국어 윈도우 기본 인코딩(EUC-KR)이라 둘 다 시도한다 */
export function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("euc-kr").decode(buffer);
  }
}

/** 따옴표 안의 쉼표·줄바꿈까지 처리하는 CSV 파서. 빈 줄은 건너뛴다 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export type Field = "email" | "name" | "phone" | "joinedAt" | "marketing" | "legacyId";

export const FIELDS: { key: Field; label: string; required?: boolean; hints: string[] }[] = [
  { key: "email", label: "이메일", required: true, hints: ["이메일", "email", "e-mail", "메일"] },
  { key: "name", label: "이름", hints: ["이름", "name", "성명", "회원명"] },
  { key: "phone", label: "연락처", hints: ["휴대폰", "핸드폰", "연락처", "전화", "phone", "mobile"] },
  { key: "joinedAt", label: "가입일", hints: ["가입일", "가입 일", "가입일시", "joined", "created", "등록일"] },
  { key: "marketing", label: "마케팅 수신 동의", hints: ["수신", "마케팅", "광고", "marketing", "sms", "이메일 수신"] },
  { key: "legacyId", label: "아임웹 회원 번호", hints: ["회원번호", "회원 번호", "고유", "member code", "code", "번호", "no"] },
];

/** 머리글 이름으로 어느 열이 무엇인지 미리 짐작한다 (관리자가 바꿀 수 있다) */
export function guessMapping(headers: string[]): Record<Field, number> {
  const used = new Set<number>();
  const mapping = {} as Record<Field, number>;
  for (const field of FIELDS) {
    const index = headers.findIndex((header, i) => !used.has(i) && field.hints.some((hint) => header.trim().toLowerCase().includes(hint)));
    mapping[field.key] = index;
    if (index >= 0) used.add(index);
  }
  return mapping;
}

/** Y · 예 · 동의 · 수신 · true · 1 → 동의 */
export function isYes(value: string | undefined) {
  const v = (value ?? "").trim().toLowerCase();
  return ["y", "yes", "예", "네", "동의", "수신", "수신동의", "true", "1", "o"].includes(v) || (v.includes("동의") && !v.includes("거부") && !v.includes("미동의"));
}

/** '2023-05-01 12:34:56' · '2023.05.01' · '2023/5/1' → 한국 시간으로 보고 ISO 시각. 못 읽으면 null */
export function toIsoKst(value: string | undefined): string | null {
  const match = (value ?? "").trim().match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = match;
  const pad = (n: string) => n.padStart(2, "0");
  const date = new Date(`${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}+09:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** 미리보기·오류 목록에서 개인정보를 가린다 */
export const maskEmail = (email: string) => email.replace(/^(.{2})[^@]*(@.*)$/, "$1***$2");
export const maskName = (name: string) => (name ? name.slice(0, 1) + "*".repeat(Math.max(1, name.length - 1)) : "");
export const maskPhone = (phone: string) => (phone.length > 5 ? `${phone.slice(0, 3)}****${phone.slice(-2)}` : phone);

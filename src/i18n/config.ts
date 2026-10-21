// 서버·클라이언트 공용 언어 설정. BE의 SupportedLanguage와 같은 코드를 쓴다.
export const locales = ["ko", "en", "ja", "zh-CN"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ko";

/** 사용자가 드롭다운으로 고른 언어를 기억하는 쿠키 */
export const localeCookie = "SKALEZ_LOCALE";

export const localeLabels: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  "zh-CN": "简体中文",
};

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

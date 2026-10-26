import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "./config";
import type ko from "./dictionaries/ko.json";

/** 한국어 사전이 기준 형태. 다른 언어에 키가 빠지면 타입 에러가 난다. */
export type Dictionary = typeof ko;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ko: () => import("./dictionaries/ko.json").then((module) => module.default),
  en: () => import("./dictionaries/en.json").then((module) => module.default),
  ja: () => import("./dictionaries/ja.json").then((module) => module.default),
  "zh-CN": () => import("./dictionaries/zh-CN.json").then((module) => module.default),
};

/** 현재 URL의 언어(/ko, /en …)를 읽어 사전을 돌려준다. */
export async function getLocale(): Promise<Locale> {
  const locale = await lang();
  // 관리자 화면(/admin)은 언어 경로가 없어서 lang 이 비어 있을 수 있다
  if (!locale || !hasLocale(locale)) notFound();
  return locale;
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()]();
}

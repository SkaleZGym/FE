"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { ApiError, loginHref } from "@/lib/client";
import { useAccount } from "./accountStore";

/** 회원 전용 화면: 로그인 전이면 로그인 화면으로 보냈다가 이 주소로 돌아온다 */
export function useMember(locale: Locale) {
  const account = useAccount(locale);
  useEffect(() => {
    if (account.status === "guest") {
      window.location.replace(loginHref(locale, window.location.pathname + window.location.search));
    }
  }, [account.status, locale]);
  return account;
}

/** 로그인 뒤 돌아갈 주소. 다른 사이트로 튕기지 않게 우리 사이트 안 경로만 받는다 */
export function safeNext(locale: Locale) {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : `/${locale}`;
}

/** BE가 언어에 맞춰 준 오류 문구 → 없으면 공통 문구 */
export function errorText(error: unknown, common: Dictionary["common"]) {
  if (error instanceof ApiError) {
    if (error.status === 502) return common.backendDown;
    if (error.message) return error.message;
  }
  return common.error;
}

const noSubscribe = () => () => {};

/** 주소의 ?쿼리 (서버 렌더링 때는 빈 값 → 브라우저에서 채워진다) */
export const useSearch = () => useSyncExternalStore(noSubscribe, () => window.location.search, () => "");

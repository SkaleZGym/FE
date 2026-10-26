"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { api, ApiError } from "@/lib/client";
import styles from "./account.module.css";
import { errorText, safeNext, useSearch } from "./useMember";

type Props = { locale: Locale; labels: Dictionary["account"]; common: Dictionary["common"] };

/** 토큰은 FE 서버(/api/auth/login)가 httpOnly 쿠키로만 보관한다. 브라우저 스크립트는 토큰을 보지 못한다 */
export async function login(locale: Locale, email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Language": locale },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, data?.code, data?.message ?? "");
  }
}

export default function LoginForm({ locale, labels, common }: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // 가입 화면으로 넘어가도 돌아갈 주소(?next=)를 이어 준다
  const query = useSearch();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await login(locale, String(form.get("email")).trim(), String(form.get("password")));
      // 전체 새로고침으로 이동해서 헤더·장바구니 개수까지 로그인 상태로 다시 불러온다
      window.location.assign(safeNext(locale));
    } catch (caught) {
      setError(errorText(caught, common));
      setBusy(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        <span>{labels.email}</span>
        <input className={styles.input} type="email" name="email" autoComplete="email" required />
      </label>
      <label className={styles.field}>
        <span>{labels.password}</span>
        <input className={styles.input} type="password" name="password" autoComplete="current-password" required />
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button className={styles.button} type="submit" disabled={busy}>
        {labels.loginButton}
      </button>
      <p className={styles.switch}>
        {labels.noAccount}
        <a href={`/${locale}/signup${query}`}>{labels.signupLink}</a>
      </p>
    </form>
  );
}

/** 회원가입 API 응답은 쓰지 않는다 — 가입 직후 같은 정보로 로그인한다 */
export const signup = (locale: Locale, body: { email: string; password: string; name: string }) =>
  api("/auth/signup", { method: "POST", body, locale });

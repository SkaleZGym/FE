"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { api } from "@/lib/client";
import styles from "./account.module.css";
import { errorText } from "./useMember";

type Props = { locale: Locale; labels: Dictionary["account"]; common: Dictionary["common"] };

/**
 * 비밀번호 찾기 (= 아임웹에서 옮겨 온 회원의 첫 비밀번호 설정).
 * 서버는 가입 여부와 상관없이 같은 답을 주고, 화면도 '가입된 이메일이라면 보냈다'로만 안내한다
 */
export default function ForgotPasswordForm({ locale, labels, common }: Props) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setBusy(true);
    setError("");
    try {
      await api("/auth/password-reset", { method: "POST", body: { email }, locale });
      setSent(true);
    } catch (caught) {
      setError(errorText(caught, common));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        <span>{labels.email}</span>
        <input className={styles.input} type="email" name="email" autoComplete="email" maxLength={100} required />
      </label>
      {sent && (
        <p className={styles.success} role="status">
          {labels.forgotSent}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button className={styles.button} type="submit" disabled={busy}>
        {labels.forgotButton}
      </button>
      <p className={styles.switch}>
        <a href={`/${locale}/login`}>{labels.loginLink}</a>
      </p>
    </form>
  );
}

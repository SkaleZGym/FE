"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { api } from "@/lib/client";
import styles from "./account.module.css";
import { errorText, useSearchOrNull } from "./useMember";

type Props = { locale: Locale; labels: Dictionary["account"]; common: Dictionary["common"] };

/** 메일 링크(/reset-password?token=…)로 들어와 새 비밀번호를 정한다 */
export default function ResetPasswordForm({ locale, labels, common }: Props) {
  const search = useSearchOrNull();
  const token = search === null ? null : new URLSearchParams(search).get("token");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword !== String(form.get("passwordConfirm"))) return setError(labels.passwordMismatch);
    setBusy(true);
    setError("");
    try {
      await api("/auth/password-reset/confirm", { method: "POST", body: { token, newPassword }, locale });
      setDone(true);
    } catch (caught) {
      setError(errorText(caught, common));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className={styles.form}>
        <p className={styles.success} role="status">
          {labels.resetDone}
        </p>
        <a className={styles.button} href={`/${locale}/login`}>
          {labels.loginButton}
        </a>
      </div>
    );
  }

  if (search === null) return <p className={styles.muted}>{common.loading}</p>;

  if (!token) {
    return (
      <div className={styles.form}>
        <p className={styles.error}>{labels.resetNoToken}</p>
        <a className={styles.button} data-variant="ghost" href={`/${locale}/forgot-password`}>
          {labels.forgotButton}
        </a>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        <span>{labels.newPassword}</span>
        <input className={styles.input} type="password" name="password" autoComplete="new-password" minLength={8} maxLength={64} required />
        <small>{labels.passwordRule}</small>
      </label>
      <label className={styles.field}>
        <span>{labels.passwordConfirm}</span>
        <input className={styles.input} type="password" name="passwordConfirm" autoComplete="new-password" minLength={8} maxLength={64} required />
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}{" "}
          <a className={styles.link} href={`/${locale}/forgot-password`}>
            {labels.forgotButton} →
          </a>
        </p>
      )}
      <button className={styles.button} type="submit" disabled={busy}>
        {labels.resetButton}
      </button>
    </form>
  );
}

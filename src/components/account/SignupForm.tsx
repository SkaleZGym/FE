"use client";

import { useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { ApiError } from "@/lib/client";
import styles from "./account.module.css";
import { login, signup } from "./LoginForm";
import { errorText, safeNext } from "./useMember";

type Props = { locale: Locale; labels: Dictionary["account"]; common: Dictionary["common"] };

/** 가입하면 바로 로그인까지 해서 원래 보던 화면(?next=)으로 돌려보낸다 */
export default function SignupForm({ locale, labels, common }: Props) {
  const [error, setError] = useState("");
  const [taken, setTaken] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (password !== String(form.get("passwordConfirm"))) return setError(labels.passwordMismatch);
    if (!form.get("terms") || !form.get("privacy")) return setError(labels.agreeRequired);

    setBusy(true);
    setError("");
    setTaken(false);
    try {
      await signup(locale, { email, password, name: String(form.get("name")).trim(), agreeTerms: true, marketingConsent: Boolean(form.get("marketing")) });
      await login(locale, email, password);
      window.location.assign(safeNext(locale));
    } catch (caught) {
      // 이미 있는 이메일: 아임웹에서 옮겨 온 회원일 수 있어서 비밀번호 설정으로 안내
      if (caught instanceof ApiError && caught.code === "EMAIL_DUPLICATED") setTaken(true);
      setError(caught instanceof ApiError && caught.code === "EMAIL_DUPLICATED" ? labels.emailTaken : errorText(caught, common));
      setBusy(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        <span>{labels.email}</span>
        <input className={styles.input} type="email" name="email" autoComplete="email" maxLength={100} required />
      </label>
      <label className={styles.field}>
        <span>{labels.name}</span>
        <input className={styles.input} name="name" autoComplete="name" maxLength={50} required />
      </label>
      <label className={styles.field}>
        <span>{labels.password}</span>
        <input className={styles.input} type="password" name="password" autoComplete="new-password" minLength={8} maxLength={64} required />
        <small>{labels.passwordRule}</small>
      </label>
      <label className={styles.field}>
        <span>{labels.passwordConfirm}</span>
        <input className={styles.input} type="password" name="passwordConfirm" autoComplete="new-password" minLength={8} maxLength={64} required />
      </label>
      <label className={styles.check}>
        <input type="checkbox" name="terms" />
        {labels.agreeTerms}
      </label>
      <label className={styles.check}>
        <input type="checkbox" name="privacy" />
        {labels.agreePrivacy}
      </label>
      <label className={styles.check}>
        <input type="checkbox" name="marketing" />
        {labels.agreeMarketing}
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
          {taken && (
            <>
              {" "}
              <a className={styles.link} href={`/${locale}/forgot-password`}>
                {labels.legacyCta} →
              </a>
            </>
          )}
        </p>
      )}
      <button className={styles.button} type="submit" disabled={busy}>
        {labels.signupButton}
      </button>
      <p className={styles.switch}>
        {labels.haveAccount}
        <a href={`/${locale}/login`}>{labels.loginLink}</a>
      </p>
    </form>
  );
}

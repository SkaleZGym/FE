"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import styles from "./auth.module.css";

type Pending = { email: string; name: string; provider: string };

/**
 * 카카오·네이버로 처음 온 사람의 약관 동의 화면.
 * 가입 표는 httpOnly 쿠키에 있어서 여기서는 이메일·이름만 받아 보여 주고, 동의하면 FE 서버가 가입을 마친다
 */
export default function SocialSignupForm({ locale, labels, common }: { locale: Locale; labels: Dictionary["account"]; common: Dictionary["common"] }) {
  const [pending, setPending] = useState<Pending | null | undefined>(undefined);
  const [agree, setAgree] = useState({ terms: false, privacy: false, age: false, marketing: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const all = agree.terms && agree.privacy && agree.age && agree.marketing;

  useEffect(() => {
    fetch("/api/auth/oauth/signup", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(setPending)
      .catch(() => setPending(null));
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!agree.terms || !agree.privacy || !agree.age) return setError(labels.agreeRequired);
    const name = String(new FormData(event.currentTarget).get("name")).trim();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/oauth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Language": locale },
      body: JSON.stringify({ name, agreeTerms: true, agreePrivacy: true, over14: true, marketingConsent: agree.marketing }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (response?.ok) {
      window.location.assign(data?.next ?? `/${locale}`);
      return;
    }
    setError(data?.code === "SOCIAL_SIGNUP_EXPIRED" ? labels.auth.errors.SOCIAL_SIGNUP_EXPIRED : data?.message || common.error);
    setBusy(false);
  };

  if (pending === undefined) return <p className={styles.note}>{common.loading}</p>;
  if (pending === null) {
    return (
      <div className={styles.form}>
        <p className={styles.error}>{labels.auth.errors.SOCIAL_SIGNUP_EXPIRED}</p>
        <a className={styles.primary} style={{ display: "grid", placeItems: "center" }} href={`/${locale}/login`}>
          {labels.loginButton}
        </a>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
        </svg>
        <input value={pending.email} readOnly aria-label={labels.email} />
      </label>
      <label className={styles.field}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />
        </svg>
        <input name="name" defaultValue={pending.name} placeholder={labels.name} maxLength={50} required aria-label={labels.name} />
      </label>
      <div className={styles.agree}>
        <label className={styles.check} data-all="">
          <input
            type="checkbox"
            checked={all}
            onChange={(event) => setAgree({ terms: event.target.checked, privacy: event.target.checked, age: event.target.checked, marketing: event.target.checked })}
          />
          {labels.agreeAll}
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={agree.terms} onChange={(event) => setAgree({ ...agree, terms: event.target.checked })} />
          {labels.agreeTerms}
          <a className={styles.view} href={`/${locale}/terms`} target="_blank" rel="noreferrer">
            {labels.viewTerms}
          </a>
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={agree.privacy} onChange={(event) => setAgree({ ...agree, privacy: event.target.checked })} />
          {labels.agreePrivacy}
          <a className={styles.view} href={`/${locale}/privacy`} target="_blank" rel="noreferrer">
            {labels.viewTerms}
          </a>
        </label>
        <p className={styles.summary}>{labels.privacySummary}</p>
        <label className={styles.check}>
          <input type="checkbox" checked={agree.age} onChange={(event) => setAgree({ ...agree, age: event.target.checked })} />
          {labels.agreeAge}
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={agree.marketing} onChange={(event) => setAgree({ ...agree, marketing: event.target.checked })} />
          {labels.agreeMarketing}
        </label>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button className={styles.primary} type="submit" disabled={busy}>
        {labels.auth.socialButton}
      </button>
    </form>
  );
}

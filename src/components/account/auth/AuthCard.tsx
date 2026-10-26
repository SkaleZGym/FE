"use client";

import Image from "next/image";
import { useState, type FormEvent, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { ApiError } from "@/lib/client";
import { errorText, safeNext, useSearch } from "../useMember";
import { login, signup, socialStartHref } from "./authApi";
import styles from "./auth.module.css";

type Mode = "login" | "signup";
type Labels = Dictionary["account"];

type Props = {
  locale: Locale;
  initialMode: Mode;
  /** 슬라이드 패널 배경 사진 */
  image: string;
  labels: Labels;
  common: Dictionary["common"];
};

/** 입력칸 앞 아이콘 */
const icons = {
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
};

function Field({ icon, children }: { icon: keyof typeof icons; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={icons[icon]} />
      </svg>
      {children}
    </label>
  );
}

/** 눈 버튼으로 보였다 숨겼다 하는 비밀번호 칸 */
function PasswordField({ name, placeholder, autoComplete, labels, minLength }: { name: string; placeholder: string; autoComplete: string; labels: Labels["auth"]; minLength?: number }) {
  const [shown, setShown] = useState(false);
  return (
    <Field icon="lock">
      <input type={shown ? "text" : "password"} name={name} placeholder={placeholder} autoComplete={autoComplete} minLength={minLength} maxLength={64} required />
      <button type="button" className={styles.eye} aria-label={shown ? labels.hidePassword : labels.showPassword} aria-pressed={shown} onClick={() => setShown((value) => !value)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {!shown && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </Field>
  );
}

function SocialButtons({ locale, next, labels }: { locale: Locale; next: string; labels: Labels["auth"] }) {
  return (
    <div className={styles.social}>
      <a className={styles.kakao} href={socialStartHref("kakao", locale, next)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4C6.9 4 3 7.2 3 11.1c0 2.5 1.7 4.7 4.2 6l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.3 0 .7.1 1 .1 5.1 0 9-3.2 9-7.3S17.1 4 12 4Z" />
        </svg>
        {labels.kakao}
      </a>
      <a className={styles.naver} href={socialStartHref("naver", locale, next)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.6 12.4 9.2 4.5H4.5v15h4.9v-7.9l5.4 7.9h4.7v-15h-4.9z" />
        </svg>
        {labels.naver}
      </a>
    </div>
  );
}

/**
 * 로그인 · 회원가입 한 장 카드. 두 폼이 나란히 있고 사진 패널이 미끄러지며 한쪽을 덮는다.
 * 모드를 바꾸면 주소도 /login ↔ /signup 으로 바꾼다 (새로고침 없이). 모바일은 패널 없이 폼 하나만.
 */
export default function AuthCard({ locale, initialMode, image, labels, common }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const search = useSearch();
  const query = new URLSearchParams(search);
  const next = (() => {
    const value = query.get("next");
    return value && value.startsWith("/") && !value.startsWith("//") ? value : `/${locale}`;
  })();
  const socialError = query.get("social");
  const auth = labels.auth;

  const switchTo = (nextMode: Mode) => {
    setMode(nextMode);
    window.history.replaceState(null, "", `/${locale}/${nextMode}${search}`);
    // 브라우저 탭 제목도 함께 (LOGIN | … ↔ SIGN UP | …)
    document.title = document.title.replace(/^[^|]+|/, `${nextMode === "login" ? labels.loginTitle : labels.signupTitle} |`);
  };

  return (
    <div className={styles.card} data-mode={mode}>
      <section className={styles.side} data-side="login" inert={mode !== "login" || undefined} aria-hidden={mode !== "login"}>
        <LoginPanel locale={locale} next={next} labels={labels} common={common} socialError={socialError ? (auth.errors as Record<string, string>)[socialError] ?? auth.errors.SOCIAL_LOGIN_FAILED : ""} />
        <p className={styles.switch}>
          {labels.noAccount}
          <button type="button" onClick={() => switchTo("signup")}>
            {labels.signupLink}
          </button>
        </p>
      </section>

      <section className={styles.side} data-side="signup" inert={mode !== "signup" || undefined} aria-hidden={mode !== "signup"}>
        <SignupPanel locale={locale} next={next} labels={labels} common={common} />
        <p className={styles.switch}>
          {labels.haveAccount}
          <button type="button" onClick={() => switchTo("login")}>
            {labels.loginLink}
          </button>
        </p>
      </section>

      {/* 데스크톱 슬라이드 패널: 로그인일 땐 오른쪽(가입 쪽)을, 가입일 땐 왼쪽(로그인 쪽)을 덮는다 */}
      <aside className={styles.overlay}>
        <Image src={image} alt="" fill sizes="480px" className={styles.overlayImage} />
        <div className={styles.overlayText} data-for="signup" aria-hidden={mode !== "signup"}>
          <b>{auth.welcomeTitle}</b>
          <p>{auth.welcomeText}</p>
          <button type="button" tabIndex={mode === "signup" ? 0 : -1} onClick={() => switchTo("login")}>
            {auth.welcomeCta}
          </button>
        </div>
        <div className={styles.overlayText} data-for="login" aria-hidden={mode !== "login"}>
          <b>{auth.helloTitle}</b>
          <p>{auth.helloText}</p>
          <button type="button" tabIndex={mode === "login" ? 0 : -1} onClick={() => switchTo("signup")}>
            {auth.helloCta}
          </button>
        </div>
      </aside>
    </div>
  );
}

function LoginPanel({ locale, next, labels, common, socialError }: { locale: Locale; next: string; labels: Labels; common: Dictionary["common"]; socialError: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await login(locale, String(form.get("email")).trim(), String(form.get("password")), Boolean(form.get("remember")));
      // 전체 새로고침으로 이동해서 헤더·장바구니 개수까지 로그인 상태로 다시 불러온다
      window.location.assign(safeNext(locale));
    } catch (caught) {
      setError(errorText(caught, common));
      setBusy(false);
    }
  };

  const shownError = error || socialError;

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <h1>{labels.loginTitle}</h1>
      <Field icon="mail">
        <input type="email" name="email" placeholder={labels.email} autoComplete="email" required />
      </Field>
      <PasswordField name="password" placeholder={labels.password} autoComplete="current-password" labels={labels.auth} />
      <div className={styles.row}>
        <label className={styles.check}>
          <input type="checkbox" name="remember" defaultChecked />
          {labels.auth.remember}
        </label>
        <a href={`/${locale}/forgot-password`}>{labels.forgotLink}</a>
      </div>
      {shownError && (
        <p className={styles.error} role="alert">
          {shownError}
        </p>
      )}
      <button className={styles.primary} type="submit" disabled={busy}>
        {labels.loginButton}
      </button>
      <div className={styles.or}>
        <span>{labels.auth.or}</span>
      </div>
      <SocialButtons locale={locale} next={next} labels={labels.auth} />
      <p className={styles.note}>
        {labels.legacyNotice}{" "}
        <a href={`/${locale}/forgot-password`}>{labels.legacyCta} →</a>
      </p>
    </form>
  );
}

function SignupPanel({ locale, next, labels, common }: { locale: Locale; next: string; labels: Labels; common: Dictionary["common"] }) {
  const [error, setError] = useState("");
  const [taken, setTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState({ terms: false, privacy: false, marketing: false });
  const all = agree.terms && agree.privacy && agree.marketing;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (!agree.terms || !agree.privacy) return setError(labels.agreeRequired);
    setBusy(true);
    setError("");
    setTaken(false);
    try {
      await signup(locale, { email, password, name: String(form.get("name")).trim(), agreeTerms: true, marketingConsent: agree.marketing });
      await login(locale, email, password);
      window.location.assign(safeNext(locale));
    } catch (caught) {
      // 이미 있는 이메일: 아임웹에서 옮겨 온 회원일 수 있어서 비밀번호 설정으로 안내
      const duplicated = caught instanceof ApiError && caught.code === "EMAIL_DUPLICATED";
      setTaken(duplicated);
      setError(duplicated ? labels.emailTaken : errorText(caught, common));
      setBusy(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <h1>{labels.signupTitle}</h1>
      <Field icon="mail">
        <input type="email" name="email" placeholder={labels.email} autoComplete="email" maxLength={100} required />
      </Field>
      <Field icon="user">
        <input name="name" placeholder={labels.name} autoComplete="name" maxLength={50} required />
      </Field>
      <PasswordField name="password" placeholder={`${labels.password} (${labels.passwordRule})`} autoComplete="new-password" labels={labels.auth} minLength={8} />
      <div className={styles.agree}>
        <label className={styles.check} data-all="">
          <input type="checkbox" checked={all} onChange={(event) => setAgree({ terms: event.target.checked, privacy: event.target.checked, marketing: event.target.checked })} />
          {labels.agreeAll}
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={agree.terms} onChange={(event) => setAgree({ ...agree, terms: event.target.checked })} />
          {labels.agreeTerms}
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={agree.privacy} onChange={(event) => setAgree({ ...agree, privacy: event.target.checked })} />
          {labels.agreePrivacy}
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={agree.marketing} onChange={(event) => setAgree({ ...agree, marketing: event.target.checked })} />
          {labels.agreeMarketing}
        </label>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
          {taken && (
            <>
              {" "}
              <a href={`/${locale}/forgot-password`}>{labels.legacyCta} →</a>
            </>
          )}
        </p>
      )}
      <button className={styles.primary} type="submit" disabled={busy}>
        {labels.signupButton}
      </button>
      <div className={styles.or}>
        <span>{labels.auth.or}</span>
      </div>
      <SocialButtons locale={locale} next={next} labels={labels.auth} />
    </form>
  );
}

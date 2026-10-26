"use client";

import { useState, type FormEvent } from "react";
import { images } from "@/data/catalog";

/** 다른 사이트로 튕기지 않게 관리자 화면 안 경로만 받는다 */
function safeNext() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin";
}

export default function AdminLogin() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Language": "ko" },
      body: JSON.stringify({ email: String(form.get("email")).trim(), password: String(form.get("password")) }),
    }).catch(() => null);
    if (response?.ok) {
      window.location.replace(safeNext());
      return;
    }
    const data = await response?.json().catch(() => null);
    setError(data?.message || "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    setBusy(false);
  };

  return (
    <section className="login">
      <div className="art">
        {/* eslint-disable-next-line @next/next/no-img-element -- 로그인 화면 배경 사진 한 장 */}
        <img src="https://cdn.imweb.me/thumbnail/20260927/bef722d127522.jpg" alt="" />
        <div className="copy">
          <h1>
            FORGED,
            <br />
            NOT BORN
          </h1>
          <p>SKALEZ ADMIN CONSOLE</p>
        </div>
      </div>
      <form onSubmit={onSubmit}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 로고 */}
        <img src={images.wordmark} alt="SKALEZ" />
        <h2>관리자 로그인</h2>
        <label className="field">
          <span>이메일</span>
          <input className="input" type="email" name="email" autoComplete="username" required />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input className="input" type="password" name="password" autoComplete="current-password" required />
        </label>
        <div className="err" role="alert">
          {error}
        </div>
        <button className="btn primary" type="submit" style={{ height: 42 }} disabled={busy}>
          로그인
        </button>
      </form>
    </section>
  );
}

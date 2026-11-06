"use client";

import { useState, type FormEvent } from "react";
import { images } from "@/data/catalog";

/** 다른 사이트로 튕기지 않게 관리자 화면 안 경로만 받는다 */
function safeNext() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin";
}

/** password: 이메일·비밀번호 → code: OTP 앱 6자리 → (처음이면) setup: OTP 앱 등록 후 6자리 */
type Step = "password" | "code" | "setup";
type Setup = { secret: string; uri: string; qr: string };

/** 앱에 직접 입력하기 쉽게 4글자씩 띄운다 */
const groupKey = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();

export default function AdminLogin() {
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const restart = () => {
    setStep("password");
    setPassword("");
    setCode("");
    setSetup(null);
    setError("");
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== "password" && !/^\d{6}$/.test(code)) {
      setError("OTP 앱에 나온 6자리 숫자를 넣어 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    const body = { email: email.trim(), password, ...(step === "password" ? {} : { code }) };
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Language": "ko" },
      body: JSON.stringify(body),
    }).catch(() => null);

    if (response?.status === 204) {
      window.location.replace(safeNext());
      return;
    }
    const data = await response?.json().catch(() => null);
    if (response?.ok && data?.step === "CODE") {
      setStep("code");
    } else if (response?.ok && data?.step === "SETUP" && data.otpSecret && data.otpUri) {
      const QRCode = await import("qrcode");
      const qr = await QRCode.toDataURL(data.otpUri, { margin: 1, width: 360 }).catch(() => "");
      setSetup({ secret: data.otpSecret, uri: data.otpUri, qr });
      setStep("setup");
    } else {
      setError(data?.message || "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.");
      // 비밀번호가 틀렸거나 잠기면 처음 화면으로
      if (data?.code && data.code !== "ADMIN_OTP_INVALID") {
        setStep("password");
        setPassword("");
        setSetup(null);
      }
    }
    setCode("");
    setBusy(false);
  };

  const codeField = (
    <label className="field">
      <span>OTP 앱의 6자리 숫자</span>
      <input
        className="input mono otp-code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        placeholder="000000"
        autoFocus
        required
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
      />
    </label>
  );

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

        {step === "password" && (
          <>
            <h2>관리자 로그인</h2>
            <label className="field">
              <span>이메일</span>
              <input className="input" type="email" name="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field">
              <span>비밀번호</span>
              <input
                className="input"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </>
        )}

        {step === "code" && (
          <>
            <h2>2단계 인증</h2>
            <p className="otp-help">
              휴대폰 OTP 앱에서 <b>SKALEZ</b> 항목의 6자리 숫자를 넣어 주세요. 숫자는 30초마다 바뀌어요.
            </p>
            {codeField}
          </>
        )}

        {step === "setup" && setup && (
          <>
            <h2>2단계 인증 등록</h2>
            <ol className="otp-steps">
              <li>휴대폰에 OTP 앱을 설치해 주세요. (Google OTP, Microsoft Authenticator 등)</li>
              <li>
                앱에서 아래 QR을 찍어 주세요. 휴대폰으로 이 화면을 보고 있으면{" "}
                <a href={setup.uri}>OTP 앱에서 바로 열기</a>를 누르거나 키를 직접 입력해 주세요.
              </li>
              <li>앱에 나온 6자리 숫자를 넣으면 등록이 끝나요. 다음부터는 로그인할 때마다 이 숫자를 물어봐요.</li>
            </ol>
            {setup.qr && (
              // eslint-disable-next-line @next/next/no-img-element -- 화면에서 만든 QR 그림
              <img className="otp-qr" src={setup.qr} alt="OTP 앱 등록 QR" width={180} height={180} />
            )}
            <div className="otp-key">
              <span>직접 입력 키</span>
              <code className="mono">{groupKey(setup.secret)}</code>
            </div>
            {codeField}
          </>
        )}

        <div className="err" role="alert">
          {error}
        </div>
        <button className="btn primary" type="submit" style={{ height: 42 }} disabled={busy}>
          {step === "password" ? "다음" : step === "setup" ? "등록하고 로그인" : "로그인"}
        </button>
        {step !== "password" && (
          <button className="btn" type="button" onClick={restart} disabled={busy}>
            처음으로
          </button>
        )}
      </form>
    </section>
  );
}

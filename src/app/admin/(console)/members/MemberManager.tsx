"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Chips, Pager, Top } from "../../_components/ui";
import { adminApi, dateOnly, errorMessage, money, toast, type AdminMember, type Page } from "../../_lib/admin";

type Status = AdminMember["status"];
const LANGUAGE: Record<string, string> = { ko: "한국어", en: "English", ja: "日本語", "zh-CN": "中文" };

export default function MemberManager() {
  const [status, setStatus] = useState<Status | null>(null);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AdminMember> | null>(null);
  const [error, setError] = useState("");
  const [pointsOf, setPointsOf] = useState<AdminMember | null>(null);

  const load = useCallback(() => {
    const query = new URLSearchParams({ page: String(page), size: "20" });
    if (status) query.set("status", status);
    if (search) query.set("keyword", search);
    adminApi<Page<AdminMember>>(`/members?${query}`)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, [page, status, search]);
  useEffect(load, [load]);

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(keyword.trim());
    setPage(0);
  };

  const toggle = async (member: AdminMember) => {
    const next: Status = member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const question = next === "SUSPENDED" ? `${member.email} 회원을 정지할까요? 로그인할 수 없게 돼요.` : `${member.email} 회원의 정지를 풀까요?`;
    if (!window.confirm(question)) return;
    try {
      const updated = await adminApi<AdminMember>(`/members/${member.id}/status`, { method: "PATCH", body: { status: next } });
      setData((current) => current && { ...current, content: current.content.map((item) => (item.id === updated.id ? updated : item)) });
      toast(next === "SUSPENDED" ? "정지했어요." : "정지를 풀었어요.");
    } catch (caught) {
      toast(errorMessage(caught), true);
    }
  };

  /** 다른 관리자의 2단계 인증 초기화 (자기 자신은 BE 가 막는다) */
  const resetOtp = async (member: AdminMember) => {
    if (!window.confirm(`${member.email} 관리자의 2단계 인증을 초기화할까요? 다음 로그인 때 OTP 앱을 다시 등록해야 해요.`)) return;
    try {
      const updated = await adminApi<AdminMember>(`/members/${member.id}/otp`, { method: "DELETE" });
      setData((current) => current && { ...current, content: current.content.map((item) => (item.id === updated.id ? updated : item)) });
      toast("2단계 인증을 초기화했어요.");
    } catch (caught) {
      toast(errorMessage(caught), true);
    }
  };

  return (
    <>
      <Top
        crumb="STORE / MEMBERS"
        title="회원 관리"
        actions={
          <Link className="btn" href="/admin/members/import">
            아임웹 회원 가져오기
          </Link>
        }
      />
      <div className="card">
        <div className="toolbar">
          <Chips
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(0);
            }}
            options={[
              { value: null, label: "전체" },
              { value: "ACTIVE", label: "정상" },
              { value: "SUSPENDED", label: "정지" },
            ]}
          />
          <form className="spacer" onSubmit={onSearch} style={{ display: "flex", gap: 6 }}>
            <input className="input" placeholder="이메일로 검색" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            <button className="btn sm" type="submit">
              검색
            </button>
          </form>
        </div>
        {error && <p className="alert">{error}</p>}
        {!data ? (
          <div className="loading">불러오는 중…</div>
        ) : data.content.length === 0 ? (
          <div className="empty">회원이 없어요.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>번호</th>
                  <th>이메일</th>
                  <th>이름</th>
                  <th>언어</th>
                  <th>마케팅</th>
                  <th className="num">적립금</th>
                  <th>권한</th>
                  <th>상태</th>
                  <th>가입일</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.content.map((member) => (
                  <tr key={member.id}>
                    <td className="mono muted">{member.id}</td>
                    <td className="mono">{member.email}</td>
                    <td>{member.name}</td>
                    <td className="muted">{LANGUAGE[member.language] ?? member.language}</td>
                    <td>{member.marketingConsent ? <span className="badge green">동의</span> : <span className="muted">-</span>}</td>
                    <td className="num">
                      <button
                        className="btn sm"
                        type="button"
                        aria-expanded={pointsOf?.id === member.id}
                        onClick={() => setPointsOf(pointsOf?.id === member.id ? null : member)}
                        title="적립금 내역 보기 · 지급 · 차감"
                      >
                        {money(member.pointBalance, "KRW")}
                      </button>
                    </td>
                    <td>
                      {member.role === "ADMIN" ? (
                        <>
                          <span className="badge violet">관리자</span>
                          <span className={`badge ${member.otpEnabled ? "green" : "amber"}`} style={{ marginLeft: 4 }} title="관리자 2단계 인증 (OTP 앱)">
                            {member.otpEnabled ? "OTP 사용" : "OTP 미등록"}
                          </span>
                        </>
                      ) : (
                        <span className="muted">회원</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${member.status === "ACTIVE" ? "green" : "red"}`}>{member.status === "ACTIVE" ? "정상" : "정지"}</span>
                      {member.legacySource && (
                        <span className={`badge ${member.passwordSet ? "blue" : "amber"}`} style={{ marginLeft: 4 }} title="아임웹에서 옮겨 온 회원">
                          {member.passwordSet ? "아임웹 이전" : "비밀번호 미설정"}
                        </span>
                      )}
                    </td>
                    <td className="mono muted">{dateOnly(member.createdAt)}</td>
                    <td className="num">
                      {member.role !== "ADMIN" && (
                        <button className={`btn sm${member.status === "ACTIVE" ? " danger" : ""}`} type="button" onClick={() => toggle(member)}>
                          {member.status === "ACTIVE" ? "정지" : "정지 해제"}
                        </button>
                      )}
                      {member.role === "ADMIN" && member.otpEnabled && (
                        <button className="btn sm" type="button" onClick={() => resetOtp(member)} title="휴대폰 분실·잠김 때. 다음 로그인 때 OTP 앱을 다시 등록해요">
                          OTP 초기화
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={data.page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />}
      </div>
      {pointsOf && (
        <MemberPoints
          key={pointsOf.id}
          member={pointsOf}
          onClose={() => setPointsOf(null)}
          onChanged={(balance) =>
            setData((current) => current && { ...current, content: current.content.map((item) => (item.id === pointsOf.id ? { ...item, pointBalance: balance } : item)) })
          }
        />
      )}
    </>
  );
}

type PointHistory = { id: number; type: string; amount: number; balanceAfter: number; orderNumber: string | null; memo: string | null; createdAt: string };
type MemberPointsData = { balance: number; histories: Page<PointHistory> };

const POINT_TYPE: Record<string, string> = {
  EARN: "배송 완료 적립",
  USE: "주문 사용",
  USE_CANCEL: "주문 취소 반환",
  EARN_CANCEL: "반품 회수",
  ADMIN: "관리자 조정",
  MIGRATION: "아임웹 이전",
};

/** 회원 한 명의 적립금: 잔액 · 기록 · 지급(+)/차감(-). 사유는 회원 마이페이지 기록에도 그대로 보인다 */
function MemberPoints({ member, onClose, onChanged }: { member: AdminMember; onClose: () => void; onChanged: (balance: number) => void }) {
  const [points, setPoints] = useState<MemberPointsData | null>(null);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi<MemberPointsData>(`/members/${member.id}/points?size=30`)
      .then(setPoints)
      .catch((caught) => toast(errorMessage(caught), true));
  }, [member.id]);

  const adjust = async (sign: 1 | -1) => {
    const value = Math.floor(Number(amount.replace(/\D/g, "")) || 0);
    if (value <= 0) return toast("금액을 넣어 주세요.", true);
    if (!memo.trim()) return toast("사유를 적어 주세요. 회원 마이페이지에도 보여요.", true);
    const verb = sign > 0 ? "지급" : "차감";
    if (!window.confirm(`${member.email} 회원에게 ${money(value, "KRW")}을 ${verb}할까요?`)) return;
    setBusy(true);
    try {
      const next = await adminApi<MemberPointsData>(`/members/${member.id}/points`, { method: "POST", body: { amount: sign * value, memo: memo.trim() } });
      setPoints(next);
      onChanged(next.balance);
      setAmount("");
      setMemo("");
      toast(`${verb}했어요. 잔액 ${money(next.balance, "KRW")}`);
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h">
        <h2>
          적립금 · <span className="mono">{member.email}</span>
        </h2>
        <button className="btn sm" type="button" onClick={onClose}>
          닫기
        </button>
      </div>
      <div className="card-b grid3">
        <dl className="kv">
          <dt>잔액</dt>
          <dd className="mono">{points ? money(points.balance, "KRW") : "-"}</dd>
        </dl>
        <label className="field">
          <span>금액 (원)</span>
          <input className="input mono" inputMode="numeric" placeholder="예: 3000" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} />
        </label>
        <label className="field">
          <span>사유 (회원에게도 보여요)</span>
          <input className="input" maxLength={200} placeholder="예: 배송 지연 보상" value={memo} onChange={(event) => setMemo(event.target.value)} />
        </label>
      </div>
      <div className="card-b" style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 0 }}>
        <button className="btn danger" type="button" disabled={busy} onClick={() => adjust(-1)}>
          차감
        </button>
        <button className="btn primary" type="button" disabled={busy} onClick={() => adjust(1)}>
          지급
        </button>
      </div>
      {!points ? (
        <div className="loading">불러오는 중…</div>
      ) : points.histories.content.length === 0 ? (
        <div className="empty">적립금 기록이 없어요.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>날짜</th>
                <th>구분</th>
                <th className="num">금액</th>
                <th className="num">잔액</th>
                <th>주문번호 · 사유</th>
              </tr>
            </thead>
            <tbody>
              {points.histories.content.map((history) => (
                <tr key={history.id}>
                  <td className="mono muted">{dateOnly(history.createdAt)}</td>
                  <td>{POINT_TYPE[history.type] ?? history.type}</td>
                  <td className="num mono" style={{ color: history.amount < 0 ? "var(--red, #c8231a)" : undefined }}>
                    {history.amount > 0 ? "+" : "−"}
                    {money(Math.abs(history.amount), "KRW")}
                  </td>
                  <td className="num mono muted">{money(history.balanceAfter, "KRW")}</td>
                  <td className="muted">{[history.orderNumber, history.memo].filter(Boolean).join(" · ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

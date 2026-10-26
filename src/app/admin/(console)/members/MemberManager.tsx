"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Chips, Pager, Top } from "../../_components/ui";
import { adminApi, dateOnly, errorMessage, toast, type AdminMember, type Page } from "../../_lib/admin";

type Status = AdminMember["status"];
const LANGUAGE: Record<string, string> = { ko: "한국어", en: "English", ja: "日本語", "zh-CN": "中文" };

export default function MemberManager() {
  const [status, setStatus] = useState<Status | null>(null);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AdminMember> | null>(null);
  const [error, setError] = useState("");

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
                    <td>{member.role === "ADMIN" ? <span className="badge violet">관리자</span> : <span className="muted">회원</span>}</td>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={data.page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />}
      </div>
    </>
  );
}

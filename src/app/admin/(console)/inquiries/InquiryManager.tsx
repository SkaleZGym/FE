"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Chips, Drawer, Pager, Top, useQueryParam } from "../../_components/ui";
import { adminApi, dateTime, errorMessage, INQUIRY_CATEGORY, toast, type AdminInquiry, type Page } from "../../_lib/admin";

type Status = AdminInquiry["status"];

export default function InquiryManager() {
  const statusParam = useQueryParam("status");
  const [picked, setPicked] = useState<{ status: Status | null } | null>(null);
  const status = picked ? picked.status : statusParam === "WAITING" || statusParam === "ANSWERED" ? statusParam : null;
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AdminInquiry> | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminInquiry | null>(null);
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const query = new URLSearchParams({ page: String(page), size: "20" });
    if (status) query.set("status", status);
    adminApi<Page<AdminInquiry>>(`/inquiries?${query}`)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, [page, status]);
  useEffect(load, [load]);

  const show = (inquiry: AdminInquiry) => {
    setSelected(inquiry);
    setAnswer(inquiry.answer ?? "");
    setOpen(true);
  };
  const close = useCallback(() => setOpen(false), []);

  const save = async () => {
    if (!selected || !answer.trim()) return toast("답변을 입력해 주세요.", true);
    setBusy(true);
    try {
      const updated = await adminApi<AdminInquiry>(`/inquiries/${selected.id}/answer`, { method: "PUT", body: { answer: answer.trim() } });
      setSelected(updated);
      setData((current) => current && { ...current, content: current.content.map((item) => (item.id === updated.id ? updated : item)) });
      toast("답변을 등록했어요. 고객 마이페이지에 바로 보여요.");
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Top crumb="STORE / INQUIRIES" title="1:1 문의" />
      <div className="card">
        <div className="toolbar">
          <Chips
            value={status}
            onChange={(value) => {
              setPicked({ status: value });
              setPage(0);
            }}
            options={[
              { value: null, label: "전체" },
              { value: "WAITING", label: "답변 대기" },
              { value: "ANSWERED", label: "답변 완료" },
            ]}
          />
        </div>
        {error && <p className="alert">{error}</p>}
        {!data ? (
          <div className="loading">불러오는 중…</div>
        ) : data.content.length === 0 ? (
          <div className="empty">문의가 없어요.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>유형</th>
                  <th>제목</th>
                  <th>관련 주문</th>
                  <th>상태</th>
                  <th>문의 시각</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((inquiry) => (
                  <tr key={inquiry.id} className="click" onClick={() => show(inquiry)}>
                    <td className="muted">{INQUIRY_CATEGORY[inquiry.category]}</td>
                    <td>
                      <b style={{ fontWeight: 500 }}>{inquiry.title}</b>
                    </td>
                    <td className="mono muted">{inquiry.orderNumber ?? "-"}</td>
                    <td>
                      <span className={`badge ${inquiry.status === "WAITING" ? "amber" : "green"}`}>{inquiry.status === "WAITING" ? "답변 대기" : "답변 완료"}</span>
                    </td>
                    <td className="mono muted">{dateTime(inquiry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={data.page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />}
      </div>

      <Drawer
        open={open}
        title="문의 상세"
        onClose={close}
        footer={
          <button className="btn primary" type="button" onClick={save} disabled={busy}>
            {selected?.status === "ANSWERED" ? "답변 고쳐 저장" : "답변 등록"}
          </button>
        }
      >
        {selected && (
          <>
            <dl className="kv">
              <dt>유형</dt>
              <dd>{INQUIRY_CATEGORY[selected.category]}</dd>
              <dt>회원 번호</dt>
              <dd className="mono">{selected.memberId}</dd>
              <dt>관련 주문</dt>
              <dd>
                {selected.orderNumber ? (
                  <Link className="mono" href={`/admin/orders?open=${selected.orderNumber}`} style={{ textDecoration: "underline" }}>
                    {selected.orderNumber}
                  </Link>
                ) : (
                  "-"
                )}
              </dd>
              <dt>문의 시각</dt>
              <dd className="mono">{dateTime(selected.createdAt)}</dd>
            </dl>
            <div>
              <div className="sec-title">{selected.title}</div>
              <div className="bubble">{selected.content}</div>
            </div>
            {selected.answer && (
              <div>
                <div className="sec-title">등록된 답변 · {dateTime(selected.answeredAt)}</div>
                <div className="bubble answer">{selected.answer}</div>
              </div>
            )}
            <label className="field">
              <span>{selected.answer ? "답변 고치기" : "답변"}</span>
              <textarea className="textarea" style={{ minHeight: 160 }} value={answer} maxLength={2000} onChange={(event) => setAnswer(event.target.value)} />
            </label>
          </>
        )}
      </Drawer>
    </>
  );
}

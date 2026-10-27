"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Chips, Drawer, Pager, Top, useQueryParam } from "../../_components/ui";
import {
  adminApi,
  CLAIM_REASON,
  CLAIM_STATUS,
  CLAIM_TYPE,
  COMPANY_FAULT,
  COURIERS,
  dateTime,
  errorMessage,
  fromMinor,
  money,
  toast,
  toMinor,
  type AdminClaim,
  type ClaimStatus,
  type Page,
} from "../../_lib/admin";

const STATUSES = Object.keys(CLAIM_STATUS) as ClaimStatus[];

/**
 * 교환·반품 처리: 접수 → 승인(회수 안내) → 상품 확인 후 완료.
 * 반품 완료 때 환불 금액을 정하면 결제사 환불 + 재고 복구가 함께 된다
 */
export default function ClaimManager() {
  const statusParam = useQueryParam("status") as ClaimStatus | null;
  const [picked, setPicked] = useState<{ status: ClaimStatus | null } | null>(null);
  const status = picked ? picked.status : statusParam && STATUSES.includes(statusParam) ? statusParam : null;
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AdminClaim> | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminClaim | null>(null);
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [refund, setRefund] = useState("");
  const [courier, setCourier] = useState("CJ");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const query = new URLSearchParams({ page: String(page), size: "20" });
    if (status) query.set("status", status);
    adminApi<Page<AdminClaim>>(`/claims?${query}`)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, [page, status]);
  useEffect(load, [load]);

  const show = (claim: AdminClaim) => {
    setSelected(claim);
    setMemo(claim.adminMemo ?? "");
    setRefund(fromMinor(claim.refundAmount ?? claim.itemsAmount, claim.currency));
    setCourier(claim.courier ?? "CJ");
    setTracking(claim.trackingNumber ?? "");
    setOpen(true);
  };
  const close = useCallback(() => setOpen(false), []);

  const act = async (action: "approve" | "reject" | "complete") => {
    if (!selected) return;
    let body: unknown = { memo: memo.trim() || null };
    if (action === "reject" && !memo.trim()) return toast("거절 사유를 안내 칸에 적어 주세요. 고객에게 보여요.", true);
    if (action === "complete") {
      body =
        selected.type === "RETURN"
          ? { refundAmount: toMinor(refund, selected.currency) }
          : tracking.trim()
            ? { courier, trackingNumber: tracking.trim() }
            : {};
      const confirmText =
        selected.type === "RETURN"
          ? `${money(toMinor(refund, selected.currency), selected.currency)} 을(를) 환불하고 재고를 되돌릴까요? 되돌릴 수 없어요.`
          : "교환을 완료로 바꿀까요?";
      if (!window.confirm(confirmText)) return;
    }
    setBusy(true);
    try {
      const updated = await adminApi<AdminClaim>(`/claims/${selected.id}/${action}`, { method: "POST", body });
      setSelected(updated);
      setData((current) => current && { ...current, content: current.content.map((item) => (item.id === updated.id ? updated : item)) });
      toast(action === "approve" ? "승인했어요. 고객 마이페이지에 안내가 보여요." : action === "reject" ? "거절했어요." : "완료 처리했어요.");
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  const open_ = selected && (selected.status === "REQUESTED" || selected.status === "APPROVED");

  return (
    <>
      <Top crumb="STORE / CLAIMS" title="교환·반품" />
      <div className="notice">
        <span>ⓘ</span>
        <span>
          고객은 <b>배송 완료 후 7일 안에</b> 마이페이지에서 신청해요. 승인하면 안내 문구가 고객에게 보이고, 상품을 받은 뒤 <b>완료</b>를 누르면 반품은 환불·재고
          복구까지 함께 처리돼요.
        </span>
      </div>
      <div className="card">
        <div className="toolbar">
          <Chips
            value={status}
            onChange={(value) => {
              setPicked({ status: value });
              setPage(0);
            }}
            options={[{ value: null, label: "전체" }, ...STATUSES.map((key) => ({ value: key, label: CLAIM_STATUS[key].label }))]}
          />
        </div>
        {error && <p className="alert">{error}</p>}
        {!data ? (
          <div className="loading">불러오는 중…</div>
        ) : data.content.length === 0 ? (
          <div className="empty">신청이 없어요.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>종류</th>
                  <th>주문번호</th>
                  <th>상품</th>
                  <th>사유</th>
                  <th>상태</th>
                  <th>신청 시각</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((claim) => (
                  <tr key={claim.id} className="click" onClick={() => show(claim)}>
                    <td>
                      <b style={{ fontWeight: 500 }}>{CLAIM_TYPE[claim.type]}</b>
                    </td>
                    <td className="mono muted">{claim.orderNumber}</td>
                    <td className="clip">
                      {claim.items[0]?.productName}
                      {claim.items.length > 1 && ` 외 ${claim.items.length - 1}건`}
                    </td>
                    <td className="muted">{CLAIM_REASON[claim.reason]}</td>
                    <td>
                      <span className={`badge ${CLAIM_STATUS[claim.status].tone}`}>{CLAIM_STATUS[claim.status].label}</span>
                    </td>
                    <td className="mono muted">{dateTime(claim.createdAt)}</td>
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
        title={selected ? `${CLAIM_TYPE[selected.type]} 신청` : "신청 상세"}
        onClose={close}
        footer={
          open_ && (
            <>
              <button className="btn danger left" type="button" onClick={() => act("reject")} disabled={busy}>
                거절
              </button>
              {selected?.status === "REQUESTED" ? (
                <button className="btn primary" type="button" onClick={() => act("approve")} disabled={busy}>
                  승인 (회수 안내)
                </button>
              ) : (
                <button className="btn primary" type="button" onClick={() => act("complete")} disabled={busy}>
                  {selected?.type === "RETURN" ? "환불하고 완료" : "교환 완료"}
                </button>
              )}
            </>
          )
        }
      >
        {selected && (
          <>
            <dl className="kv">
              <dt>상태</dt>
              <dd>
                <span className={`badge ${CLAIM_STATUS[selected.status].tone}`}>{CLAIM_STATUS[selected.status].label}</span>
              </dd>
              <dt>주문</dt>
              <dd>
                <Link className="mono" href={`/admin/orders?open=${selected.orderNumber}`} style={{ textDecoration: "underline" }}>
                  {selected.orderNumber}
                </Link>{" "}
                · {selected.recipient} · 결제 {money(selected.orderTotal, selected.currency)}
              </dd>
              <dt>사유</dt>
              <dd>
                {CLAIM_REASON[selected.reason]}{" "}
                <span className="muted">({COMPANY_FAULT.includes(selected.reason) ? "배송비 회사 부담" : "배송비 고객 부담"})</span>
              </dd>
              <dt>신청 시각</dt>
              <dd className="mono">{dateTime(selected.createdAt)}</dd>
              {selected.completedAt && (
                <>
                  <dt>완료 시각</dt>
                  <dd className="mono">{dateTime(selected.completedAt)}</dd>
                </>
              )}
            </dl>

            <div>
              <div className="sec-title">신청 상품 · 상품 금액 {money(selected.itemsAmount, selected.currency)}</div>
              <ul className="lines">
                {selected.items.map((item) => (
                  <li key={item.orderItemId}>
                    {item.productName} · {item.size}
                    {item.exchangeSize && <b> → {item.exchangeSize}</b>}
                    <span className="q">× {item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
            {selected.detail && (
              <div>
                <div className="sec-title">고객 메모</div>
                <div className="bubble">{selected.detail}</div>
              </div>
            )}

            {open_ && (
              <label className="field">
                <span>고객 안내 (승인 시 회수 방법, 거절 시 사유)</span>
                <textarea
                  className="textarea"
                  style={{ minHeight: 100 }}
                  value={memo}
                  maxLength={1000}
                  placeholder="예: 내일 CJ대한통운 기사님이 회수하러 방문해요. 받은 상태 그대로 포장해 주세요."
                  onChange={(event) => setMemo(event.target.value)}
                />
              </label>
            )}
            {!open_ && selected.adminMemo && (
              <div>
                <div className="sec-title">고객 안내</div>
                <div className="bubble answer">{selected.adminMemo}</div>
              </div>
            )}

            {selected.status === "APPROVED" && selected.type === "RETURN" && (
              <label className="field">
                <span>환불 금액 ({selected.currency === "USD" ? "달러" : "원"})</span>
                <input className="input mono" inputMode="decimal" value={refund} onChange={(event) => setRefund(event.target.value)} />
                <small>
                  기본값은 신청 상품 금액이에요. 고객 부담 반품이면 왕복 배송비를 빼고, 쿠폰 할인이 있었다면 그만큼 조정해 주세요. 최대 {money(selected.orderTotal, selected.currency)}
                </small>
              </label>
            )}
            {selected.status === "APPROVED" && selected.type === "EXCHANGE" && (
              <div className="grid2">
                <label className="field">
                  <span>교환 상품 택배사</span>
                  <select className="select" value={courier} onChange={(event) => setCourier(event.target.value)}>
                    {COURIERS.map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>송장번호 (선택)</span>
                  <input className="input mono" value={tracking} maxLength={50} onChange={(event) => setTracking(event.target.value)} />
                </label>
              </div>
            )}
            {selected.refundAmount !== null && (
              <dl className="kv">
                <dt>환불 금액</dt>
                <dd className="mono">{money(selected.refundAmount, selected.currency)}</dd>
              </dl>
            )}
            {selected.trackingUrl && (
              <a className="btn sm" href={selected.trackingUrl} target="_blank" rel="noopener noreferrer">
                교환 상품 배송 조회 ↗
              </a>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}

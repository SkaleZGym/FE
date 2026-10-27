"use client";

import { useCallback, useEffect, useState } from "react";
import { Chips, Drawer, Pager, Top, useQueryParam } from "../../_components/ui";
import { COURIERS, adminApi, dateTime, errorMessage, money, ORDER_STATUS, toast, type AdminOrder, type OrderStatus, type Page } from "../../_lib/admin";

const STATUSES = Object.keys(ORDER_STATUS) as OrderStatus[];
const FLOW: OrderStatus[] = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"];
export default function OrderManager() {
  const statusParam = useQueryParam("status") as OrderStatus | null;
  const openParam = useQueryParam("open");
  const [picked, setPicked] = useState<{ status: OrderStatus | null } | null>(null);
  const status = picked ? picked.status : statusParam && STATUSES.includes(statusParam) ? statusParam : null;
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AdminOrder> | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [open, setOpen] = useState(false);
  const [courier, setCourier] = useState("CJ");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const query = new URLSearchParams({ page: String(page), size: "20" });
    if (status) query.set("status", status);
    adminApi<Page<AdminOrder>>(`/orders?${query}`)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, [page, status]);
  useEffect(load, [load]);

  const show = useCallback((order: AdminOrder) => {
    setSelected(order);
    setCourier(order.courier ?? "CJ");
    setTracking(order.trackingNumber ?? "");
    setOpen(true);
  }, []);

  // 대시보드의 '최근 주문'에서 넘어오면 그 주문 상세를 바로 연다
  useEffect(() => {
    if (!openParam) return;
    adminApi<AdminOrder>(`/orders/${encodeURIComponent(openParam)}`)
      .then(show)
      .catch((caught) => toast(errorMessage(caught), true));
  }, [openParam, show]);

  const close = useCallback(() => setOpen(false), []);

  const apply = (updated: AdminOrder) => {
    setSelected(updated);
    setData((current) => current && { ...current, content: current.content.map((item) => (item.orderNumber === updated.orderNumber ? updated : item)) });
  };

  const change = async (next: OrderStatus) => {
    if (!selected) return;
    if (next === "SHIPPED" && !tracking.trim()) return toast("송장번호를 입력해 주세요.", true);
    setBusy(true);
    try {
      const body = next === "SHIPPED" ? { status: next, courier, trackingNumber: tracking.trim() } : { status: next };
      apply(await adminApi<AdminOrder>(`/orders/${selected.orderNumber}/status`, { method: "PATCH", body }));
      toast(`${ORDER_STATUS[next].label}(으)로 바꿨어요.`);
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!selected || !window.confirm("이 주문을 취소할까요? 결제된 금액은 PG로 환불 요청돼요.")) return;
    setBusy(true);
    try {
      apply(await adminApi<AdminOrder>(`/orders/${selected.orderNumber}/cancel`, { method: "POST" }));
      toast("주문을 취소했어요.");
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  const step = selected ? FLOW.indexOf(selected.status) : -1;

  return (
    <>
      <Top crumb="STORE / ORDERS" title="주문 관리" />
      <div className="card">
        <div className="toolbar">
          <Chips
            value={status}
            onChange={(value) => {
              setPicked({ status: value });
              setPage(0);
            }}
            options={[{ value: null, label: "전체" }, ...STATUSES.map((value) => ({ value, label: ORDER_STATUS[value].label }))]}
          />
        </div>
        {error && <p className="alert">{error}</p>}
        {!data ? (
          <div className="loading">불러오는 중…</div>
        ) : data.content.length === 0 ? (
          <div className="empty">주문이 없어요.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>주문번호</th>
                  <th>상태</th>
                  <th>받는 분</th>
                  <th>상품</th>
                  <th className="num">결제 금액</th>
                  <th>주문 시각</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((order) => (
                  <tr key={order.orderNumber} className="click" onClick={() => show(order)}>
                    <td className="mono">{order.orderNumber}</td>
                    <td>
                      <span className={`badge ${ORDER_STATUS[order.status].tone}`}>{ORDER_STATUS[order.status].label}</span>
                    </td>
                    <td>{order.shippingAddress.recipient}</td>
                    <td className="muted">
                      {order.items[0]?.productName}
                      {order.items.length > 1 && ` 외 ${order.items.length - 1}건`}
                    </td>
                    <td className="num">{money(order.totalAmount, order.currency)}</td>
                    <td className="mono muted">{dateTime(order.createdAt)}</td>
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
        title={selected ? `주문 ${selected.orderNumber}` : "주문"}
        onClose={close}
        footer={
          selected && (
            <>
              {(selected.status === "PENDING_PAYMENT" || selected.status === "PAID") && (
                <button className="btn danger left" type="button" onClick={cancel} disabled={busy}>
                  주문 취소
                </button>
              )}
              {selected.status === "PAID" && (
                <button className="btn" type="button" onClick={() => change("PREPARING")} disabled={busy}>
                  상품 준비로
                </button>
              )}
              {(selected.status === "PAID" || selected.status === "PREPARING") && (
                <button className="btn primary" type="button" onClick={() => change("SHIPPED")} disabled={busy}>
                  출고 (배송 중)
                </button>
              )}
              {selected.status === "SHIPPED" && (
                <button className="btn primary" type="button" onClick={() => change("DELIVERED")} disabled={busy}>
                  배송 완료로
                </button>
              )}
            </>
          )
        }
      >
        {selected && (
          <>
            {selected.status === "CANCELLED" || selected.status === "PENDING_PAYMENT" ? (
              <span className={`badge ${ORDER_STATUS[selected.status].tone}`}>{ORDER_STATUS[selected.status].label}</span>
            ) : (
              <div className="steps">
                {FLOW.map((value, index) => (
                  <span key={value} className={index < step ? "done" : index === step ? "now" : ""}>
                    {ORDER_STATUS[value].label}
                  </span>
                ))}
              </div>
            )}

            {(selected.status === "PAID" || selected.status === "PREPARING") && (
              <div className="grid2">
                <label className="field">
                  <span>택배사</span>
                  <select className="select" value={courier} onChange={(event) => setCourier(event.target.value)}>
                    {COURIERS.map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>송장번호</span>
                  <input className="input mono" value={tracking} onChange={(event) => setTracking(event.target.value)} maxLength={50} placeholder="출고할 때 입력" />
                </label>
              </div>
            )}

            <div>
              <div className="sec-title">주문 상품</div>
              <ul className="lines">
                {selected.items.map((item) => (
                  <li key={item.variantId}>
                    <span>
                      {item.productName} <span className="mono muted">· {item.size}</span>
                    </span>
                    <span className="q">
                      {money(item.unitPrice, selected.currency)} × {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <dl className="kv">
              <dt>상품 금액</dt>
              <dd className="mono">{money(selected.itemsAmount, selected.currency)}</dd>
              {selected.discountAmount > 0 && (
                <>
                  <dt>할인</dt>
                  <dd className="mono">
                    −{money(selected.discountAmount, selected.currency)} ({selected.couponCode})
                  </dd>
                </>
              )}
              <dt>배송비</dt>
              <dd className="mono">{money(selected.shippingFee, selected.currency)}</dd>
              <dt>결제 금액</dt>
              <dd className="mono">
                <b>{money(selected.totalAmount, selected.currency)}</b>
              </dd>
              <dt>결제 번호</dt>
              <dd className="mono">{selected.paymentId ?? "-"}</dd>
            </dl>

            <dl className="kv">
              <dt>받는 분</dt>
              <dd>{selected.shippingAddress.recipient}</dd>
              <dt>연락처</dt>
              <dd className="mono">{selected.shippingAddress.phone}</dd>
              <dt>주소</dt>
              <dd>
                [{selected.shippingAddress.postalCode}] {selected.shippingAddress.address1} {selected.shippingAddress.address2}
                {selected.shippingAddress.countryCode !== "KR" && ` (${selected.shippingAddress.countryCode})`}
              </dd>
              <dt>회원 번호</dt>
              <dd className="mono">{selected.memberId}</dd>
            </dl>

            <dl className="kv">
              <dt>주문</dt>
              <dd className="mono">{dateTime(selected.createdAt)}</dd>
              <dt>결제</dt>
              <dd className="mono">{dateTime(selected.paidAt)}</dd>
              <dt>출고</dt>
              <dd className="mono">
                {dateTime(selected.shippedAt)}
                {selected.trackingUrl && (
                  <>
                    {" · "}
                    <a href={selected.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                      {selected.courier} {selected.trackingNumber}
                    </a>
                  </>
                )}
              </dd>
              <dt>배송 완료</dt>
              <dd className="mono">{dateTime(selected.deliveredAt)}</dd>
            </dl>
          </>
        )}
      </Drawer>
    </>
  );
}

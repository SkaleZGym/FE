"use client";

import { useCallback, useEffect, useState } from "react";
import { Drawer, Pager, Top } from "../../_components/ui";
import { adminApi, dateOnly, errorMessage, fromMinor, money, toast, toMinor, type AdminCoupon, type Page } from "../../_lib/admin";

/** 금액 칸은 화면 단위(원 · 달러)로 받고 저장할 때 최소 단위로 바꾼다 */
type Draft = {
  id: number | null;
  code: string;
  name: string;
  currency: AdminCoupon["currency"];
  discountType: AdminCoupon["discountType"];
  discountValue: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  startAt: string;
  endAt: string;
  usageLimit: string;
  perMemberLimit: string;
  active: boolean;
};

/** ISO ↔ <input type="datetime-local"> (한국 시간 기준 화면) */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

const blank = (): Draft => ({
  id: null,
  code: "",
  name: "",
  currency: "KRW",
  discountType: "PERCENT",
  discountValue: "10",
  maxDiscountAmount: "",
  minOrderAmount: "0",
  startAt: "",
  endAt: "",
  usageLimit: "",
  perMemberLimit: "1",
  active: true,
});

const toDraft = (coupon: AdminCoupon): Draft => ({
  id: coupon.id,
  code: coupon.code,
  name: coupon.name,
  currency: coupon.currency,
  discountType: coupon.discountType,
  discountValue: coupon.discountType === "PERCENT" ? String(coupon.discountValue) : fromMinor(coupon.discountValue, coupon.currency),
  maxDiscountAmount: fromMinor(coupon.maxDiscountAmount, coupon.currency),
  minOrderAmount: fromMinor(coupon.minOrderAmount, coupon.currency),
  startAt: toLocalInput(coupon.startAt),
  endAt: toLocalInput(coupon.endAt),
  usageLimit: coupon.usageLimit === null ? "" : String(coupon.usageLimit),
  perMemberLimit: String(coupon.perMemberLimit),
  active: coupon.active,
});

const discountText = (coupon: AdminCoupon) =>
  coupon.discountType === "PERCENT"
    ? `${coupon.discountValue}%${coupon.maxDiscountAmount ? ` (최대 ${money(coupon.maxDiscountAmount, coupon.currency)})` : ""}`
    : money(coupon.discountValue, coupon.currency);

export default function CouponManager() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AdminCoupon> | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi<Page<AdminCoupon>>(`/coupons?page=${page}&size=20`)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, [page]);
  useEffect(load, [load]);

  const edit = (next: Draft) => {
    setDraft(next);
    setOpen(true);
  };
  const close = useCallback(() => setOpen(false), []);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => current && { ...current, [key]: value });

  const save = async () => {
    if (!draft) return;
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(draft.code.trim())) return toast("코드는 영문·숫자·-·_ 3~30자로 적어 주세요.", true);
    if (!draft.name.trim()) return toast("쿠폰 이름을 적어 주세요.", true);
    const percent = draft.discountType === "PERCENT";
    const body = {
      code: draft.code.trim().toUpperCase(),
      name: draft.name.trim(),
      discountType: draft.discountType,
      discountValue: percent ? Number(draft.discountValue) : toMinor(draft.discountValue, draft.currency),
      maxDiscountAmount: percent && draft.maxDiscountAmount ? toMinor(draft.maxDiscountAmount, draft.currency) : null,
      minOrderAmount: toMinor(draft.minOrderAmount, draft.currency),
      currency: draft.currency,
      startAt: fromLocalInput(draft.startAt),
      endAt: fromLocalInput(draft.endAt),
      usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null,
      perMemberLimit: Number(draft.perMemberLimit) || 1,
      active: draft.active,
    };
    if (percent && (body.discountValue < 1 || body.discountValue > 100)) return toast("할인율은 1~100 사이로 적어 주세요.", true);
    setBusy(true);
    try {
      const saved = await adminApi<AdminCoupon>(draft.id ? `/coupons/${draft.id}` : "/coupons", { method: draft.id ? "PUT" : "POST", body });
      setDraft(toDraft(saved));
      toast("저장했어요.");
      load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  const unit = draft?.currency === "USD" ? "달러" : "원";

  return (
    <>
      <Top
        crumb="STORE / COUPONS"
        title="쿠폰"
        actions={
          <button className="btn primary" type="button" onClick={() => edit(blank())}>
            + 새 쿠폰
          </button>
        }
      />
      <div className="notice">
        <span>ⓘ</span>
        <span>
          고객이 장바구니·주문서에서 <b>코드</b>를 입력하면 할인돼요. 원화(한국어 화면)와 달러(해외 화면) 쿠폰은 따로 만들어요. 기간을 비우면 끌 때까지 계속 쓸 수
          있어요.
        </span>
      </div>
      <div className="card">
        {error && <p className="alert">{error}</p>}
        {!data ? (
          <div className="loading">불러오는 중…</div>
        ) : data.content.length === 0 ? (
          <div className="empty">아직 쿠폰이 없어요.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>코드</th>
                  <th>이름</th>
                  <th>할인</th>
                  <th>최소 주문</th>
                  <th>기간</th>
                  <th>사용</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((coupon) => (
                  <tr key={coupon.id} className="click" onClick={() => edit(toDraft(coupon))}>
                    <td className="mono">
                      <b style={{ fontWeight: 600 }}>{coupon.code}</b>
                    </td>
                    <td>{coupon.name}</td>
                    <td className="mono">{discountText(coupon)}</td>
                    <td className="mono muted">{coupon.minOrderAmount ? money(coupon.minOrderAmount, coupon.currency) : "-"}</td>
                    <td className="mono muted">{coupon.startAt || coupon.endAt ? `${dateOnly(coupon.startAt)} ~ ${dateOnly(coupon.endAt)}` : "상시"}</td>
                    <td className="mono muted">
                      {coupon.usedCount}
                      {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                    </td>
                    <td>
                      <span className={`badge ${coupon.active ? "green" : ""}`}>{coupon.active ? "사용 중" : "꺼짐"}</span>
                    </td>
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
        title={draft?.id ? "쿠폰 수정" : "새 쿠폰"}
        onClose={close}
        footer={
          <>
            <button className="btn" type="button" onClick={close}>
              닫기
            </button>
            <button className="btn primary" type="button" onClick={save} disabled={busy}>
              {busy ? "저장 중…" : "저장"}
            </button>
          </>
        }
      >
        {draft && (
          <div className="form-stack">
            <div className="grid2">
              <label className="field">
                <span>코드 *</span>
                <input className="input mono" value={draft.code} maxLength={30} placeholder="예: WELCOME10" onChange={(event) => set("code", event.target.value.toUpperCase())} />
              </label>
              <label className="field">
                <span>통화</span>
                <select className="select" value={draft.currency} onChange={(event) => set("currency", event.target.value as Draft["currency"])}>
                  <option value="KRW">원 (한국어 화면)</option>
                  <option value="USD">달러 (해외 화면)</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>이름 * (고객에게 보여요)</span>
              <input className="input" value={draft.name} maxLength={100} placeholder="예: 첫 구매 10% 할인" onChange={(event) => set("name", event.target.value)} />
            </label>
            <div className="grid2">
              <label className="field">
                <span>할인 방식</span>
                <select className="select" value={draft.discountType} onChange={(event) => set("discountType", event.target.value as Draft["discountType"])}>
                  <option value="PERCENT">퍼센트(%)</option>
                  <option value="FIXED">금액</option>
                </select>
              </label>
              <label className="field">
                <span>{draft.discountType === "PERCENT" ? "할인율 (%)" : `할인 금액 (${unit})`}</span>
                <input className="input mono" inputMode="decimal" value={draft.discountValue} onChange={(event) => set("discountValue", event.target.value)} />
              </label>
            </div>
            <div className="grid2">
              {draft.discountType === "PERCENT" && (
                <label className="field">
                  <span>최대 할인 ({unit}, 선택)</span>
                  <input className="input mono" inputMode="decimal" value={draft.maxDiscountAmount} onChange={(event) => set("maxDiscountAmount", event.target.value)} />
                </label>
              )}
              <label className="field">
                <span>최소 주문 금액 ({unit})</span>
                <input className="input mono" inputMode="decimal" value={draft.minOrderAmount} onChange={(event) => set("minOrderAmount", event.target.value)} />
              </label>
            </div>
            <div className="grid2">
              <label className="field">
                <span>시작 (선택)</span>
                <input className="input mono" type="datetime-local" value={draft.startAt} onChange={(event) => set("startAt", event.target.value)} />
              </label>
              <label className="field">
                <span>끝 (선택)</span>
                <input className="input mono" type="datetime-local" value={draft.endAt} onChange={(event) => set("endAt", event.target.value)} />
              </label>
            </div>
            <div className="grid2">
              <label className="field">
                <span>전체 사용 횟수 (비우면 무제한)</span>
                <input className="input mono" inputMode="numeric" value={draft.usageLimit} onChange={(event) => set("usageLimit", event.target.value)} />
              </label>
              <label className="field">
                <span>한 사람당 횟수</span>
                <input className="input mono" inputMode="numeric" value={draft.perMemberLimit} onChange={(event) => set("perMemberLimit", event.target.value)} />
              </label>
            </div>
            <label className="toggle-row">
              <span className="switch">
                <input type="checkbox" checked={draft.active} onChange={(event) => set("active", event.target.checked)} aria-label="사용" />
                <i />
              </span>
              <span>{draft.active ? "사용 중 — 고객이 쓸 수 있어요" : "꺼짐 — 입력해도 안 돼요"}</span>
            </label>
          </div>
        )}
      </Drawer>
    </>
  );
}

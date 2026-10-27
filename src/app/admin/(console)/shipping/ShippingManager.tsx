"use client";

import { useCallback, useEffect, useState } from "react";
import { Top } from "../../_components/ui";
import { adminApi, errorMessage, fromMinor, toast, toMinor, type RemoteArea, type ShippingSetting } from "../../_lib/admin";

type Form = { baseFee: string; freeThreshold: string; jejuExtraFee: string; islandExtraFee: string; autoDeliverDays: string };

const toForm = (setting: ShippingSetting): Form => ({
  baseFee: fromMinor(setting.baseFee, setting.currency),
  freeThreshold: fromMinor(setting.freeThreshold, setting.currency),
  jejuExtraFee: fromMinor(setting.jejuExtraFee, setting.currency),
  islandExtraFee: fromMinor(setting.islandExtraFee, setting.currency),
  autoDeliverDays: String(setting.autoDeliverDays),
});

/** 통화별 배송비 + 제주·도서산간 우편번호 구간 */
export default function ShippingManager() {
  const [settings, setSettings] = useState<ShippingSetting[] | null>(null);
  const [forms, setForms] = useState<Record<string, Form>>({});
  const [areas, setAreas] = useState<RemoteArea[] | null>(null);
  const [error, setError] = useState("");
  const [area, setArea] = useState({ type: "ISLAND" as RemoteArea["type"], zipFrom: "", zipTo: "", memo: "" });

  const load = useCallback(() => {
    Promise.all([adminApi<ShippingSetting[]>("/shipping/settings"), adminApi<RemoteArea[]>("/shipping/remote-areas")])
      .then(([settingList, areaList]) => {
        setSettings(settingList);
        setForms(Object.fromEntries(settingList.map((setting) => [setting.currency, toForm(setting)])));
        setAreas(areaList);
        setError("");
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, []);
  useEffect(load, [load]);

  const save = async (currency: string) => {
    const form = forms[currency];
    try {
      await adminApi(`/shipping/settings/${currency}`, {
        method: "PUT",
        body: {
          baseFee: toMinor(form.baseFee, currency),
          freeThreshold: form.freeThreshold ? toMinor(form.freeThreshold, currency) : null,
          jejuExtraFee: toMinor(form.jejuExtraFee, currency),
          islandExtraFee: toMinor(form.islandExtraFee, currency),
          autoDeliverDays: Number(form.autoDeliverDays) || 7,
        },
      });
      toast("저장했어요. 다음 주문부터 적용돼요.");
      load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    }
  };

  const addArea = async () => {
    const zipFrom = Number(area.zipFrom);
    const zipTo = Number(area.zipTo || area.zipFrom);
    if (!area.zipFrom || zipFrom > zipTo) return toast("우편번호 구간을 확인해 주세요. (앞 번호 ≤ 뒤 번호)", true);
    try {
      await adminApi("/shipping/remote-areas", { method: "POST", body: { type: area.type, zipFrom, zipTo, memo: area.memo.trim() || null } });
      setArea({ ...area, zipFrom: "", zipTo: "", memo: "" });
      toast("추가했어요.");
      load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    }
  };

  const removeArea = async (id: number) => {
    if (!window.confirm("이 구간을 지울까요?")) return;
    try {
      await adminApi(`/shipping/remote-areas/${id}`, { method: "DELETE" });
      load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    }
  };

  const zip = (value: number) => String(value).padStart(5, "0");

  return (
    <>
      <Top crumb="STORE / SHIPPING" title="배송 설정" />
      {error && <p className="alert">{error}</p>}
      {!settings ? (
        <div className="loading">불러오는 중…</div>
      ) : (
        <div className="grid2" style={{ alignItems: "start", marginBottom: 24 }}>
          {settings.map((setting) => {
            const form = forms[setting.currency];
            const unit = setting.currency === "USD" ? "달러" : "원";
            const field = (key: keyof Form, label: string, hint?: string) => (
              <label className="field">
                <span>{label}</span>
                <input
                  className="input mono"
                  inputMode="decimal"
                  value={form[key]}
                  onChange={(event) => setForms({ ...forms, [setting.currency]: { ...form, [key]: event.target.value } })}
                />
                {hint && <small>{hint}</small>}
              </label>
            );
            return (
              <div className="card" key={setting.currency}>
                <div className="card-h">
                  <b>{setting.currency === "KRW" ? "국내 (원)" : "해외 (달러)"}</b>
                </div>
                <div className="card-b form-stack">
                  <div className="grid2">
                    {field("baseFee", `기본 배송비 (${unit})`)}
                    {field("freeThreshold", `무료배송 기준 (${unit})`, "비우면 무료배송 없음")}
                  </div>
                  <div className="grid2">
                    {field("jejuExtraFee", `제주 추가 (${unit})`)}
                    {field("islandExtraFee", `도서산간 추가 (${unit})`)}
                  </div>
                  {field("autoDeliverDays", "자동 배송 완료 (일)", "배송 중으로 바꾼 뒤 이 날짜가 지나면 배송 완료로 바뀌어요 (교환·반품 7일은 그때부터)")}
                  <button className="btn primary" type="button" onClick={() => save(setting.currency)}>
                    저장
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <div className="card-h">
          <b>제주 · 도서산간 우편번호</b>
        </div>
        <div className="card-b">
          <div className="grid3" style={{ gridTemplateColumns: "140px 1fr 1fr 2fr auto", alignItems: "end", marginBottom: 16 }}>
            <label className="field">
              <span>구분</span>
              <select className="select" value={area.type} onChange={(event) => setArea({ ...area, type: event.target.value as RemoteArea["type"] })}>
                <option value="JEJU">제주</option>
                <option value="ISLAND">도서산간</option>
              </select>
            </label>
            <label className="field">
              <span>시작 우편번호</span>
              <input className="input mono" inputMode="numeric" maxLength={5} value={area.zipFrom} onChange={(event) => setArea({ ...area, zipFrom: event.target.value })} />
            </label>
            <label className="field">
              <span>끝 (한 곳이면 비움)</span>
              <input className="input mono" inputMode="numeric" maxLength={5} value={area.zipTo} onChange={(event) => setArea({ ...area, zipTo: event.target.value })} />
            </label>
            <label className="field">
              <span>메모</span>
              <input className="input" maxLength={100} placeholder="예: 울릉도" value={area.memo} onChange={(event) => setArea({ ...area, memo: event.target.value })} />
            </label>
            <button className="btn primary" type="button" onClick={addArea}>
              추가
            </button>
          </div>
          {!areas ? null : areas.length === 0 ? (
            <div className="empty">등록된 구간이 없어요.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>구분</th>
                    <th>우편번호</th>
                    <th>메모</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {areas.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className={`badge ${item.type === "JEJU" ? "blue" : "violet"}`}>{item.type === "JEJU" ? "제주" : "도서산간"}</span>
                      </td>
                      <td className="mono">
                        {zip(item.zipFrom)}
                        {item.zipTo !== item.zipFrom && ` ~ ${zip(item.zipTo)}`}
                      </td>
                      <td className="muted">{item.memo ?? "-"}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn sm" type="button" onClick={() => removeArea(item.id)}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

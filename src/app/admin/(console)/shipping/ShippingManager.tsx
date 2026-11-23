"use client";

import { useCallback, useEffect, useState } from "react";
import { Top } from "../../_components/ui";
import { adminApi, errorMessage, fromMinor, toast, toMinor, type RemoteArea, type ShippingSetting, type SiteText } from "../../_lib/admin";

/**
 * 배송비 면제(시험 결제용): 켜면 지금 배송비를 이 사이트 문구 칸에 적어 두고 모든 통화의 배송비·제주·도서산간 추가를 0으로 바꾼다.
 * 끄면 적어 둔 값으로 되돌리고 칸을 지운다. 칸이 있으면 = 면제 중. ('사이트 문구' 목록에서는 숨긴다)
 */
export const SHIPPING_WAIVE_KEY = "shipping.waive";

type SettingBody = { baseFee: number; freeThreshold: number | null; jejuExtraFee: number; islandExtraFee: number; autoDeliverDays: number };
const bodyOf = (setting: SettingBody): SettingBody => ({
  baseFee: setting.baseFee,
  freeThreshold: setting.freeThreshold,
  jejuExtraFee: setting.jejuExtraFee,
  islandExtraFee: setting.islandExtraFee,
  autoDeliverDays: setting.autoDeliverDays,
});

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
  // 면제 전 원래 배송비 (통화별). null = 면제 아님
  const [waived, setWaived] = useState<Record<string, SettingBody> | null>(null);
  const [waiving, setWaiving] = useState(false);

  const load = useCallback(() => {
    Promise.all([adminApi<ShippingSetting[]>("/shipping/settings"), adminApi<RemoteArea[]>("/shipping/remote-areas"), adminApi<SiteText[]>("/site-texts")])
      .then(([settingList, areaList, texts]) => {
        const backup = texts.find((text) => text.key === SHIPPING_WAIVE_KEY)?.values.ko;
        try {
          setWaived(backup ? (JSON.parse(backup) as Record<string, SettingBody>) : null);
        } catch {
          setWaived(null);
        }
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

  // 배송비 면제 켜기·끄기
  const toggleWaive = async (on: boolean) => {
    if (!settings) return;
    if (on && !window.confirm("배송비를 0원으로 바꿀까요? (제주·도서산간 추가도 0원)\n시험이 끝나면 꼭 다시 꺼 주세요. 끄면 지금 값으로 돌아가요.")) return;
    setWaiving(true);
    try {
      if (on) {
        const backup = Object.fromEntries(settings.map((setting) => [setting.currency, bodyOf(setting)]));
        // 원래 값을 먼저 적어 둔다 (중간에 끊겨도 되돌릴 수 있게)
        await adminApi(`/site-texts/${SHIPPING_WAIVE_KEY}`, {
          method: "PUT",
          body: { description: "배송비 면제 중 — 원래 배송비 (배송 설정 화면에서 끄면 되돌아가요)", values: { ko: JSON.stringify(backup) } },
        });
        for (const setting of settings) {
          await adminApi(`/shipping/settings/${setting.currency}`, { method: "PUT", body: { ...bodyOf(setting), baseFee: 0, jejuExtraFee: 0, islandExtraFee: 0 } });
        }
        toast("배송비 면제를 켰어요. 다음 주문부터 배송비 0원이에요.");
      } else if (waived) {
        for (const [currency, body] of Object.entries(waived)) {
          await adminApi(`/shipping/settings/${currency}`, { method: "PUT", body });
        }
        await adminApi(`/site-texts/${SHIPPING_WAIVE_KEY}`, { method: "DELETE" });
        toast("배송비 면제를 껐어요. 원래 배송비로 돌아갔어요.");
      }
      load();
    } catch (caught) {
      toast(errorMessage(caught), true);
      load();
    } finally {
      setWaiving(false);
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
      {settings && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-b">
            <label className="toggle-row">
              <span className="switch">
                <input type="checkbox" checked={Boolean(waived)} disabled={waiving} onChange={(event) => void toggleWaive(event.target.checked)} aria-label="배송비 면제" />
                <i />
              </span>
              <span>
                <b>배송비 면제 (시험 결제용)</b>
                <br />
                <small className="muted">
                  {waived ? "켜짐 — 모든 주문 배송비 0원 (제주·도서산간 포함). 시험이 끝나면 꺼 주세요." : "꺼짐 — 아래 설정대로 배송비가 붙어요. 켜면 지금 값을 기억했다가 끌 때 되돌려요."}
                </small>
              </span>
            </label>
          </div>
        </div>
      )}
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
                  disabled={Boolean(waived) && key !== "autoDeliverDays"}
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

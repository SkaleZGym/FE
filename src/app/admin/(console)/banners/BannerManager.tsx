"use client";

import { useCallback, useEffect, useState } from "react";
import { Drawer, Top } from "../../_components/ui";
import { adminApi, dateTime, errorMessage, LANGS, MANAGED_POSITIONS, toast, type AdminBanner, type Lang } from "../../_lib/admin";

type Position = (typeof MANAGED_POSITIONS)[number]["value"];

type Draft = {
  id: number | null;
  position: Position;
  imageUrl: string;
  mobileImageUrl: string;
  linkUrl: string;
  target: AdminBanner["target"];
  sortOrder: string;
  active: boolean;
  startAt: string; // datetime-local 값 (한국 시간)
  endAt: string;
  texts: Record<Lang, { headline: string; subtext: string }>;
};

const blankTexts = () => Object.fromEntries(LANGS.map(([code]) => [code, { headline: "", subtext: "" }])) as Draft["texts"];

/** ISO ↔ <input type="datetime-local"> (브라우저 시간대 기준) */
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

const toDraft = (banner: AdminBanner): Draft => ({
  id: banner.id,
  position: banner.position === "POPUP" ? "POPUP" : "MAIN_SUB",
  imageUrl: banner.imageUrl,
  mobileImageUrl: banner.mobileImageUrl ?? "",
  linkUrl: banner.linkUrl ?? "",
  target: banner.target,
  sortOrder: String(banner.sortOrder),
  active: banner.active,
  startAt: toLocal(banner.startAt),
  endAt: toLocal(banner.endAt),
  texts: Object.fromEntries(
    LANGS.map(([code]) => [code, { headline: banner.texts[code]?.headline ?? "", subtext: banner.texts[code]?.subtext ?? "" }]),
  ) as Draft["texts"],
});

const newDraft = (position: Position): Draft => ({
  id: null,
  position,
  imageUrl: "",
  mobileImageUrl: "",
  linkUrl: "",
  target: "ALL_PAGES",
  sortOrder: "0",
  active: false,
  startAt: "",
  endAt: "",
  texts: blankTexts(),
});

export default function BannerManager() {
  const [banners, setBanners] = useState<AdminBanner[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("ko");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi<AdminBanner[]>("/banners")
      .then((list) => setBanners(list.filter((banner) => banner.position !== "MAIN_HERO")))
      .catch((caught) => setError(errorMessage(caught)));
  }, []);
  useEffect(load, [load]);

  const edit = (next: Draft) => {
    setDraft(next);
    setLang("ko");
    setOpen(true);
  };
  const close = useCallback(() => setOpen(false), []);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => current && { ...current, [key]: value });

  const save = async () => {
    if (!draft) return;
    if (!draft.imageUrl.trim()) return toast("이미지 주소를 입력해 주세요.", true);
    const texts = Object.fromEntries(
      LANGS.filter(([code]) => code === "ko" || draft.texts[code].headline.trim() || draft.texts[code].subtext.trim()).map(([code]) => [
        code,
        { headline: draft.texts[code].headline.trim() || null, subtext: draft.texts[code].subtext.trim() || null },
      ]),
    );
    const body = {
      position: draft.position,
      imageUrl: draft.imageUrl.trim(),
      mobileImageUrl: draft.mobileImageUrl.trim() || null,
      linkUrl: draft.linkUrl.trim() || null,
      target: draft.position === "POPUP" ? draft.target : "ALL_PAGES",
      sortOrder: Number(draft.sortOrder) || 0,
      active: draft.active,
      startAt: toIso(draft.startAt),
      endAt: toIso(draft.endAt),
      texts,
    };
    setBusy(true);
    try {
      const saved = await adminApi<AdminBanner>(draft.id ? `/banners/${draft.id}` : "/banners", { method: draft.id ? "PUT" : "POST", body });
      setDraft(toDraft(saved));
      toast("저장했어요.");
      load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!draft?.id || !window.confirm("이 배너를 삭제할까요? 되돌릴 수 없어요.")) return;
    try {
      await adminApi(`/banners/${draft.id}`, { method: "DELETE" });
      toast("삭제했어요.");
      setOpen(false);
      load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    }
  };

  const shown = draft ? (draft.texts[lang].headline || draft.texts[lang].subtext ? draft.texts[lang] : draft.texts.ko) : null;

  return (
    <>
      <Top
        crumb="CONTENT / BANNERS"
        title="배너·팝업"
        actions={
          <>
            <button className="btn" type="button" onClick={() => edit(newDraft("POPUP"))}>
              + 팝업
            </button>
            <button className="btn primary" type="button" onClick={() => edit(newDraft("MAIN_SUB"))}>
              + 메인 배너
            </button>
          </>
        }
      />
      <div className="notice">
        <span>ⓘ</span>
        <span>
          메인 첫 화면의 <b>인트로(로고 애니메이션 · 히어로)</b>는 여기서 바꾸지 않아요. 인트로 다음 구간의 배너와 팝업만 관리해요. 같은 자리에 여러 개가 켜져
          있으면 순서 숫자가 작은 것부터 보여요.
        </span>
      </div>
      {error && <p className="alert">{error}</p>}
      {!banners ? (
        <div className="loading">불러오는 중…</div>
      ) : (
        MANAGED_POSITIONS.map((position) => {
          const list = banners.filter((banner) => banner.position === position.value).sort((a, b) => a.sortOrder - b.sortOrder);
          return (
            <section key={position.value} style={{ marginBottom: 24 }}>
              <div className="sec-title">
                {position.label.toUpperCase()} · {position.help}
              </div>
              {list.length === 0 ? (
                <div className="card empty">아직 없어요. 오른쪽 위 버튼으로 추가하세요.</div>
              ) : (
                <div className="banners">
                  {list.map((banner) => (
                    <button key={banner.id} type="button" className="card bcard" onClick={() => edit(toDraft(banner))}>
                      <div className="img" style={{ backgroundImage: `url("${banner.imageUrl}")` }}>
                        <span className="pos">
                          {position.label}
                          {banner.position === "POPUP" && ` · ${banner.target === "MAIN_ONLY" ? "메인만" : "모든 페이지"}`}
                        </span>
                        <b>{banner.texts.ko?.headline || "문구 없음"}</b>
                      </div>
                      <div className="meta">
                        <span className={`badge ${banner.visibleNow ? "green" : ""}`}>{banner.visibleNow ? "지금 노출 중" : banner.active ? "예약·기간 밖" : "꺼짐"}</span>
                        <span className="mono muted">
                          순서 {banner.sortOrder}
                          {banner.endAt && ` · ~${dateTime(banner.endAt)}`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}

      <Drawer
        open={open}
        title={draft?.id ? "배너 수정" : "새 배너"}
        onClose={close}
        footer={
          <>
            {draft?.id && (
              <button className="btn danger left" type="button" onClick={remove}>
                삭제
              </button>
            )}
            <button className="btn" type="button" onClick={close}>
              닫기
            </button>
            <button className="btn primary" type="button" onClick={save} disabled={busy}>
              {busy ? "저장 중…" : "저장"}
            </button>
          </>
        }
      >
        {draft && shown && (
          <>
            <div className="bpreview" style={{ backgroundImage: draft.imageUrl ? `url("${draft.imageUrl}")` : undefined }}>
              <div className="t">
                <b>{shown.headline || "큰 글자"}</b>
                {shown.subtext && <small>{shown.subtext}</small>}
              </div>
            </div>
            <div className="grid2">
              <label className="field">
                <span>자리</span>
                <select className="select" value={draft.position} onChange={(event) => set("position", event.target.value as Position)}>
                  {MANAGED_POSITIONS.map((position) => (
                    <option key={position.value} value={position.value}>
                      {position.label}
                    </option>
                  ))}
                </select>
              </label>
              {draft.position === "POPUP" ? (
                <label className="field">
                  <span>띄울 곳</span>
                  <select className="select" value={draft.target} onChange={(event) => set("target", event.target.value as Draft["target"])}>
                    <option value="ALL_PAGES">모든 페이지</option>
                    <option value="MAIN_ONLY">메인에서만</option>
                  </select>
                </label>
              ) : (
                <label className="field">
                  <span>순서 (작을수록 먼저)</span>
                  <input className="input mono" inputMode="numeric" value={draft.sortOrder} onChange={(event) => set("sortOrder", event.target.value)} />
                </label>
              )}
            </div>
            <label className="field">
              <span>
                이미지 주소 <b>*</b>
              </span>
              <input className="input" value={draft.imageUrl} onChange={(event) => set("imageUrl", event.target.value)} placeholder="https://…" />
            </label>
            <label className="field">
              <span>모바일 이미지 주소</span>
              <input className="input" value={draft.mobileImageUrl} onChange={(event) => set("mobileImageUrl", event.target.value)} placeholder="비우면 위 이미지를 써요" />
            </label>
            <label className="field">
              <span>누르면 갈 주소</span>
              <input className="input" value={draft.linkUrl} onChange={(event) => set("linkUrl", event.target.value)} placeholder="/ko/shop/new 또는 https://…" />
            </label>
            <div className="grid2">
              <label className="field">
                <span>시작 (비우면 바로)</span>
                <input className="input" type="datetime-local" value={draft.startAt} onChange={(event) => set("startAt", event.target.value)} />
              </label>
              <label className="field">
                <span>끝 (비우면 계속)</span>
                <input className="input" type="datetime-local" value={draft.endAt} onChange={(event) => set("endAt", event.target.value)} />
              </label>
            </div>
            <div>
              <div className="sec-title">문구</div>
              <div className="langtabs" role="tablist" style={{ marginBottom: 10 }}>
                {LANGS.map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    role="tab"
                    aria-selected={lang === code}
                    className={draft.texts[code].headline.trim() ? "filled" : ""}
                    onClick={() => setLang(code)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="stack">
                <input
                  className="input"
                  placeholder="큰 글자 (예: DON'T FOLLOW THE TREND.)"
                  value={draft.texts[lang].headline}
                  maxLength={200}
                  onChange={(event) => set("texts", { ...draft.texts, [lang]: { ...draft.texts[lang], headline: event.target.value } })}
                />
                <input
                  className="input"
                  placeholder="작은 글자"
                  value={draft.texts[lang].subtext}
                  maxLength={500}
                  onChange={(event) => set("texts", { ...draft.texts, [lang]: { ...draft.texts[lang], subtext: event.target.value } })}
                />
                {lang !== "ko" && <span className="hint">비워 두면 이 언어 화면에는 한국어 문구가 보여요.</span>}
              </div>
            </div>
            <label className="field" style={{ gridTemplateColumns: "auto 1fr", alignItems: "center", gap: 10 }}>
              <span className="switch">
                <input type="checkbox" checked={draft.active} onChange={(event) => set("active", event.target.checked)} aria-label="켜기" />
                <i />
              </span>
              <span style={{ color: "var(--ink)", fontSize: 12 }}>{draft.active ? "켜짐 — 기간 안이면 고객 화면에 보여요" : "꺼짐 — 고객 화면에 안 보여요"}</span>
            </label>
          </>
        )}
      </Drawer>
    </>
  );
}

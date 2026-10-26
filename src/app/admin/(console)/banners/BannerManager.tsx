"use client";

import { useCallback, useEffect, useState } from "react";
import ImageUpload from "../../_components/ImageUpload";
import ProductPicker from "../../_components/ProductPicker";
import { Drawer, Top } from "../../_components/ui";
import { adminApi, errorMessage, LANGS, MANAGED_POSITIONS, toast, type AdminBanner, type Lang } from "../../_lib/admin";

type Position = (typeof MANAGED_POSITIONS)[number]["value"];
type Text = { subtext: string; headline: string; price: string };

/** 노출 기간(시작·끝)은 쓰지 않는다 — 켜면 바로 보이고 끄면 사라진다. 모바일도 같은 사진을 쓴다 */
type Draft = {
  id: number | null;
  position: Position;
  imageUrl: string;
  linkUrl: string;
  target: AdminBanner["target"];
  sortOrder: string;
  active: boolean;
  texts: Record<Lang, Text>;
};

const blankTexts = () => Object.fromEntries(LANGS.map(([code]) => [code, { subtext: "", headline: "", price: "" }])) as Draft["texts"];

const toDraft = (banner: AdminBanner): Draft => ({
  id: banner.id,
  position: banner.position,
  imageUrl: banner.imageUrl,
  linkUrl: banner.linkUrl ?? "",
  target: banner.target,
  sortOrder: String(banner.sortOrder),
  active: banner.active,
  texts: Object.fromEntries(
    LANGS.map(([code]) => [
      code,
      { subtext: banner.texts[code]?.subtext ?? "", headline: banner.texts[code]?.headline ?? "", price: banner.texts[code]?.price ?? "" },
    ]),
  ) as Draft["texts"],
});

const newDraft = (position: Position): Draft => ({
  id: null,
  position,
  imageUrl: "",
  linkUrl: "",
  target: "ALL_PAGES",
  sortOrder: "0",
  active: false,
  texts: blankTexts(),
});

const filled = (text: Text) => Boolean(text.headline.trim() || text.subtext.trim() || text.price.trim());

export default function BannerManager() {
  const [banners, setBanners] = useState<AdminBanner[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("ko");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi<AdminBanner[]>("/banners")
      .then(setBanners)
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
  const setText = (field: keyof Text, value: string) =>
    setDraft((current) => current && { ...current, texts: { ...current.texts, [lang]: { ...current.texts[lang], [field]: value } } });

  const save = async () => {
    if (!draft) return;
    if (!draft.imageUrl) return toast("사진을 올려 주세요.", true);
    const clean = (value: string) => value.trim() || null;
    const texts = Object.fromEntries(
      LANGS.filter(([code]) => code === "ko" || filled(draft.texts[code])).map(([code]) => [
        code,
        { subtext: clean(draft.texts[code].subtext), headline: clean(draft.texts[code].headline), price: clean(draft.texts[code].price) },
      ]),
    );
    const body = {
      position: draft.position,
      imageUrl: draft.imageUrl,
      mobileImageUrl: null,
      linkUrl: draft.linkUrl || null,
      target: draft.position === "POPUP" ? draft.target : "ALL_PAGES",
      sortOrder: Number(draft.sortOrder) || 0,
      active: draft.active,
      startAt: null,
      endAt: null,
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

  // 미리보기: 이 언어 문구가 비어 있으면 한국어로 (고객 화면과 같은 규칙)
  const shown = draft ? (filled(draft.texts[lang]) ? draft.texts[lang] : draft.texts.ko) : null;

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
            <button className="btn" type="button" onClick={() => edit(newDraft("MAIN_SUB"))}>
              + 메인 중간 배너
            </button>
            <button className="btn primary" type="button" onClick={() => edit(newDraft("MAIN_HERO"))}>
              + 히어로 슬라이드
            </button>
          </>
        }
      />
      <div className="notice">
        <span>ⓘ</span>
        <span>
          <b>메인 히어로</b>는 인트로(로고 애니메이션)가 끝나면 보이는 첫 화면 상품 슬라이드예요. 인트로 애니메이션 자체는 바뀌지 않아요. 같은 자리에 여러 개가
          켜져 있으면 순서 숫자가 작은 것부터 보여요.
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
                        <div className="bcard-text">
                          {banner.texts.ko?.subtext && <small>{banner.texts.ko.subtext}</small>}
                          <b>{banner.texts.ko?.headline || "문구 없음"}</b>
                          {banner.texts.ko?.price && <em>{banner.texts.ko.price}</em>}
                        </div>
                      </div>
                      <div className="meta">
                        <span className={`badge ${banner.active ? "green" : ""}`}>{banner.active ? "노출 중" : "꺼짐"}</span>
                        <span className="mono muted">순서 {banner.sortOrder}</span>
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
          <div className="form-stack">
            {/* 미리보기: 작은 글자 → 큰 글자 → 가격 (고객 화면과 같은 순서) */}
            <div className="bpreview" style={{ backgroundImage: draft.imageUrl ? `url("${draft.imageUrl}")` : undefined }}>
              <div className="t">
                {shown.subtext && <small>{shown.subtext}</small>}
                <b>{shown.headline || "큰 글자"}</b>
                {shown.price && <em>{shown.price}</em>}
              </div>
            </div>

            <div className="field">
              <span>
                사진 <b>*</b>
              </span>
              <ImageUpload value={draft.imageUrl} onChange={(url) => set("imageUrl", url)} hint={
                  draft.position === "MAIN_HERO"
                    ? "PC·모바일 모두 이 사진을 써요. 배경이 밝은 정사각형 상품 사진이 잘 맞아요 (원 안에 떠 있는 모양)."
                    : "PC·모바일 모두 이 사진을 써요. 가로로 긴 사진(16:9 정도)이 잘 맞아요."
                }
              />
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

            <div className="field">
              <span>누르면 갈 상품</span>
              <ProductPicker value={draft.linkUrl} onChange={(link) => set("linkUrl", link)} />
            </div>

            <div className="field">
              <span className="field-head">
                문구
                <span className="langtabs" role="tablist">
                  {LANGS.map(([code, label]) => (
                    <button key={code} type="button" role="tab" aria-selected={lang === code} className={filled(draft.texts[code]) ? "filled" : ""} onClick={() => setLang(code)}>
                      {label}
                    </button>
                  ))}
                </span>
              </span>
              <div className="text-fields">
                <label className="field">
                  <span>작은 글자 (큰 글자 위에 보여요)</span>
                  <input className="input" placeholder="예: SKALEZ X REXYOON" value={draft.texts[lang].subtext} maxLength={500} onChange={(event) => setText("subtext", event.target.value)} />
                </label>
                <label className="field">
                  <span>큰 글자</span>
                  <input className="input" placeholder="예: HELLO WORLD" value={draft.texts[lang].headline} maxLength={200} onChange={(event) => setText("headline", event.target.value)} />
                </label>
                <label className="field">
                  <span>가격</span>
                  <input className="input" placeholder={lang === "ko" ? "예: ₩69,000" : "예: $49"} value={draft.texts[lang].price} maxLength={50} onChange={(event) => setText("price", event.target.value)} />
                </label>
              </div>
              {lang !== "ko" && <small className="hint">비워 두면 이 언어 화면에는 한국어 문구가 보여요.</small>}
            </div>

            <label className="toggle-row">
              <span className="switch">
                <input type="checkbox" checked={draft.active} onChange={(event) => set("active", event.target.checked)} aria-label="켜기" />
                <i />
              </span>
              <span>{draft.active ? "켜짐 — 고객 화면에 보여요" : "꺼짐 — 고객 화면에 안 보여요"}</span>
            </label>
          </div>
        )}
      </Drawer>
    </>
  );
}

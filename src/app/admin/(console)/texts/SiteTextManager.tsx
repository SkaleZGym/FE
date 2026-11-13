"use client";

import { useCallback, useEffect, useState } from "react";
import { Drawer, Top } from "../../_components/ui";
import { adminApi, dateTime, errorMessage, LANGS, toast, type Lang, type SiteText } from "../../_lib/admin";

/** 쇼핑몰 화면이 실제로 읽는 문구 자리. 여기 없는 키도 추가할 수 있지만 화면에 연결해야 보인다 */
const KNOWN_TEXTS: { key: string; label: string; hint: string }[] = [
  { key: "footer.tagline", label: "푸터 슬로건", hint: "모든 페이지 맨 아래 로고 옆 문구. 비우면 기본값 BUILT FOR LEG DAY." },
  { key: "product.model", label: "상품 상세: 모델 착용 정보", hint: "예: 모델 178cm / 85kg · XL 착용. 비우면 MODEL 줄을 숨겨요 (모든 상품에 똑같이 보여요)." },
  // 상품정보제공고시 (전자상거래법 필수). 모든 상품 상세의 '상세정보' 탭 아래 표에 공통으로 들어간다
  { key: "product.notice.maker", label: "상품정보고시: 제조자(수입자)", hint: "비우면 상호(스케일즈(SKALEZ))가 보여요. 공장이 따로 있으면 그 이름." },
  { key: "product.notice.origin", label: "상품정보고시: 제조국", hint: "예: 대한민국. 비우면 '제품 라벨 참조'." },
  { key: "product.notice.care", label: "상품정보고시: 세탁방법·주의사항", hint: "예: 찬물 단독 손세탁, 건조기·표백제 사용 금지. 비우면 '제품 라벨 참조'." },
  { key: "product.notice.madeAt", label: "상품정보고시: 제조연월", hint: "예: 2026년 이후 제조 (입고 시기에 따라 다름). 비우면 '제품 라벨 참조'." },
  { key: "product.notice.warranty", label: "상품정보고시: 품질보증기준", hint: "비우면 '공정거래위원회 고시 소비자분쟁해결기준에 따름'." },
  { key: "product.notice.as", label: "상품정보고시: A/S 책임자·전화", hint: "비우면 상호 + 대표 전화번호." },
];

type Draft = { key: string; isNew: boolean; description: string; values: Record<Lang, string> };

const toDraft = (key: string, text?: SiteText): Draft => ({
  key,
  isNew: !text,
  description: text?.description ?? KNOWN_TEXTS.find((known) => known.key === key)?.label ?? "",
  values: Object.fromEntries(LANGS.map(([code]) => [code, text?.values[code] ?? ""])) as Record<Lang, string>,
});

/** 사이트 문구: 언어별로 화면 글자를 바꾼다. 비어 있는 언어는 한국어로 보인다 */
export default function SiteTextManager() {
  const [list, setList] = useState<SiteText[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi<SiteText[]>("/site-texts")
      .then((result) => {
        setList(result);
        setError("");
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, []);
  useEffect(load, [load]);

  const edit = (next: Draft) => {
    setDraft(next);
    setOpen(true);
  };
  const close = useCallback(() => setOpen(false), []);

  const save = async () => {
    if (!draft) return;
    const key = draft.key.trim();
    if (!/^[a-z][a-z0-9._-]{1,99}$/.test(key)) return toast("키는 영어 소문자로 시작하고 소문자·숫자·.·_·- 만 써요. (예: footer.tagline)", true);
    if (!draft.values.ko.trim()) return toast("한국어 문구는 꼭 적어 주세요.", true);
    const values = Object.fromEntries(LANGS.filter(([code]) => draft.values[code].trim()).map(([code]) => [code, draft.values[code].trim()]));
    setBusy(true);
    try {
      await adminApi(`/site-texts/${encodeURIComponent(key)}`, { method: "PUT", body: { description: draft.description.trim() || null, values } });
      setDraft({ ...draft, key, isNew: false });
      toast("저장했어요. 쇼핑몰에는 몇 분 안에 반영돼요.");
      load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!draft || draft.isNew || !window.confirm("이 문구를 지우고 기본값으로 돌릴까요?")) return;
    try {
      await adminApi(`/site-texts/${encodeURIComponent(draft.key)}`, { method: "DELETE" });
      toast("기본값으로 돌렸어요.");
      setOpen(false);
      load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    }
  };

  const saved = new Map((list ?? []).map((text) => [text.key, text]));
  const rows = [
    ...KNOWN_TEXTS.map((known) => ({ key: known.key, label: known.label, hint: known.hint, text: saved.get(known.key) })),
    ...(list ?? []).filter((text) => !KNOWN_TEXTS.some((known) => known.key === text.key)).map((text) => ({ key: text.key, label: text.description ?? text.key, hint: "", text })),
  ];

  return (
    <>
      <Top
        crumb="CONTENT / TEXTS"
        title="사이트 문구"
        actions={
          <button className="btn" type="button" onClick={() => edit({ ...toDraft(""), isNew: true })}>
            + 새 문구 키
          </button>
        }
      />
      <div className="card">
        {error && <p className="alert">{error}</p>}
        {!list ? (
          <div className="loading">불러오는 중…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>자리</th>
                  <th>지금 문구 (한국어)</th>
                  <th>키</th>
                  <th>수정</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="click" onClick={() => edit(toDraft(row.key, row.text))}>
                    <td>
                      <b style={{ fontWeight: 500 }}>{row.label}</b>
                      {row.hint && <div className="muted" style={{ fontSize: 12 }}>{row.hint}</div>}
                    </td>
                    <td>{row.text?.values.ko ?? <span className="muted">기본값</span>}</td>
                    <td className="mono muted">{row.key}</td>
                    <td className="mono muted">{row.text ? dateTime(row.text.updatedAt) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer
        open={open}
        title="문구 수정"
        onClose={close}
        footer={
          <>
            {draft && !draft.isNew && (
              <button className="btn danger left" type="button" onClick={remove}>
                기본값으로
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
        {draft && (
          <div className="form-stack">
            <div className="grid2">
              <label className="field">
                <span>키</span>
                <input className="input mono" value={draft.key} readOnly={!draft.isNew || KNOWN_TEXTS.some((known) => known.key === draft.key)} onChange={(event) => setDraft({ ...draft, key: event.target.value })} />
              </label>
              <label className="field">
                <span>설명</span>
                <input className="input" value={draft.description} maxLength={200} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              </label>
            </div>
            {LANGS.map(([code, label]) => (
              <label className="field" key={code}>
                <span>
                  {label}
                  {code === "ko" && " *"}
                </span>
                <textarea className="textarea" style={{ minHeight: 70 }} value={draft.values[code]} maxLength={2000} onChange={(event) => setDraft({ ...draft, values: { ...draft.values, [code]: event.target.value } })} />
              </label>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}

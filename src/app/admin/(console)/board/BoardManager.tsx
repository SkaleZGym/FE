"use client";

import { useCallback, useEffect, useState } from "react";
import { Chips, Drawer, Pager, Top } from "../../_components/ui";
import {
  adminApi,
  dateOnly,
  errorMessage,
  FAQ_CATEGORY,
  LANGS,
  toast,
  type AdminFaq,
  type AdminNotice,
  type BoardText,
  type FaqCategory,
  type Lang,
  type Page,
} from "../../_lib/admin";

type Kind = "notice" | "faq";
type Texts = Record<Lang, BoardText>;

/** 공지와 FAQ는 모양이 같다: 언어별 제목(질문)·내용(답변) + 공개 여부. 나머지 칸만 다르다 */
type Draft = {
  kind: Kind;
  id: number | null;
  category: string;
  pinned: boolean;
  sortOrder: string;
  published: boolean;
  texts: Texts;
};

const blankTexts = () => Object.fromEntries(LANGS.map(([code]) => [code, { title: "", content: "" }])) as Texts;
const fillTexts = (texts: Partial<Record<Lang, BoardText>>) =>
  Object.fromEntries(LANGS.map(([code]) => [code, { title: texts[code]?.title ?? "", content: texts[code]?.content ?? "" }])) as Texts;
const filled = (text: BoardText) => Boolean(text.title.trim() || text.content.trim());

const newDraft = (kind: Kind): Draft => ({
  kind,
  id: null,
  category: kind === "notice" ? "NOTICE" : "ORDER",
  pinned: false,
  sortOrder: "0",
  published: true,
  texts: blankTexts(),
});

export default function BoardManager() {
  const [kind, setKind] = useState<Kind>("notice");
  const [page, setPage] = useState(0);
  const [notices, setNotices] = useState<Page<AdminNotice> | null>(null);
  const [faqs, setFaqs] = useState<AdminFaq[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("ko");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const request =
      kind === "notice"
        ? adminApi<Page<AdminNotice>>(`/notices?page=${page}&size=20`).then(setNotices)
        : adminApi<AdminFaq[]>("/faqs").then(setFaqs);
    request.then(() => setError("")).catch((caught) => setError(errorMessage(caught)));
  }, [kind, page]);
  useEffect(load, [load]);

  const edit = (next: Draft) => {
    setDraft(next);
    setLang("ko");
    setOpen(true);
  };
  const close = useCallback(() => setOpen(false), []);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => current && { ...current, [key]: value });
  const setText = (field: keyof BoardText, value: string) =>
    setDraft((current) => current && { ...current, texts: { ...current.texts, [lang]: { ...current.texts[lang], [field]: value } } });

  const save = async () => {
    if (!draft) return;
    const ko = draft.texts.ko;
    if (!ko.title.trim() || !ko.content.trim()) return toast("한국어 제목과 내용은 꼭 적어 주세요.", true);
    const incomplete = LANGS.find(([code]) => filled(draft.texts[code]) && (!draft.texts[code].title.trim() || !draft.texts[code].content.trim()));
    if (incomplete) return toast(`${incomplete[1]} 제목과 내용을 둘 다 적거나 둘 다 비워 주세요.`, true);
    const texts = Object.fromEntries(
      LANGS.filter(([code]) => filled(draft.texts[code])).map(([code]) => [code, { title: draft.texts[code].title.trim(), content: draft.texts[code].content.trim() }]),
    );
    const notice = draft.kind === "notice";
    const body = notice
      ? { category: draft.category, pinned: draft.pinned, published: draft.published, texts }
      : { category: draft.category, sortOrder: Number(draft.sortOrder) || 0, published: draft.published, texts };
    const base = notice ? "/notices" : "/faqs";
    setBusy(true);
    try {
      const saved = await adminApi<AdminNotice | AdminFaq>(draft.id ? `${base}/${draft.id}` : base, { method: draft.id ? "PUT" : "POST", body });
      setDraft((current) => current && { ...current, id: saved.id });
      toast("저장했어요. 고객 화면에는 몇 분 안에 반영돼요.");
      load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!draft?.id || !window.confirm("삭제할까요? 되돌릴 수 없어요.")) return;
    try {
      await adminApi(`${draft.kind === "notice" ? "/notices" : "/faqs"}/${draft.id}`, { method: "DELETE" });
      toast("삭제했어요.");
      setOpen(false);
      load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    }
  };

  const isNotice = draft?.kind === "notice";

  return (
    <>
      <Top
        crumb="CONTENT / BOARD"
        title="공지·FAQ"
        actions={
          <button className="btn primary" type="button" onClick={() => edit(newDraft(kind))}>
            + {kind === "notice" ? "새 공지" : "새 FAQ"}
          </button>
        }
      />
      <div className="card">
        <div className="toolbar">
          <Chips
            value={kind}
            onChange={(value) => {
              if (!value) return;
              setKind(value);
              setPage(0);
            }}
            options={[
              { value: "notice", label: "공지사항" },
              { value: "faq", label: "FAQ" },
            ]}
          />
        </div>
        {error && <p className="alert">{error}</p>}

        {kind === "notice" &&
          (!notices ? (
            <div className="loading">불러오는 중…</div>
          ) : notices.content.length === 0 ? (
            <div className="empty">공지가 없어요.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>분류</th>
                    <th>제목</th>
                    <th>조회</th>
                    <th>공개</th>
                    <th>작성일</th>
                  </tr>
                </thead>
                <tbody>
                  {notices.content.map((notice) => (
                    <tr
                      key={notice.id}
                      className="click"
                      onClick={() =>
                        edit({ kind: "notice", id: notice.id, category: notice.category, pinned: notice.pinned, sortOrder: "0", published: notice.published, texts: fillTexts(notice.texts) })
                      }
                    >
                      <td className="muted">
                        {notice.pinned && <span className="badge red">고정</span>} {notice.category === "EVENT" ? "이벤트" : "공지"}
                      </td>
                      <td>
                        <b style={{ fontWeight: 500 }}>{notice.texts.ko?.title}</b>
                      </td>
                      <td className="mono muted">{notice.viewCount}</td>
                      <td>
                        <span className={`badge ${notice.published ? "green" : ""}`}>{notice.published ? "공개" : "숨김"}</span>
                      </td>
                      <td className="mono muted">{dateOnly(notice.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        {kind === "notice" && notices && <Pager page={notices.page} totalPages={notices.totalPages} total={notices.totalElements} onPage={setPage} />}

        {kind === "faq" &&
          (!faqs ? (
            <div className="loading">불러오는 중…</div>
          ) : faqs.length === 0 ? (
            <div className="empty">FAQ가 없어요. 없으면 쇼핑몰에는 기본 FAQ 4개가 보여요.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>분류</th>
                    <th>질문</th>
                    <th>순서</th>
                    <th>공개</th>
                  </tr>
                </thead>
                <tbody>
                  {faqs.map((faq) => (
                    <tr
                      key={faq.id}
                      className="click"
                      onClick={() =>
                        edit({ kind: "faq", id: faq.id, category: faq.category, pinned: false, sortOrder: String(faq.sortOrder), published: faq.published, texts: fillTexts(faq.texts) })
                      }
                    >
                      <td className="muted">{FAQ_CATEGORY[faq.category]}</td>
                      <td>
                        <b style={{ fontWeight: 500 }}>{faq.texts.ko?.title}</b>
                      </td>
                      <td className="mono muted">{faq.sortOrder}</td>
                      <td>
                        <span className={`badge ${faq.published ? "green" : ""}`}>{faq.published ? "공개" : "숨김"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>

      <Drawer
        open={open}
        title={`${isNotice ? "공지" : "FAQ"} ${draft?.id ? "수정" : "작성"}`}
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
        {draft && (
          <div className="form-stack">
            <div className="grid2">
              <label className="field">
                <span>분류</span>
                <select className="select" value={draft.category} onChange={(event) => set("category", event.target.value)}>
                  {isNotice ? (
                    <>
                      <option value="NOTICE">공지</option>
                      <option value="EVENT">이벤트</option>
                    </>
                  ) : (
                    (Object.keys(FAQ_CATEGORY) as FaqCategory[]).map((key) => (
                      <option key={key} value={key}>
                        {FAQ_CATEGORY[key]}
                      </option>
                    ))
                  )}
                </select>
              </label>
              {isNotice ? (
                <label className="toggle-row" style={{ alignSelf: "end" }}>
                  <span className="switch">
                    <input type="checkbox" checked={draft.pinned} onChange={(event) => set("pinned", event.target.checked)} aria-label="맨 위 고정" />
                    <i />
                  </span>
                  <span>맨 위 고정</span>
                </label>
              ) : (
                <label className="field">
                  <span>순서 (작을수록 먼저)</span>
                  <input className="input mono" inputMode="numeric" value={draft.sortOrder} onChange={(event) => set("sortOrder", event.target.value)} />
                </label>
              )}
            </div>

            <div className="field">
              <span className="field-head">
                {isNotice ? "제목 · 내용" : "질문 · 답변"}
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
                  <span>{isNotice ? "제목" : "질문"}</span>
                  <input className="input" value={draft.texts[lang].title} maxLength={200} onChange={(event) => setText("title", event.target.value)} />
                </label>
                <label className="field">
                  <span>{isNotice ? "내용" : "답변"}</span>
                  <textarea className="textarea" style={{ minHeight: 220 }} value={draft.texts[lang].content} maxLength={10000} onChange={(event) => setText("content", event.target.value)} />
                </label>
              </div>
              {lang !== "ko" && <small className="hint">비워 두면 이 언어 화면에는 한국어로 보여요.</small>}
            </div>

            <label className="toggle-row">
              <span className="switch">
                <input type="checkbox" checked={draft.published} onChange={(event) => set("published", event.target.checked)} aria-label="공개" />
                <i />
              </span>
              <span>{draft.published ? "공개 — 고객 화면에 보여요" : "숨김 — 고객 화면에 안 보여요"}</span>
            </label>
          </div>
        )}
      </Drawer>
    </>
  );
}

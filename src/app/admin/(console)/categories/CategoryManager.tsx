"use client";

import { useCallback, useEffect, useState } from "react";
import { Drawer, Top } from "../../_components/ui";
import { adminApi, errorMessage, LANGS, toast, type Category, type Lang } from "../../_lib/admin";

type Draft = { id: number | null; code: string; parentCode: string; sortOrder: string; names: Record<Lang, string> };

const blank = (parentCode = ""): Draft => ({
  id: null,
  code: "",
  parentCode,
  sortOrder: "0",
  names: Object.fromEntries(LANGS.map(([code]) => [code, ""])) as Record<Lang, string>,
});
const toDraft = (category: Category): Draft => ({
  id: category.id,
  code: category.code,
  parentCode: category.parentCode ?? "",
  sortOrder: String(category.sortOrder),
  names: Object.fromEntries(LANGS.map(([code]) => [code, category.names[code] ?? ""])) as Record<Lang, string>,
});

/** 상품 분류 (2단계: 상위 → 하위). 상품 등록 화면의 분류 목록이 여기서 나온다 */
export default function CategoryManager() {
  const [list, setList] = useState<Category[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi<Category[]>("/categories")
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
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => current && { ...current, [key]: value });

  const save = async () => {
    if (!draft) return;
    if (!/^[A-Z][A-Z0-9_]{0,49}$/.test(draft.code)) return toast("코드는 영어 대문자로 시작하고 대문자·숫자·_ 만 써요. (예: MEN_TOP)", true);
    if (!draft.names.ko.trim()) return toast("한국어 이름은 꼭 적어 주세요.", true);
    const names = Object.fromEntries(LANGS.filter(([code]) => draft.names[code].trim()).map(([code]) => [code, draft.names[code].trim()]));
    const body = { code: draft.code, parentCode: draft.parentCode || null, sortOrder: Number(draft.sortOrder) || 0, names };
    setBusy(true);
    try {
      const saved = await adminApi<Category>(draft.id ? `/categories/${draft.id}` : "/categories", { method: draft.id ? "PUT" : "POST", body });
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
    if (!draft?.id || !window.confirm("이 분류를 삭제할까요? 상품이나 하위 분류가 있으면 삭제되지 않아요.")) return;
    try {
      await adminApi(`/categories/${draft.id}`, { method: "DELETE" });
      toast("삭제했어요.");
      setOpen(false);
      load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    }
  };

  const tops = (list ?? []).filter((category) => !category.parentCode).sort((a, b) => a.sortOrder - b.sortOrder);
  const childrenOf = (code: string) => (list ?? []).filter((category) => category.parentCode === code).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <Top
        crumb="STORE / CATEGORIES"
        title="카테고리"
        actions={
          <button className="btn primary" type="button" onClick={() => edit(blank())}>
            + 상위 분류
          </button>
        }
      />
      <div className="card">
        {error && <p className="alert">{error}</p>}
        {!list ? (
          <div className="loading">불러오는 중…</div>
        ) : tops.length === 0 ? (
          <div className="empty">분류가 없어요.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>코드</th>
                  <th>영어</th>
                  <th>순서</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tops.flatMap((top) => [
                  <tr key={top.id} className="click" onClick={() => edit(toDraft(top))}>
                    <td>
                      <b style={{ fontWeight: 600 }}>{top.names.ko}</b>
                    </td>
                    <td className="mono muted">{top.code}</td>
                    <td className="muted">{top.names.en ?? "-"}</td>
                    <td className="mono muted">{top.sortOrder}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn sm"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          edit(blank(top.code));
                        }}
                      >
                        + 하위
                      </button>
                    </td>
                  </tr>,
                  ...childrenOf(top.code).map((child) => (
                    <tr key={child.id} className="click" onClick={() => edit(toDraft(child))}>
                      <td style={{ paddingLeft: 32 }}>└ {child.names.ko}</td>
                      <td className="mono muted">{child.code}</td>
                      <td className="muted">{child.names.en ?? "-"}</td>
                      <td className="mono muted">{child.sortOrder}</td>
                      <td />
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer
        open={open}
        title={draft?.id ? "분류 수정" : "새 분류"}
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
                <span>코드 *</span>
                <input className="input mono" value={draft.code} maxLength={50} placeholder="예: MEN_TOP" onChange={(event) => set("code", event.target.value.toUpperCase())} />
              </label>
              <label className="field">
                <span>상위 분류</span>
                <select className="select" value={draft.parentCode} onChange={(event) => set("parentCode", event.target.value)}>
                  <option value="">없음 (최상위)</option>
                  {tops
                    .filter((top) => top.code !== draft.code)
                    .map((top) => (
                      <option key={top.code} value={top.code}>
                        {top.names.ko}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>순서 (작을수록 먼저)</span>
              <input className="input mono" inputMode="numeric" value={draft.sortOrder} onChange={(event) => set("sortOrder", event.target.value)} />
            </label>
            {LANGS.map(([code, label]) => (
              <label className="field" key={code}>
                <span>
                  이름 · {label}
                  {code === "ko" && " *"}
                </span>
                <input className="input" value={draft.names[code]} maxLength={100} onChange={(event) => set("names", { ...draft.names, [code]: event.target.value })} />
              </label>
            ))}
            <small className="hint">코드는 상품 등록과 연결돼요. 이미 상품이 있는 분류의 코드는 바꾸지 않는 게 좋아요.</small>
          </div>
        )}
      </Drawer>
    </>
  );
}

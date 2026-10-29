"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import ImageUpload from "../../../_components/ImageUpload";
import { Top, useQueryParam } from "../../../_components/ui";
import {
  adminApi,
  BADGES,
  errorMessage,
  FABRICS,
  FITS,
  LANGS,
  toast,
  type AdminProduct,
  type BadgeCode,
  type Category,
  type Lang,
  type ProductStatus,
} from "../../../_lib/admin";

/** 입력 중인 값은 문자열로 들고 있다가 저장할 때 숫자로 바꾼다 */
type Draft = {
  sku: string;
  categoryCode: string;
  imageUrl: string;
  status: ProductStatus;
  translations: Record<Lang, { name: string; description: string }>;
  krw: { amount: string; list: string };
  usd: { amount: string; list: string };
  variants: { size: string; stock: string; saved: boolean }[];
  badges: BadgeCode[];
  /** "" = 카테고리 기본값 */
  fit: string;
  fabric: string;
};

const empty: Draft = {
  sku: "",
  categoryCode: "",
  imageUrl: "",
  status: "ON_SALE",
  translations: { ko: { name: "", description: "" }, en: { name: "", description: "" }, ja: { name: "", description: "" }, "zh-CN": { name: "", description: "" } },
  krw: { amount: "", list: "" },
  usd: { amount: "", list: "" },
  variants: ["S", "M", "L", "XL"].map((size) => ({ size, stock: "0", saved: false })),
  badges: [],
  fit: "",
  fabric: "",
};

const centsToDollars = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2));
const toDraft = (product: AdminProduct): Draft => ({
  sku: product.sku,
  categoryCode: product.categoryCode,
  imageUrl: product.imageUrl ?? "",
  status: product.status,
  translations: Object.fromEntries(
    LANGS.map(([lang]) => [lang, { name: product.translations[lang]?.name ?? "", description: product.translations[lang]?.description ?? "" }]),
  ) as Draft["translations"],
  krw: { amount: String(product.prices.KRW?.amount ?? ""), list: product.prices.KRW?.listAmount == null ? "" : String(product.prices.KRW.listAmount) },
  usd: { amount: centsToDollars(product.prices.USD?.amount), list: centsToDollars(product.prices.USD?.listAmount) },
  variants: product.variants.map((variant) => ({ size: variant.size, stock: String(variant.stock), saved: true })),
  badges: product.badges,
  fit: product.fit ?? "",
  fabric: product.fabric ?? "",
});

const whole = (value: string) => (value.trim() === "" ? null : Math.round(Number(value)));
const cents = (value: string) => (value.trim() === "" ? null : Math.round(Number(value) * 100));

export default function ProductEditor() {
  const id = useQueryParam("id");
  const [draft, setDraft] = useState<Draft>(empty);
  const [loaded, setLoaded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lang, setLang] = useState<Lang>("ko");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi<Category[]>("/categories").then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    adminApi<AdminProduct>(`/products/${id}`)
      .then((product) => {
        setDraft(toDraft(product));
        setLoaded(true);
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, [id]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setText = (field: "name" | "description", value: string) =>
    setDraft((current) => ({ ...current, translations: { ...current.translations, [lang]: { ...current.translations[lang], [field]: value } } }));
  const setVariant = (index: number, field: "size" | "stock", value: string) =>
    setDraft((current) => ({ ...current, variants: current.variants.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant)) }));

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.translations.ko.name.trim()) {
      setLang("ko");
      return setError("한국어 상품명은 꼭 입력해 주세요.");
    }
    const variants = draft.variants.filter((variant) => variant.size.trim());
    if (variants.length === 0) return setError("사이즈를 하나 이상 입력해 주세요.");

    const prices: Record<string, { amount: number; listAmount: number | null }> = {};
    const krw = whole(draft.krw.amount);
    if (krw == null) return setError("국내 판매가(원)를 입력해 주세요.");
    prices.KRW = { amount: krw, listAmount: whole(draft.krw.list) };
    const usd = cents(draft.usd.amount);
    if (usd != null) prices.USD = { amount: usd, listAmount: cents(draft.usd.list) };

    const body = {
      sku: draft.sku.trim(),
      categoryCode: draft.categoryCode,
      imageUrl: draft.imageUrl.trim() || null,
      status: draft.status,
      translations: Object.fromEntries(
        LANGS.filter(([code]) => draft.translations[code].name.trim()).map(([code]) => [
          code,
          { name: draft.translations[code].name.trim(), description: draft.translations[code].description.trim() || null },
        ]),
      ),
      prices,
      variants: variants.map((variant) => ({ size: variant.size.trim().toUpperCase(), stock: Math.max(0, Number(variant.stock) || 0) })),
      badges: draft.badges,
      fit: draft.fit || null,
      fabric: draft.fabric || null,
    };

    setBusy(true);
    setError("");
    try {
      const saved = await adminApi<AdminProduct>(id ? `/products/${id}` : "/products", { method: id ? "PUT" : "POST", body });
      toast("저장했어요.");
      if (!id) window.history.replaceState(null, "", `/admin/products/edit?id=${saved.id}`);
      setDraft(toDraft(saved));
      setLoaded(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (id && !loaded) return error ? <p className="alert">{error}</p> : <div className="loading">불러오는 중…</div>;

  const text = draft.translations[lang];

  return (
    <form onSubmit={save}>
      <Top
        crumb="STORE / PRODUCTS"
        title={id ? draft.translations.ko.name || "상품 편집" : "상품 등록"}
        actions={
          <>
            <Link className="btn" href="/admin/products">
              목록으로
            </Link>
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? "저장 중…" : "저장"}
            </button>
          </>
        }
      />
      {error && (
        <p className="alert" role="alert" style={{ marginBottom: 14 }}>
          {error}
        </p>
      )}

      <div className="editor">
        <div className="stack">
          <div className="card">
            <div className="card-h">
              <h2>기본 정보</h2>
            </div>
            <div className="card-b grid2">
              <label className="field">
                <span>
                  상품 코드 <b>*</b>
                </span>
                <input className="input mono" value={draft.sku} onChange={(event) => set("sku", event.target.value)} maxLength={50} required placeholder="SKZ-301" />
                <small>쇼핑몰 화면과 이어지는 코드예요. 중복되면 저장이 안 돼요.</small>
              </label>
              <label className="field">
                <span>
                  카테고리 <b>*</b>
                </span>
                <select className="select" value={draft.categoryCode} onChange={(event) => set("categoryCode", event.target.value)} required>
                  <option value="">선택</option>
                  {categories.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.names.ko ?? category.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>핏</span>
                <select className="select" value={draft.fit} onChange={(event) => set("fit", event.target.value)}>
                  <option value="">카테고리 기본값</option>
                  {Object.entries(FITS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>소재</span>
                <select className="select" value={draft.fabric} onChange={(event) => set("fabric", event.target.value)}>
                  <option value="">카테고리 기본값</option>
                  {Object.entries(FABRICS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
                <small>비워 두면 타이즈는 컴프레션 · 나일론 스판, 굿즈는 프리 사이즈, 그 외는 오버핏 · 코튼으로 보여요.</small>
              </label>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span>대표 사진</span>
                <ImageUpload value={draft.imageUrl} onChange={(url) => set("imageUrl", url)} hint="쇼핑몰 목록·상세에 쓰는 사진이에요. 세로 3:4 비율이 잘 맞아요." />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h2>상품명 · 설명</h2>
              <div className="langtabs" role="tablist">
                {LANGS.map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    role="tab"
                    aria-selected={lang === code}
                    className={[draft.translations[code].name.trim() ? "filled" : "", code === "ko" ? "req" : ""].join(" ")}
                    onClick={() => setLang(code)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="card-b stack">
              <label className="field">
                <span>상품명 {lang === "ko" && <b>*</b>}</span>
                <input className="input" value={text.name} onChange={(event) => setText("name", event.target.value)} maxLength={200} />
              </label>
              <label className="field">
                <span>설명</span>
                <textarea className="textarea" value={text.description} onChange={(event) => setText("description", event.target.value)} maxLength={2000} />
              </label>
              {lang !== "ko" && <span className="hint">비워 두면 이 언어 화면에는 한국어 상품명이 보여요.</span>}
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h2>가격</h2>
              <span className="hint">시장별로 따로 정해요 · 정가는 할인 전 가격 (없으면 비워 두기)</span>
            </div>
            <div className="card-b grid2">
              <label className="field">
                <span>
                  국내 판매가 (원) <b>*</b>
                </span>
                <input className="input mono" inputMode="numeric" value={draft.krw.amount} onChange={(event) => set("krw", { ...draft.krw, amount: event.target.value })} placeholder="54800" />
              </label>
              <label className="field">
                <span>국내 정가 (원)</span>
                <input className="input mono" inputMode="numeric" value={draft.krw.list} onChange={(event) => set("krw", { ...draft.krw, list: event.target.value })} />
              </label>
              <label className="field">
                <span>해외 판매가 (USD)</span>
                <input className="input mono" inputMode="decimal" value={draft.usd.amount} onChange={(event) => set("usd", { ...draft.usd, amount: event.target.value })} placeholder="52.73" />
              </label>
              <label className="field">
                <span>해외 정가 (USD)</span>
                <input className="input mono" inputMode="decimal" value={draft.usd.list} onChange={(event) => set("usd", { ...draft.usd, list: event.target.value })} />
              </label>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h2>사이즈 · 재고</h2>
              <button className="btn sm" type="button" onClick={() => set("variants", [...draft.variants, { size: "", stock: "0", saved: false }])}>
                + 사이즈 추가
              </button>
            </div>
            <div className="table-wrap">
              <table className="vtable">
                <thead>
                  <tr>
                    <th>사이즈</th>
                    <th>재고</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {draft.variants.map((variant, index) => (
                    <tr key={index}>
                      <td>
                        <input className="input mono" value={variant.size} onChange={(event) => setVariant(index, "size", event.target.value)} maxLength={10} disabled={variant.saved} />
                      </td>
                      <td>
                        <input className="input mono" inputMode="numeric" value={variant.stock} onChange={(event) => setVariant(index, "stock", event.target.value)} />
                      </td>
                      <td className="num">
                        {!variant.saved && (
                          <button className="btn sm danger" type="button" onClick={() => set("variants", draft.variants.filter((_, i) => i !== index))}>
                            빼기
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">이미 저장된 사이즈는 주문 기록과 이어져 있어 지울 수 없어요. 팔지 않을 사이즈는 재고를 0으로 두세요.</div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-h">
              <h2>판매 상태</h2>
              <label className="switch">
                <input type="checkbox" checked={draft.status === "ON_SALE"} onChange={(event) => set("status", event.target.checked ? "ON_SALE" : "HIDDEN")} aria-label="판매 여부" />
                <i />
              </label>
            </div>
            <div className="card-b muted" style={{ fontSize: 12 }}>
              {draft.status === "ON_SALE" ? "판매 중 — 고객 화면에 보여요" : "숨김 — 고객 화면에서 사라져요 (주문 기록은 유지)"}
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <h2>미리보기</h2>
            </div>
            <div className="card-b">
              <div className="preview-img">
                {/* eslint-disable-next-line @next/next/no-img-element -- 입력한 외부 이미지 주소를 그대로 미리 본다 */}
                {draft.imageUrl.trim() ? <img src={draft.imageUrl.trim()} alt="" /> : "이미지 주소를 입력하세요"}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <h2>뱃지</h2>
            </div>
            <div className="card-b badges-pick">
              {BADGES.map((badge) => (
                <label key={badge}>
                  <input
                    type="checkbox"
                    checked={draft.badges.includes(badge)}
                    onChange={(event) => set("badges", event.target.checked ? [...draft.badges, badge] : draft.badges.filter((item) => item !== badge))}
                  />
                  {badge}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

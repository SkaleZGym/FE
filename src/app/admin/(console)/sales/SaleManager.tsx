"use client";

import { useEffect, useMemo, useState } from "react";
import ProductPicker from "../../_components/ProductPicker";
import { Chips, Thumb, Top } from "../../_components/ui";
import { adminApi, errorMessage, money, toast, type AdminProduct, type Page } from "../../_lib/admin";

type Mode = "percent" | "price";
type Prices = AdminProduct["prices"];

/** 세일 전 원래 가격: 이미 세일 중이면 정가(listAmount), 아니면 지금 판매가 */
const originalOf = (price: { amount: number; listAmount: number | null } | undefined) => (price ? (price.listAmount ?? price.amount) : null);
const onSale = (product: AdminProduct) => {
  const krw = product.prices.KRW;
  return Boolean(krw && krw.listAmount != null && krw.listAmount > krw.amount);
};
const percentOf = (product: AdminProduct) => {
  const krw = product.prices.KRW;
  return krw?.listAmount ? Math.round((1 - krw.amount / krw.listAmount) * 100) : 0;
};
const nameOf = (product: AdminProduct) => product.translations.ko?.name ?? product.sku;

/** 상품 저장 API(PUT)에 보낼 본문: 받은 상품 그대로 + 가격·배지만 바꿔서 */
const saveBody = (product: AdminProduct, prices: Prices, badges: AdminProduct["badges"]) => ({
  sku: product.sku,
  categoryCode: product.categoryCode,
  imageUrl: product.imageUrl,
  status: product.status,
  translations: product.translations,
  prices,
  variants: product.variants.map((variant) => ({ size: variant.size, stock: variant.stock })),
  badges,
  fit: product.fit,
  fabric: product.fabric,
});

/**
 * 세일 관리: 상품을 찾아 할인율(또는 할인가)을 정하면 정가는 그대로 두고 판매가만 내린다.
 * 정가가 있는 상품은 쇼핑몰 SHOP › SALE 에 모이고, 가격에 줄 그은 정가와 SALE 표시가 붙는다.
 * 해외(달러) 가격도 같은 비율로 내린다
 */
export default function SaleManager() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [link, setLink] = useState("");
  const [mode, setMode] = useState<Mode>("percent");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    adminApi<Page<AdminProduct>>("/products?size=1000")
      .then((page) => setProducts(page.content))
      .catch((caught) => toast(errorMessage(caught), true));
  useEffect(() => {
    load();
  }, []);

  const selected = products?.find((product) => `/product/${product.id}` === link) ?? null;
  const sales = useMemo(() => (products ?? []).filter(onSale), [products]);

  // 고른 상품의 원래 가격과 세일 가격 미리 계산
  const krwOriginal = originalOf(selected?.prices.KRW);
  const usdOriginal = originalOf(selected?.prices.USD);
  const number = Number(value.replace(/[^\d.]/g, ""));
  const ratio =
    krwOriginal == null || !value.trim() || !Number.isFinite(number)
      ? null
      : mode === "percent"
        ? 1 - number / 100
        : number / krwOriginal;
  const valid = ratio != null && ratio > 0 && ratio < 1;
  const krwSale = valid && krwOriginal != null ? (mode === "price" ? Math.round(number) : Math.round((krwOriginal * ratio) / 100) * 100) : null;
  const usdSale = valid && usdOriginal != null ? Math.round(usdOriginal * ratio) : null;

  const pick = (next: string) => {
    setLink(next);
    const product = products?.find((item) => `/product/${item.id}` === next);
    setValue(product && onSale(product) ? String(percentOf(product)) : "");
    setMode("percent");
  };

  const apply = async () => {
    if (!selected || !valid || krwSale == null || krwOriginal == null) return toast("할인율은 1~99%, 할인가는 원래 가격보다 낮게 넣어 주세요.", true);
    setBusy(true);
    try {
      const fresh = await adminApi<AdminProduct>(`/products/${selected.id}`);
      const prices: Prices = { KRW: { amount: krwSale, listAmount: originalOf(fresh.prices.KRW) } };
      if (fresh.prices.USD && usdSale != null) prices.USD = { amount: usdSale, listAmount: originalOf(fresh.prices.USD) };
      const badges = fresh.badges.includes("SALE") ? fresh.badges : [...fresh.badges, "SALE" as const];
      await adminApi(`/products/${selected.id}`, { method: "PUT", body: saveBody(fresh, prices, badges) });
      toast(`${nameOf(selected)} 세일을 걸었어요.`);
      setLink("");
      setValue("");
      await load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  const end = async (product: AdminProduct) => {
    if (!window.confirm(`${nameOf(product)} 세일을 끝내고 원래 가격으로 돌릴까요?`)) return;
    setBusy(true);
    try {
      const fresh = await adminApi<AdminProduct>(`/products/${product.id}`);
      const prices: Prices = {};
      for (const currency of ["KRW", "USD"] as const) {
        const price = fresh.prices[currency];
        if (price) prices[currency] = { amount: originalOf(price) ?? price.amount, listAmount: null };
      }
      await adminApi(`/products/${product.id}`, { method: "PUT", body: saveBody(fresh, prices, fresh.badges.filter((badge) => badge !== "SALE")) });
      toast("세일을 끝냈어요.");
      await load();
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Top
        crumb="STORE / SALE"
        title="세일 관리"
        actions={
          <a className="btn" href="/ko/shop/sale" target="_blank" rel="noreferrer">
            쇼핑몰 SALE 보기 ↗
          </a>
        }
      />
      <div className="notice">
        <span>ⓘ</span>
        <span>
          상품을 찾아 할인율이나 할인가를 넣으면 원래 가격은 정가(줄 그은 가격)로 남고 판매가만 내려가요. 세일 상품은 쇼핑몰 <b>SHOP › SALE</b>에 모이고 SALE 표시가
          붙어요. 해외 화면 달러 가격도 같은 비율로 내려가요. 쇼핑몰에는 1분쯤 뒤에 반영돼요.
        </span>
      </div>

      <div className="stack">
        <div className="card">
          <div className="card-h">
            <h2>세일 걸기</h2>
          </div>
          <div className="card-b grid3">
            <div className="field" style={{ gridColumn: "span 2" }}>
              <span>상품</span>
              <ProductPicker value={link} onChange={pick} placeholder="눌러서 상품명·상품 코드로 찾기" noneLabel={null} />
            </div>
            <div className="field">
              <span>할인 방식</span>
              <Chips
                value={mode}
                onChange={(next) => {
                  if (!next) return;
                  setMode(next);
                  setValue("");
                }}
                options={[
                  { value: "percent", label: "할인율 %" },
                  { value: "price", label: "할인가 직접" },
                ]}
              />
            </div>
          </div>
          {selected && (
            <div className="card-b grid3" style={{ paddingTop: 0 }}>
              <label className="field">
                <span>{mode === "percent" ? "할인율 (%)" : "할인가 (원)"}</span>
                <input
                  className="input mono"
                  inputMode="numeric"
                  placeholder={mode === "percent" ? "예: 20" : "예: 39000"}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              </label>
              <dl className="kv">
                <dt>원래 가격</dt>
                <dd className="mono">
                  {krwOriginal == null ? "-" : money(krwOriginal, "KRW")}
                  {usdOriginal != null && <small className="muted" style={{ display: "block" }}>{money(usdOriginal, "USD")}</small>}
                </dd>
                <dt>세일 가격</dt>
                <dd className="mono">
                  {krwSale == null ? "-" : money(krwSale, "KRW")}
                  {krwSale != null && krwOriginal != null && ` (${Math.round((1 - krwSale / krwOriginal) * 100)}% 할인)`}
                  {usdSale != null && <small className="muted" style={{ display: "block" }}>{money(usdSale, "USD")}</small>}
                </dd>
              </dl>
              <div style={{ alignSelf: "end", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {selected.status === "HIDDEN" && <span className="hint">숨김 상품이라 쇼핑몰엔 안 보여요</span>}
                <button className="btn primary" type="button" onClick={apply} disabled={busy || !valid}>
                  {onSale(selected) ? "할인 바꾸기" : "세일 걸기"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h2>세일 중인 상품 {products && `· ${sales.length}개`}</h2>
          </div>
          {!products ? (
            <p className="card-b muted">불러오는 중…</p>
          ) : sales.length === 0 ? (
            <p className="card-b muted">세일 중인 상품이 없어요. 위에서 상품을 골라 세일을 걸어 보세요.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>상품</th>
                    <th>정가</th>
                    <th>세일가</th>
                    <th>할인</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sales.map((product) => {
                    const krw = product.prices.KRW!;
                    return (
                      <tr key={product.id}>
                        <td>
                          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Thumb src={product.imageUrl} />
                            <span>
                              <b>{nameOf(product)}</b>
                              <br />
                              <small className="mono muted">
                                {product.sku}
                                {product.status === "HIDDEN" && " · 숨김"}
                              </small>
                            </span>
                          </span>
                        </td>
                        <td className="mono muted">
                          <s>{money(krw.listAmount!, "KRW")}</s>
                        </td>
                        <td className="mono">{money(krw.amount, "KRW")}</td>
                        <td className="mono">{percentOf(product)}%</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <button className="btn sm" type="button" disabled={busy} onClick={() => pick(`/product/${product.id}`)}>
                            할인 바꾸기
                          </button>{" "}
                          <button className="btn sm danger" type="button" disabled={busy} onClick={() => end(product)}>
                            세일 끝내기
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Chips, Pager, Thumb, Top } from "../../_components/ui";
import { adminApi, errorMessage, money, toast, type AdminProduct, type Category, type Page, type ProductStatus } from "../../_lib/admin";

export default function ProductList() {
  const router = useRouter();
  const [status, setStatus] = useState<ProductStatus | null>(null);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AdminProduct> | null>(null);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const query = new URLSearchParams({ page: String(page), size: "50" });
    if (status) query.set("status", status);
    adminApi<Page<AdminProduct>>(`/products?${query}`)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, [page, status]);

  useEffect(load, [load]);

  useEffect(() => {
    adminApi<Category[]>("/categories")
      .then((list) => setCategories(Object.fromEntries(list.map((category) => [category.code, category.names.ko ?? category.code]))))
      .catch(() => undefined);
  }, []);

  const toggle = async (product: AdminProduct) => {
    const next: ProductStatus = product.status === "ON_SALE" ? "HIDDEN" : "ON_SALE";
    try {
      const updated = await adminApi<AdminProduct>(`/products/${product.id}/status`, { method: "PATCH", body: { status: next } });
      setData((current) => current && { ...current, content: current.content.map((item) => (item.id === updated.id ? updated : item)) });
      toast(next === "ON_SALE" ? "판매 중으로 바꿨어요." : "숨김으로 바꿨어요.");
    } catch (caught) {
      toast(errorMessage(caught), true);
    }
  };

  const word = keyword.trim().toLowerCase();
  const rows = (data?.content ?? []).filter(
    (product) => !word || product.sku.toLowerCase().includes(word) || Object.values(product.translations).some((t) => t?.name.toLowerCase().includes(word)),
  );

  return (
    <>
      <Top
        crumb="STORE / PRODUCTS"
        title="상품 관리"
        actions={
          <Link className="btn primary" href="/admin/products/edit">
            + 상품 등록
          </Link>
        }
      />
      <div className="card">
        <div className="toolbar">
          <Chips
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(0);
            }}
            options={[
              { value: null, label: "전체" },
              { value: "ON_SALE", label: "판매 중" },
              { value: "HIDDEN", label: "숨김" },
            ]}
          />
          <input className="input spacer" placeholder="상품명·상품 코드 검색 (이 페이지)" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        </div>
        {error && <p className="alert">{error}</p>}
        {!data ? (
          <div className="loading">불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div className="empty">상품이 없어요.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>상품</th>
                  <th>카테고리</th>
                  <th className="num">국내가</th>
                  <th className="num">해외가</th>
                  <th className="num">재고</th>
                  <th>뱃지</th>
                  <th>판매</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => {
                  const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
                  const krw = product.prices.KRW;
                  const usd = product.prices.USD;
                  return (
                    <tr key={product.id} className="click" onClick={() => router.push(`/admin/products/edit?id=${product.id}`)}>
                      <td>
                        <div className="cell-prod">
                          <Thumb src={product.imageUrl} />
                          <div>
                            <b>{product.translations.ko?.name ?? product.sku}</b>
                            <span className="mono muted">{product.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="muted">{categories[product.categoryCode] ?? product.categoryCode}</td>
                      <td className="num">{krw ? money(krw.amount, "KRW") : "-"}</td>
                      <td className="num">{usd ? money(usd.amount, "USD") : "-"}</td>
                      <td className="num">
                        <span className={stock === 0 ? "badge red" : ""}>{stock === 0 ? "품절" : stock}</span>
                      </td>
                      <td className="mono">{product.badges.join(" · ")}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <label className="switch" title={product.status === "ON_SALE" ? "판매 중" : "숨김"}>
                          <input type="checkbox" checked={product.status === "ON_SALE"} onChange={() => toggle(product)} aria-label="판매 여부" />
                          <i />
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={data.page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />}
      </div>
    </>
  );
}

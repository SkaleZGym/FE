"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { adminApi, type AdminProduct, type Page } from "../_lib/admin";
import { Thumb } from "./ui";

/** 쇼핑몰 상품 상세 주소: /product/{FE 상품 번호}. 언어(/ko 등)는 고객 화면이 붙인다 */
export const productLink = (product: AdminProduct) => {
  const id = product.sku.match(/^SKZ-(\d+)$/)?.[1];
  return id ? `/product/${id}` : null;
};

/**
 * 연결할 상품 고르기: 누르면 목록이 열리고, 이름·상품 코드로 찾을 수 있다.
 * value 는 링크 주소(/product/166). 맨 위 '연결 안 함'으로 비울 수 있다
 */
export default function ProductPicker({ value, onChange }: { value: string; onChange: (link: string) => void }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminApi<Page<AdminProduct>>("/products?size=500&sort=createdAt,desc")
      .then((page) => setProducts(page.content.filter((product) => productLink(product))))
      .catch(() => undefined);
  }, []);

  // 바깥을 누르거나 Esc 면 닫는다
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = products.find((product) => productLink(product) === value) ?? null;
  const word = keyword.trim().toLowerCase();
  const list = useMemo(
    () =>
      products.filter(
        (product) =>
          !word || product.sku.toLowerCase().includes(word) || Object.values(product.translations).some((t) => t?.name.toLowerCase().includes(word)),
      ),
    [products, word],
  );

  const pick = (link: string) => {
    onChange(link);
    setOpen(false);
    setKeyword("");
  };

  return (
    <div className="picker" ref={box}>
      <button type="button" className="picker-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {selected ? (
          <>
            <Thumb src={selected.imageUrl} />
            <span>
              <b>{selected.translations.ko?.name ?? selected.sku}</b>
              <small className="mono muted">{selected.sku}</small>
            </span>
          </>
        ) : value ? (
          <span className="mono">{value}</span>
        ) : (
          <span className="muted">연결 안 함 (누르면 상품을 골라요)</span>
        )}
        <i aria-hidden="true">▾</i>
      </button>
      {open && (
        <div className="picker-panel">
          <input ref={search} className="input" placeholder="상품명·상품 코드로 찾기" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <ul role="listbox">
            <li>
              <button type="button" role="option" aria-selected={!value} onClick={() => pick("")}>
                <span className="muted">연결 안 함</span>
              </button>
            </li>
            {list.map((product) => {
              const link = productLink(product)!;
              return (
                <li key={product.id}>
                  <button type="button" role="option" aria-selected={link === value} onClick={() => pick(link)}>
                    <Thumb src={product.imageUrl} />
                    <span>
                      <b>{product.translations.ko?.name ?? product.sku}</b>
                      <small className="mono muted">
                        {product.sku}
                        {product.status === "HIDDEN" && " · 숨김"}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
            {list.length === 0 && <li className="picker-empty">찾는 상품이 없어요.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

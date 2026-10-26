"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { openProduct } from "./productEvents";
import styles from "./CategoryBrowser.module.css";

/** 서버에서 언어·통화에 맞게 가공해서 넘기는 상품 데이터 */
export type BrowserItem = {
  id: number;
  image: string;
  name: string;
  fit: string;
  sizes: string[];
  soldOut: boolean;
  isNew: boolean;
  isBest: boolean;
  price: string;
  listPrice?: string;
  /** 가격 정렬용 숫자 (현재 통화) */
  priceValue: number;
};

type SortKey = "new" | "recommended" | "low" | "high";
type View = "large" | "small";

export type BrowserLabels = {
  count: string;
  fit: string;
  size: string;
  stock: string;
  inStock: string;
  soldOut: string;
  sort: { label: string; new: string; recommended: string; low: string; high: string };
  view: { label: string; large: string; small: string };
  filter: string;
  reset: string;
  empty: string;
  sale: string;
  soldOutTag: string;
  newTag: string;
};

type Props = {
  items: BrowserItem[];
  /** 사이즈 필터 순서 (S, M, L …) */
  sizeOrder: string[];
  labels: BrowserLabels;
};

/** 같은 그룹 안에서는 하나라도 맞으면(OR), 그룹끼리는 모두 맞아야(AND) 보인다 */
type Filters = Record<"fit" | "size" | "stock", Set<string>>;
const emptyFilters = (): Filters => ({ fit: new Set(), size: new Set(), stock: new Set() });

/**
 * 카테고리 페이지 본문: 툴바(보기 방식 · 정렬) + 왼쪽 필터 + 상품 그리드.
 * 툴바와 본문이 같은 2단 격자(필터 폭 | 나머지)를 써서, 툴바의 칸 경계와 필터 열·상품 그리드 가장자리가 위아래로 맞는다.
 */
export default function CategoryBrowser({ items, sizeOrder, labels }: Props) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState<SortKey>("new");
  const [view, setView] = useState<View>("large");
  const [filterOpen, setFilterOpen] = useState(false);

  // 필터 항목과 개수는 이 카테고리 전체 기준 (다른 필터를 골라도 숫자가 흔들리지 않게)
  const groups = useMemo(() => {
    const count = <T,>(values: T[]) => values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<T, number>());
    const fits = count(items.map((item) => item.fit));
    const sizes = count(items.flatMap((item) => item.sizes));
    return {
      fit: [...fits.entries()],
      size: sizeOrder.filter((size) => sizes.has(size)).map((size) => [size, sizes.get(size)!] as const),
      stock: [
        ["in", items.filter((item) => !item.soldOut).length, labels.inStock],
        ["out", items.filter((item) => item.soldOut).length, labels.soldOut],
      ] as const,
    };
  }, [items, sizeOrder, labels.inStock, labels.soldOut]);

  const visible = useMemo(() => {
    const matched = items.filter(
      (item) =>
        (filters.fit.size === 0 || filters.fit.has(item.fit)) &&
        (filters.size.size === 0 || item.sizes.some((size) => filters.size.has(size))) &&
        (filters.stock.size === 0 || filters.stock.has(item.soldOut ? "out" : "in")),
    );
    const byOrder = (a: BrowserItem, b: BrowserItem) => items.indexOf(a) - items.indexOf(b);
    const compare: Record<SortKey, (a: BrowserItem, b: BrowserItem) => number> = {
      // 상품 번호가 클수록 최근 등록 (BE 연동 후에는 등록일)
      new: (a, b) => b.id - a.id,
      // 베스트 먼저, 품절은 뒤로, 나머지는 기본 순서
      recommended: (a, b) => Number(b.isBest) - Number(a.isBest) || Number(a.soldOut) - Number(b.soldOut) || byOrder(a, b),
      low: (a, b) => a.priceValue - b.priceValue || byOrder(a, b),
      high: (a, b) => b.priceValue - a.priceValue || byOrder(a, b),
    };
    return [...matched].sort(compare[sort]);
  }, [items, filters, sort]);

  const activeCount = filters.fit.size + filters.size.size + filters.stock.size;
  const toggle = (group: keyof Filters, value: string) =>
    setFilters((current) => {
      const next = new Set(current[group]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...current, [group]: next };
    });
  const countText = labels.count.replace("{n}", String(visible.length));

  return (
    <div className={styles.browser}>
      {/* 툴바: [보기 방식 | (모바일) 필터 버튼 … | 정렬] */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarInner}>
          <div className={styles.viewCell} role="group" aria-label={labels.view.label}>
            <button type="button" aria-pressed={view === "small"} aria-label={labels.view.small} onClick={() => setView("small")}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <rect x="1.5" y="1.5" width="5" height="5" />
                <rect x="9.5" y="1.5" width="5" height="5" />
                <rect x="1.5" y="9.5" width="5" height="5" />
                <rect x="9.5" y="9.5" width="5" height="5" />
              </svg>
            </button>
            <button type="button" aria-pressed={view === "large"} aria-label={labels.view.large} onClick={() => setView("large")}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <rect x="1.5" y="1.5" width="13" height="13" />
                <path d="M8 1.5v13M1.5 8h13" />
              </svg>
            </button>
          </div>
          <div className={styles.midCell}>
            <button type="button" className={styles.filterButton} aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}>
              {labels.filter}
              {activeCount > 0 && <span>{activeCount}</span>}
            </button>
            <span className={styles.mobileCount}>{countText}</span>
          </div>
          <label className={styles.sortCell}>
            <span className={styles.srOnly}>{labels.sort.label}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              {(["new", "recommended", "low", "high"] as const).map((key) => (
                <option key={key} value={key}>
                  {labels.sort[key]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={styles.body}>
        <aside className={styles.sidebar} data-open={filterOpen || undefined}>
          <p className={styles.count}>{countText}</p>

          <FilterGroup title={labels.fit}>
            {groups.fit.map(([fit, n]) => (
              <Check key={fit} label={fit} n={n} checked={filters.fit.has(fit)} onChange={() => toggle("fit", fit)} />
            ))}
          </FilterGroup>
          <FilterGroup title={labels.size}>
            {groups.size.map(([size, n]) => (
              <Check key={size} label={size} n={n} checked={filters.size.has(size)} onChange={() => toggle("size", size)} />
            ))}
          </FilterGroup>
          <FilterGroup title={labels.stock}>
            {groups.stock.map(([key, n, label]) => (
              <Check key={key} label={label} n={n} checked={filters.stock.has(key)} disabled={n === 0} onChange={() => toggle("stock", key)} />
            ))}
          </FilterGroup>

          {activeCount > 0 && (
            <button type="button" className={styles.reset} onClick={() => setFilters(emptyFilters())}>
              {labels.reset}
            </button>
          )}
        </aside>

        <div>
          {visible.length === 0 ? (
            <p className={styles.empty}>{labels.empty}</p>
          ) : (
            <ul className={styles.grid} data-view={view}>
              {visible.map((item) => (
                <li key={item.id}>
                  <a
                    className={styles.card}
                    href={`#product-${item.id}`}
                    data-soldout={item.soldOut || undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      openProduct(item.id);
                    }}
                  >
                    <span className={styles.image}>
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes={view === "small" ? "(max-width: 860px) 50vw, 22vw" : "(max-width: 860px) 100vw, 30vw"}
                      />
                      <span className={styles.tags}>
                        {item.soldOut && <span>{labels.soldOutTag}</span>}
                        {!item.soldOut && item.listPrice && <span data-tone="red">{labels.sale}</span>}
                        {!item.soldOut && item.isNew && <span>{labels.newTag}</span>}
                      </span>
                    </span>
                    <span className={styles.name}>{item.name}</span>
                    <span className={styles.fit}>{item.fit}</span>
                    <span className={styles.price} data-sale={item.listPrice ? "" : undefined}>
                      {item.price}
                      {item.listPrice && <s>{item.listPrice}</s>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className={styles.group}>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function Check({ label, n, checked, disabled, onChange }: { label: string; n: number; checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <label className={styles.check} data-disabled={disabled || undefined}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      <span>{label}</span>
      <em>({n})</em>
    </label>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Chips, Top } from "../../_components/ui";
import { adminApi, errorMessage, toast, type AdminProduct, type Category, type Page } from "../../_lib/admin";
import { guessColumn, readSheets, shortHash, toIso, toNumber, type Sheet } from "../../_lib/sheet";

type Kind = "products" | "orders" | "reviews";
type FieldDef = { key: string; label: string; required?: boolean; hints: string[] };

/** 아임웹 엑셀 머리글 후보 (실제 파일 머리글이 다르면 화면에서 골라 바꾼다) */
const FIELDS: Record<Kind, FieldDef[]> = {
  products: [
    { key: "no", label: "상품번호", hints: ["상품번호", "상품 번호", "상품코드", "상품 코드", "product no", "idx", "번호"] },
    { key: "name", label: "상품명", required: true, hints: ["상품명", "상품 이름", "product name", "이름"] },
    { key: "price", label: "판매가", required: true, hints: ["판매가", "판매 가격", "가격", "price"] },
    { key: "listPrice", label: "정가(소비자가)", hints: ["소비자가", "정가", "시중가", "할인 전"] },
    { key: "option", label: "옵션(사이즈)", hints: ["옵션값", "옵션 값", "옵션", "사이즈", "option"] },
    { key: "stock", label: "재고", hints: ["재고", "재고수량", "수량", "stock"] },
    { key: "image", label: "대표 이미지", hints: ["대표이미지", "대표 이미지", "이미지", "image"] },
    { key: "description", label: "설명", hints: ["간단설명", "요약", "설명", "description"] },
    { key: "category", label: "카테고리", hints: ["카테고리", "분류", "category"] },
  ],
  orders: [
    { key: "orderNo", label: "주문번호", required: true, hints: ["주문번호", "주문 번호", "order no"] },
    { key: "email", label: "주문자 이메일", hints: ["주문자 이메일", "이메일", "주문자 아이디", "아이디", "email"] },
    { key: "orderedAt", label: "주문일", hints: ["주문일시", "주문일", "결제일시", "결제일", "주문 일"] },
    { key: "status", label: "주문 상태", hints: ["주문상태", "주문 상태", "상태", "배송상태"] },
    { key: "product", label: "상품명", required: true, hints: ["상품명", "주문상품", "상품"] },
    { key: "option", label: "옵션", hints: ["옵션", "옵션정보", "옵션명"] },
    { key: "quantity", label: "수량", hints: ["수량", "주문수량", "qty"] },
    { key: "total", label: "결제 금액", hints: ["총 결제금액", "총결제금액", "실결제금액", "결제금액", "결제 금액", "주문금액"] },
  ],
  reviews: [
    { key: "product", label: "상품 (이름 또는 번호)", required: true, hints: ["상품명", "상품번호", "상품", "product"] },
    { key: "author", label: "작성자", hints: ["작성자", "이름", "닉네임", "글쓴이"] },
    { key: "email", label: "작성자 이메일", hints: ["이메일", "아이디", "email"] },
    { key: "rating", label: "별점", required: true, hints: ["평점", "별점", "점수", "rating"] },
    { key: "content", label: "내용", required: true, hints: ["내용", "구매평", "후기", "본문", "content"] },
    { key: "createdAt", label: "작성일", hints: ["작성일시", "작성일", "등록일", "날짜", "date"] },
  ],
};

const TITLES: Record<Kind, string> = { products: "상품", orders: "주문 내역", reviews: "후기" };
const SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "FREE"];

type ImportResult = { created: number; skipped: number; failures: { index: number; key: string; reason: string }[] };

/** 옵션 글자에서 사이즈 찾기: 'Size: XL' · '블랙 / 2XL' · 'XXL' → 2XL. 못 찾으면 null */
function sizeOf(option: string): string | null {
  const tokens = option.toUpperCase().replace(/XXXL/g, "3XL").replace(/XXL/g, "2XL").split(/[^A-Z0-9]+/);
  for (const token of tokens.reverse()) if (SIZES.includes(token)) return token;
  return null;
}

/** '★★★★☆' · '4' · '4.0' · '80'(100점 만점) → 1~5 */
function ratingOf(value: string): number | null {
  const stars = (value.match(/★/g) ?? []).length;
  if (stars) return Math.min(5, stars);
  const number = toNumber(value);
  if (number == null) return null;
  const five = number > 5 ? Math.round(number / 20) : Math.round(number);
  return Math.min(5, Math.max(1, five));
}

const normalize = (text: string) => text.replace(/\s+/g, "").toLowerCase();

export default function ImportCenter() {
  const [kind, setKind] = useState<Kind>("products");
  const [fileLabel, setFileLabel] = useState("");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // 상품 가져오기 설정
  const [categoryCode, setCategoryCode] = useState("");
  const [usdRate, setUsdRate] = useState("1400");
  const [hidden, setHidden] = useState(true);

  const loadProducts = () => adminApi<Page<AdminProduct>>("/products?size=1000").then((page) => setProducts(page.content));
  useEffect(() => {
    loadProducts().catch(() => undefined);
    adminApi<Category[]>("/categories")
      .then((list) => {
        setCategories(list);
        setCategoryCode((current) => current || list.find((category) => category.code === "MEN_TOP")?.code || list[0]?.code || "");
      })
      .catch(() => undefined);
  }, []);

  const reset = (next: Kind) => {
    setKind(next);
    setSheet(null);
    setFileLabel("");
    setResult(null);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;
    try {
      const read = await readSheets(files);
      if (read.rows.length === 0) return toast("읽을 수 있는 행이 없어요.", true);
      const used = new Set<number>();
      const guessed: Record<string, number> = {};
      for (const field of FIELDS[kind]) {
        const index = guessColumn(read.headers, field.hints, used);
        guessed[field.key] = index;
        if (index >= 0) used.add(index);
      }
      setSheet(read);
      setMapping(guessed);
      setFileLabel(files.length > 1 ? `파일 ${files.length}개` : files[0].name);
      setResult(null);
    } catch (caught) {
      toast(errorMessage(caught), true);
    }
  };

  const cell = (row: string[], key: string) => {
    const index = mapping[key] ?? -1;
    return index >= 0 ? (row[index] ?? "").trim() : "";
  };

  // ---------- 행 → 보낼 데이터 ----------

  const productDrafts = useMemo(() => {
    if (kind !== "products" || !sheet) return [];
    const groups = new Map<string, { no: string; name: string; price: number; listPrice: number | null; image: string; description: string; category: string; sizes: Map<string, number> }>();
    for (const row of sheet.rows) {
      const name = cell(row, "name");
      const price = toNumber(cell(row, "price"));
      if (!name || price == null) continue;
      const no = cell(row, "no");
      const key = no || normalize(name);
      const group = groups.get(key) ?? {
        no,
        name,
        price,
        listPrice: toNumber(cell(row, "listPrice")),
        image: cell(row, "image"),
        description: cell(row, "description"),
        category: cell(row, "category"),
        sizes: new Map<string, number>(),
      };
      // 옵션 한 줄 = 사이즈 하나. 옵션 칸에 'S,M,L'처럼 여러 개가 있으면 각각
      const options = cell(row, "option");
      const stock = Math.max(0, Math.round(toNumber(cell(row, "stock")) ?? 0));
      const found = options.split(/[,\n]/).map(sizeOf).filter((size): size is string => Boolean(size));
      for (const size of found.length > 0 ? found : ["FREE"]) group.sizes.set(size, (group.sizes.get(size) ?? 0) + stock);
      groups.set(key, group);
    }
    const rate = Number(usdRate) || 1400;
    return [...groups.values()].map((group) => {
      const category =
        categories.find((item) => group.category && (item.code === group.category.toUpperCase() || item.names.ko === group.category))?.code ?? categoryCode;
      const sizes = [...group.sizes.entries()].sort((a, b) => SIZES.indexOf(a[0]) - SIZES.indexOf(b[0]));
      return {
        sku: group.no ? `SKZ-${group.no}` : `IMW-${shortHash(group.name).slice(0, 10)}`,
        name: group.name,
        categoryCode: category,
        imageUrl: /^https?:\/\//.test(group.image) ? group.image : null,
        description: group.description || null,
        krw: Math.round(group.price),
        krwList: group.listPrice && group.listPrice > group.price ? Math.round(group.listPrice) : null,
        // 해외 화면 가격: 원화 ÷ 환율, 0.01달러 단위 → 센트
        usd: Math.round((group.price / rate) * 100),
        usdList: group.listPrice && group.listPrice > group.price ? Math.round((group.listPrice / rate) * 100) : null,
        variants: sizes.map(([size, stock]) => ({ size, stock })),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cell은 mapping으로 정해진다
  }, [kind, sheet, mapping, usdRate, categoryCode, categories]);

  const orderDrafts = useMemo(() => {
    if (kind !== "orders" || !sheet) return [];
    const groups = new Map<string, { orderNumber: string; email: string; orderedAt: string | null; status: string; lines: string[]; total: number | null }>();
    for (const row of sheet.rows) {
      const orderNumber = cell(row, "orderNo");
      const product = cell(row, "product");
      if (!orderNumber || !product) continue;
      const group = groups.get(orderNumber) ?? { orderNumber, email: cell(row, "email"), orderedAt: toIso(cell(row, "orderedAt")), status: cell(row, "status"), lines: [], total: null };
      const option = cell(row, "option");
      const quantity = Math.max(1, Math.round(toNumber(cell(row, "quantity")) ?? 1));
      group.lines.push(`${product}${option ? ` / ${option}` : ""} × ${quantity}`);
      const total = toNumber(cell(row, "total"));
      // 주문 한 건의 결제 금액은 줄마다 같은 값이 반복되는 경우가 많아 가장 큰 값을 쓴다
      if (total != null) group.total = Math.max(group.total ?? 0, total);
      groups.set(orderNumber, group);
    }
    return [...groups.values()].map((group) => ({
      orderNumber: group.orderNumber,
      email: /@/.test(group.email) ? group.email : null,
      orderedAt: group.orderedAt,
      status: group.status.slice(0, 50) || null,
      items: group.lines.join("\n").slice(0, 2000),
      totalAmount: group.total == null ? null : Math.round(group.total),
      currency: "KRW",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cell은 mapping으로 정해진다
  }, [kind, sheet, mapping]);

  /** 후기의 상품 찾기: 상품번호(SKZ-번호) · 상품 코드 · 한국어 상품명 */
  const productIdOf = (value: string) => {
    if (!value) return null;
    const bySku = products.find((product) => product.sku === value || product.sku === `SKZ-${value}`);
    if (bySku) return bySku.id;
    const key = normalize(value);
    return products.find((product) => normalize(product.translations.ko?.name ?? "") === key)?.id ?? null;
  };

  const reviewDrafts = useMemo(() => {
    if (kind !== "reviews" || !sheet) return { ok: [], missing: [] as string[] };
    const ok: { legacyId: string; productId: number; email: string | null; authorName: string | null; rating: number; content: string; createdAt: string | null }[] = [];
    const missing = new Set<string>();
    for (const row of sheet.rows) {
      const product = cell(row, "product");
      const content = cell(row, "content");
      const rating = ratingOf(cell(row, "rating"));
      if (!product || !content || rating == null) continue;
      const productId = productIdOf(product);
      if (!productId) {
        missing.add(product);
        continue;
      }
      const author = cell(row, "author");
      const createdAt = toIso(cell(row, "createdAt"));
      const email = cell(row, "email");
      ok.push({
        legacyId: shortHash(`${product}|${author}|${createdAt ?? ""}|${content}`),
        productId,
        email: /@/.test(email) ? email : null,
        authorName: author.slice(0, 50) || null,
        rating,
        content: content.slice(0, 1000),
        createdAt,
      });
    }
    return { ok, missing: [...missing] };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cell·productIdOf는 mapping·products로 정해진다
  }, [kind, sheet, mapping, products]);

  const count = kind === "products" ? productDrafts.length : kind === "orders" ? orderDrafts.length : reviewDrafts.ok.length;
  const requiredMissing = FIELDS[kind].some((field) => field.required && (mapping[field.key] ?? -1) < 0);

  // ---------- 가져오기 ----------

  const start = async () => {
    if (requiredMissing) return toast("* 표시한 열을 모두 골라 주세요.", true);
    if (count === 0) return toast("가져올 행이 없어요.", true);
    if (!window.confirm(`${TITLES[kind]} ${count.toLocaleString()}건을 가져올까요? 이미 있는 것은 건너뛰어요.`)) return;
    setBusy(true);
    setResult(null);
    const total: ImportResult = { created: 0, skipped: 0, failures: [] };
    try {
      if (kind === "products") await importProducts(total);
      else {
        const items = kind === "orders" ? orderDrafts : reviewDrafts.ok;
        for (let from = 0; from < items.length; from += 500) {
          setProgress(`${Math.min(from + 500, items.length).toLocaleString()} / ${items.length.toLocaleString()}`);
          const batch = items.slice(from, from + 500);
          const response = await adminApi<ImportResult>(`/import/${kind}`, { method: "POST", body: kind === "orders" ? { orders: batch } : { reviews: batch } });
          total.created += response.created;
          total.skipped += response.skipped;
          total.failures.push(...response.failures.map((failure) => ({ ...failure, index: from + failure.index + 1 })));
        }
      }
      setResult(total);
      toast(`${total.created.toLocaleString()}건을 가져왔어요.`);
    } catch (caught) {
      setResult(total);
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  /** 상품은 기존 상품 등록 API로 하나씩. 같은 상품 코드가 이미 있으면 건너뛴다 (영어 이름·핏 등 손본 내용을 덮지 않게) */
  const importProducts = async (total: ImportResult) => {
    const existing = new Set(products.map((product) => product.sku));
    for (let i = 0; i < productDrafts.length; i++) {
      const draft = productDrafts[i];
      setProgress(`${i + 1} / ${productDrafts.length}`);
      if (existing.has(draft.sku)) {
        total.skipped++;
        continue;
      }
      const body = {
        sku: draft.sku,
        categoryCode: draft.categoryCode,
        imageUrl: draft.imageUrl,
        status: hidden ? "HIDDEN" : "ON_SALE",
        translations: { ko: { name: draft.name, description: draft.description } },
        prices: { KRW: { amount: draft.krw, listAmount: draft.krwList }, USD: { amount: draft.usd, listAmount: draft.usdList } },
        variants: draft.variants,
        badges: [],
        fit: null,
        fabric: null,
      };
      try {
        await adminApi("/products", { method: "POST", body });
        existing.add(draft.sku);
        total.created++;
      } catch (caught) {
        total.failures.push({ index: i + 1, key: draft.name, reason: errorMessage(caught) });
      }
    }
    await loadProducts().catch(() => undefined);
  };

  // ---------- 화면 ----------

  const previewRows =
    kind === "products"
      ? productDrafts.slice(0, 5).map((draft) => [draft.sku, draft.name, `₩${draft.krw.toLocaleString()}`, draft.variants.map((v) => `${v.size}:${v.stock}`).join(" "), draft.categoryCode])
      : kind === "orders"
        ? orderDrafts.slice(0, 5).map((order) => [order.orderNumber, order.email ? order.email.replace(/^(.{2})[^@]*/, "$1***") : "-", order.orderedAt ? new Date(order.orderedAt).toLocaleDateString("ko-KR") : "-", order.items.split("\n").length + "개 상품", order.totalAmount == null ? "-" : `₩${order.totalAmount.toLocaleString()}`])
        : reviewDrafts.ok.slice(0, 5).map((review) => [products.find((p) => p.id === review.productId)?.translations.ko?.name ?? "", review.authorName ? review.authorName.slice(0, 1) + "**" : "-", "★".repeat(review.rating), review.content.slice(0, 40), review.createdAt ? new Date(review.createdAt).toLocaleDateString("ko-KR") : "-"]);
  const previewHead =
    kind === "products" ? ["상품 코드", "상품명", "판매가", "사이즈:재고", "카테고리"] : kind === "orders" ? ["주문번호", "이메일", "주문일", "상품", "결제 금액"] : ["상품", "작성자", "별점", "내용", "작성일"];

  return (
    <>
      <Top
        crumb="STORE / IMPORT"
        title="데이터 가져오기"
        actions={
          <Link className="btn" href="/admin/members/import">
            회원 가져오기
          </Link>
        }
      />
      <div className="notice">
        <span>ⓘ</span>
        <span>
          아임웹에서 내려받은 엑셀(.xlsx)이나 CSV를 올려 주세요. 나눠 받은 파일은 <b>여러 개를 한 번에</b> 고르면 합쳐져요. 파일은 이 브라우저 안에서만 읽어요. 같은 파일을
          다시 올려도 이미 들어간 것은 건너뛰어요. 순서는 <b>회원 → 상품 → 주문 · 후기</b>가 좋아요 (후기는 상품과, 주문은 회원 이메일과 이어져요).
        </span>
      </div>

      <div className="stack">
        <div className="card">
          <div className="card-h">
            <Chips
              value={kind}
              onChange={(value) => value && reset(value)}
              options={[
                { value: "products", label: "상품" },
                { value: "orders", label: "주문 내역" },
                { value: "reviews", label: "후기" },
              ]}
            />
            {fileLabel && sheet && (
              <span className="mono muted">
                {fileLabel} · {sheet.rows.length.toLocaleString()}줄
              </span>
            )}
          </div>
          <div className="card-b">
            <input type="file" accept=".xlsx,.csv,text/csv" multiple onChange={onFile} disabled={busy} />
          </div>
        </div>

        {sheet && (
          <div className="card">
            <div className="card-h">
              <h2>열 맞추기</h2>
              <span className="hint">머리글 이름으로 미리 골라 뒀어요. 다르면 바꿔 주세요</span>
            </div>
            <div className="card-b grid3">
              {FIELDS[kind].map((field) => (
                <label className="field" key={field.key}>
                  <span>
                    {field.label} {field.required && <b>*</b>}
                  </span>
                  <select className="select" value={mapping[field.key] ?? -1} onChange={(event) => setMapping({ ...mapping, [field.key]: Number(event.target.value) })}>
                    <option value={-1}>{field.required ? "선택" : "없음"}</option>
                    {sheet.headers.map((header, index) => (
                      <option key={index} value={index}>
                        {header || `${index + 1}번째 열`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {kind === "products" && (
              <div className="card-b grid3" style={{ borderTop: "1px solid var(--line, #eee)" }}>
                <label className="field">
                  <span>기본 카테고리</span>
                  <select className="select" value={categoryCode} onChange={(event) => setCategoryCode(event.target.value)}>
                    {categories.map((category) => (
                      <option key={category.code} value={category.code}>
                        {category.names.ko ?? category.code}
                      </option>
                    ))}
                  </select>
                  <small>카테고리 열이 비었거나 이름이 안 맞으면 여기로 들어가요.</small>
                </label>
                <label className="field">
                  <span>달러 환율 (원)</span>
                  <input className="input mono" inputMode="numeric" value={usdRate} onChange={(event) => setUsdRate(event.target.value)} />
                  <small>해외 화면 가격 = 판매가 ÷ 환율. 나중에 상품마다 고칠 수 있어요.</small>
                </label>
                <label className="toggle-row" style={{ alignSelf: "center" }}>
                  <span className="switch">
                    <input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} aria-label="숨김으로 가져오기" />
                    <i />
                  </span>
                  <span>{hidden ? "숨김으로 가져오기 (확인 뒤 공개)" : "바로 판매 중으로"}</span>
                </label>
              </div>
            )}
          </div>
        )}

        {sheet && (
          <div className="card">
            <div className="card-h">
              <h2>
                미리보기 · {TITLES[kind]} {count.toLocaleString()}건
              </h2>
              <button className="btn primary" type="button" onClick={start} disabled={busy || requiredMissing || count === 0}>
                {busy ? `가져오는 중… ${progress}` : `${count.toLocaleString()}건 가져오기`}
              </button>
            </div>
            {kind === "reviews" && reviewDrafts.missing.length > 0 && (
              <p className="alert" style={{ margin: "0 16px 12px" }}>
                상품을 못 찾은 후기는 빼고 가져와요: {reviewDrafts.missing.slice(0, 5).join(", ")}
                {reviewDrafts.missing.length > 5 && ` 외 ${reviewDrafts.missing.length - 5}개`} — 상품을 먼저 가져오거나 상품 열을 바꿔 보세요.
              </p>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {previewHead.map((head) => (
                      <th key={head}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, index) => (
                    <tr key={index}>
                      {row.map((value, column) => (
                        <td key={column} className={column === 0 ? "mono" : undefined}>
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && (
          <div className="card">
            <div className="card-h">
              <h2>결과</h2>
            </div>
            <div className="card-b">
              <dl className="kv">
                <dt>새로 가져옴</dt>
                <dd className="mono">{result.created.toLocaleString()}건</dd>
                <dt>이미 있어서 건너뜀</dt>
                <dd className="mono">{result.skipped.toLocaleString()}건</dd>
                <dt>실패</dt>
                <dd className="mono">{result.failures.length.toLocaleString()}건</dd>
              </dl>
            </div>
            {result.failures.length > 0 && (
              <ul className="rows">
                {result.failures.slice(0, 50).map((failure) => (
                  <li key={`${failure.index}-${failure.key}`}>
                    <span className="mono muted">{failure.index}번째</span>
                    <span>{failure.key}</span>
                    <span className="end warn">{failure.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}

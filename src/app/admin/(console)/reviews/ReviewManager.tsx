"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Chips, Drawer, Pager, Stars, Thumb, Top } from "../../_components/ui";
import { adminApi, dateTime, errorMessage, toast, type AdminReview, type Page, type ReviewStatus } from "../../_lib/admin";

export default function ReviewManager() {
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AdminReview> | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminReview | null>(null);
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const query = new URLSearchParams({ page: String(page), size: "20" });
    if (status) query.set("status", status);
    if (rating) query.set("rating", rating);
    adminApi<Page<AdminReview>>(`/reviews?${query}`)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, [page, status, rating]);
  useEffect(load, [load]);

  const show = (review: AdminReview) => {
    setSelected(review);
    setReply(review.reply ?? "");
    setOpen(true);
  };
  const close = useCallback(() => setOpen(false), []);

  const apply = (updated: AdminReview) => {
    setSelected(updated);
    setData((current) => current && { ...current, content: current.content.map((item) => (item.id === updated.id ? updated : item)) });
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (caught) {
      toast(errorMessage(caught), true);
    } finally {
      setBusy(false);
    }
  };

  const saveReply = () =>
    run(async () => {
      apply(await adminApi<AdminReview>(`/reviews/${selected!.id}/reply`, { method: "PUT", body: { reply } }));
      toast(reply.trim() ? "답글을 저장했어요." : "답글을 지웠어요.");
    });

  const toggleVisible = () =>
    run(async () => {
      const next: ReviewStatus = selected!.status === "VISIBLE" ? "HIDDEN" : "VISIBLE";
      apply(await adminApi<AdminReview>(`/reviews/${selected!.id}/status`, { method: "PATCH", body: { status: next } }));
      toast(next === "HIDDEN" ? "고객 화면에서 숨겼어요." : "다시 보이게 했어요.");
    });

  const remove = () =>
    run(async () => {
      if (!window.confirm("이 후기를 삭제할까요? 되돌릴 수 없어요. (가리기만 하려면 '숨기기'를 쓰세요)")) return;
      await adminApi(`/reviews/${selected!.id}`, { method: "DELETE" });
      toast("삭제했어요.");
      setOpen(false);
      load();
    });

  return (
    <>
      <Top crumb="STORE / REVIEWS" title="후기 관리" />
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
              { value: "VISIBLE", label: "노출 중" },
              { value: "HIDDEN", label: "숨김" },
            ]}
          />
          <select
            className="select spacer"
            value={rating}
            onChange={(event) => {
              setRating(event.target.value);
              setPage(0);
            }}
            aria-label="별점"
          >
            <option value="">별점 전체</option>
            {[5, 4, 3, 2, 1].map((score) => (
              <option key={score} value={score}>
                {"★".repeat(score)} ({score}점)
              </option>
            ))}
          </select>
        </div>
        {error && <p className="alert">{error}</p>}
        {!data ? (
          <div className="loading">불러오는 중…</div>
        ) : data.content.length === 0 ? (
          <div className="empty">후기가 없어요. 고객은 배송 완료된 주문의 상품에만 후기를 쓸 수 있어요.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>상품</th>
                  <th>별점</th>
                  <th>내용</th>
                  <th>작성자</th>
                  <th>상태</th>
                  <th>작성일</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((review) => (
                  <tr key={review.id} className="click" onClick={() => show(review)}>
                    <td>
                      <div className="cell-prod" style={{ minWidth: 180 }}>
                        <Thumb src={review.productImageUrl} />
                        <b>{review.productName ?? `#${review.productId}`}</b>
                      </div>
                    </td>
                    <td>
                      <Stars rating={review.rating} />
                    </td>
                    <td>
                      <span className="clip">{review.content}</span>
                      {review.reply && <span className="mono muted">↳ 답글 있음</span>}
                    </td>
                    <td className="mono muted">{review.memberEmail}</td>
                    <td>
                      <span className={`badge ${review.status === "VISIBLE" ? "green" : ""}`}>{review.status === "VISIBLE" ? "노출" : "숨김"}</span>
                    </td>
                    <td className="mono muted">{dateTime(review.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={data.page} totalPages={data.totalPages} total={data.totalElements} onPage={setPage} />}
      </div>

      <Drawer
        open={open}
        title="후기 상세"
        onClose={close}
        footer={
          selected && (
            <>
              <button className="btn danger left" type="button" onClick={remove} disabled={busy}>
                삭제
              </button>
              <button className="btn" type="button" onClick={toggleVisible} disabled={busy}>
                {selected.status === "VISIBLE" ? "숨기기" : "다시 보이기"}
              </button>
              <button className="btn primary" type="button" onClick={saveReply} disabled={busy}>
                답글 저장
              </button>
            </>
          )
        }
      >
        {selected && (
          <>
            <div className="cell-prod">
              <Thumb src={selected.productImageUrl} />
              <div>
                <b>{selected.productName}</b>
                <Link className="mono muted" href={`/admin/products/edit?id=${selected.productId}`}>
                  상품 편집 →
                </Link>
              </div>
            </div>
            <dl className="kv">
              <dt>별점</dt>
              <dd>
                <Stars rating={selected.rating} />
              </dd>
              <dt>작성자</dt>
              <dd className="mono">{selected.memberEmail}</dd>
              <dt>주문번호</dt>
              <dd>
                <Link className="mono" href={`/admin/orders?open=${selected.orderNumber}`}>
                  {selected.orderNumber}
                </Link>
              </dd>
              <dt>작성일</dt>
              <dd className="mono">{dateTime(selected.createdAt)}</dd>
              <dt>상태</dt>
              <dd>
                <span className={`badge ${selected.status === "VISIBLE" ? "green" : ""}`}>{selected.status === "VISIBLE" ? "고객 화면에 노출 중" : "숨김"}</span>
              </dd>
            </dl>
            <div>
              <div className="sec-title">후기</div>
              <div className="bubble">{selected.content}</div>
            </div>
            <label className="field">
              <span>SKALEZ 답글 {selected.repliedAt && <em className="mono">· {dateTime(selected.repliedAt)}</em>}</span>
              <textarea className="textarea" value={reply} maxLength={1000} onChange={(event) => setReply(event.target.value)} placeholder="고객 화면 후기 아래에 보여요. 비우고 저장하면 답글이 지워져요." />
            </label>
          </>
        )}
      </Drawer>
    </>
  );
}

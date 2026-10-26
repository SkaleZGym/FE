"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/** 화면 머리: 작은 경로 + 제목 + 오른쪽 버튼들 */
export function Top({ crumb, title, actions }: { crumb: string; title: string; actions?: ReactNode }) {
  return (
    <div className="top">
      <div>
        <div className="crumb">{crumb}</div>
        <h1>{title}</h1>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

/** 오른쪽에서 밀려 나오는 상세 패널 (주문·문의·후기·배너) */
export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div className="overlay" data-open={open || undefined} onClick={onClose} />
      <aside className="drawer" data-open={open || undefined} role="dialog" aria-modal="true" aria-label={title} inert={!open}>
        <div className="dh">
          <h2>{title}</h2>
          <button className="btn sm" type="button" onClick={onClose}>
            닫기 ✕
          </button>
        </div>
        <div className="db">{children}</div>
        {footer && <div className="df">{footer}</div>}
      </aside>
    </>
  );
}

/** 상태 칩 필터. value가 null이면 '전체' */
export function Chips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | null;
  options: { value: T | null; label: string }[];
  onChange: (value: T | null) => void;
}) {
  return (
    <div className="chips">
      {options.map((option) => (
        <button key={option.label} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (page: number) => void }) {
  return (
    <div className="pager">
      <span>
        총 {total.toLocaleString()}건 · {totalPages === 0 ? 0 : page + 1}/{totalPages} 페이지
      </span>
      <div>
        <button className="btn sm" type="button" disabled={page <= 0} onClick={() => onPage(page - 1)}>
          ← 이전
        </button>
        <button className="btn sm" type="button" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>
          다음 →
        </button>
      </div>
    </div>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-label={`별점 ${rating}점`}>
      {"★".repeat(rating)}
      <i>{"★".repeat(5 - rating)}</i>
    </span>
  );
}

export function Thumb({ src }: { src: string | null | undefined }) {
  return (
    <span className="thumb">
      {/* eslint-disable-next-line @next/next/no-img-element -- 관리자 목록의 작은 썸네일. 외부 주소 그대로 보여 준다 */}
      {src && <img src={src} alt="" loading="lazy" />}
    </span>
  );
}

/** 주소의 ?쿼리 값 하나. 관리자 틀(layout)이 Suspense로 감싸서 미리 그릴 때도 안전하다 */
export function useQueryParam(name: string) {
  return useSearchParams().get(name);
}

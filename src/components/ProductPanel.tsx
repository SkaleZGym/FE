"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Badge } from "@/data/catalog";
import { PRODUCT_EVENT } from "./productEvents";
import styles from "./ProductPanel.module.css";

/** 서버에서 언어·통화에 맞게 가공해서 넘기는 패널용 상품 정보 */
export type PanelProduct = {
  id: number;
  image: string;
  name: string;
  badges: Badge[];
  price: string;
  listPrice?: string;
  soldOut: boolean;
  desc?: string;
  sizes: string[];
  fit: string;
  fabric: string;
};

export type PanelLabels = {
  title: string;
  close: string;
  dialog: string;
  size: string;
  qty: string;
  decrease: string;
  increase: string;
  add: string;
  restock: string;
  soldOutNote: string;
  soon: string;
  fit: string;
  fabric: string;
  model: string;
  shipping: string;
  modelValue: string;
  shippingValue: string;
};

type Props = { products: PanelProduct[]; labels: PanelLabels };

/**
 * 19번 시안의 상품 정보 패널. PC는 오른쪽에서 밀려 나오고, 모바일은 아래에서 올라오는 시트.
 * openProduct(id)가 보내는 신호를 받아 열리고, 바깥·닫기·Esc로 닫힌다. 장바구니 연결은 BE 연동 때 붙인다.
 */
export default function ProductPanel({ products, labels }: Props) {
  const [id, setId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  // 닫히는 애니메이션 동안에도 내용이 남아 있도록 마지막 상품은 지우지 않는다
  const product = products.find((item) => item.id === id) ?? null;

  useEffect(() => {
    const onOpen = (event: Event) => {
      const next = products.find((item) => item.id === (event as CustomEvent<number>).detail);
      if (!next) return;
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setId(next.id);
      setSize(next.sizes[Math.min(1, next.sizes.length - 1)] ?? null); // 기본은 두 번째 사이즈 (보통 L)
      setQty(1);
      setNote(false);
      setOpen(true);
    };
    window.addEventListener(PRODUCT_EVENT, onOpen);
    return () => window.removeEventListener(PRODUCT_EVENT, onOpen);
  }, [products]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.scrollTo({ top: 0 });
    closeRef.current?.focus({ preventScroll: true });
    const returnTo = opener.current;
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      returnTo?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      <div className={styles.overlay} data-open={open || undefined} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside
        ref={panelRef}
        className={styles.panel}
        data-open={open || undefined}
        role="dialog"
        aria-modal="true"
        aria-label={labels.dialog}
        inert={!open}
      >
        <div className={styles.head}>
          <span>{labels.title}</span>
          <button ref={closeRef} type="button" className={styles.close} onClick={() => setOpen(false)}>
            {labels.close} ✕
          </button>
        </div>
        {product && (
          <>
            <div className={styles.image}>
              <Image src={product.image} alt={product.name} fill sizes="(max-width: 720px) 100vw, 480px" />
            </div>
            <div className={styles.body}>
              {product.badges.length > 0 && (
                <div className={styles.badges}>
                  {product.badges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
              )}
              <h2 className={styles.name}>{product.name}</h2>
              <div className={styles.price}>
                {product.price}
                {product.listPrice && <s>{product.listPrice}</s>}
              </div>
              {product.soldOut && <span className={styles.soldOut}>{labels.soldOutNote}</span>}
              {product.desc && <p className={styles.desc}>{product.desc}</p>}

              <div className={styles.label} id="panel-size">
                {labels.size}
              </div>
              <div className={styles.sizes} role="group" aria-labelledby="panel-size">
                {product.sizes.map((item) => (
                  <button key={item} type="button" aria-pressed={item === size} onClick={() => setSize(item)}>
                    {item}
                  </button>
                ))}
              </div>

              <div className={styles.label}>{labels.qty}</div>
              <div className={styles.qty}>
                <button type="button" aria-label={labels.decrease} onClick={() => setQty((value) => Math.max(1, value - 1))}>
                  −
                </button>
                <output aria-live="polite">{qty}</output>
                <button type="button" aria-label={labels.increase} onClick={() => setQty((value) => Math.min(99, value + 1))}>
                  +
                </button>
              </div>

              <button type="button" className={styles.add} onClick={() => setNote(true)}>
                <span>{product.soldOut ? labels.restock : labels.add}</span>
                <span aria-hidden="true">→</span>
              </button>
              {note && (
                <p className={styles.note} role="status">
                  {labels.soon}
                </p>
              )}

              <dl className={styles.specs}>
                <div>
                  <dt>{labels.fit}</dt>
                  <dd>{product.fit}</dd>
                </div>
                <div>
                  <dt>{labels.fabric}</dt>
                  <dd>{product.fabric}</dd>
                </div>
                <div>
                  <dt>{labels.model}</dt>
                  <dd>{labels.modelValue}</dd>
                </div>
                <div>
                  <dt>{labels.shipping}</dt>
                  <dd>{labels.shippingValue}</dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

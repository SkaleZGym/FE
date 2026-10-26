"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { api, money, type BeProduct } from "@/lib/client";
import styles from "./account.module.css";
import { refreshWishes } from "./accountStore";
import { errorText, useMember } from "./useMember";

type Props = { locale: Locale; labels: Dictionary["wishlist"]; common: Dictionary["common"]; soldOut: string };

export default function WishlistView({ locale, labels, common, soldOut }: Props) {
  const account = useMember(locale);
  const [items, setItems] = useState<BeProduct[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (account.status !== "member") return;
    api<BeProduct[]>("/wishes", { locale })
      .then(setItems)
      .catch((caught) => setError(errorText(caught, common)));
  }, [account.status, locale, common]);

  const remove = async (productId: number) => {
    try {
      await api(`/wishes/${productId}`, { method: "DELETE", locale });
      setItems((current) => current?.filter((item) => item.id !== productId) ?? null);
      await refreshWishes(locale);
    } catch (caught) {
      setError(errorText(caught, common));
    }
  };

  if (!items) return error ? <p className={styles.error}>{error}</p> : <p className={styles.muted}>{common.loading}</p>;

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        {labels.empty}
        <a className={styles.button} data-variant="ghost" href={`/${locale}/shop/all`}>
          {labels.shop} →
        </a>
      </div>
    );
  }

  return (
    <>
      {error && <p className={styles.error}>{error}</p>}
      <ul className={styles.grid} style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((item) => (
          <li className={styles.card} key={item.id}>
            <div className={styles.thumb}>{item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="(max-width: 560px) 50vw, 240px" />}</div>
            <b>{item.name}</b>
            <div className={styles.cardFoot}>
              <span>{item.soldOut ? soldOut : money(item.price, item.currency, locale)}</span>
              <button type="button" className={styles.textButton} onClick={() => remove(item.id)}>
                {labels.remove}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

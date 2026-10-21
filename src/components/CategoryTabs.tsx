"use client";

import { useState } from "react";
import ProductCard, { type CardData } from "./ProductCard";
import styles from "./CategoryTabs.module.css";

type Tab = { key: string; label: string; products: CardData[] };

type Props = { tabs: Tab[]; emptyLabel: string };

export default function CategoryTabs({ tabs, emptyLabel }: Props) {
  const [active, setActive] = useState(tabs[0].key);
  const current = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <div>
      <div role="tablist" className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.key === active}
            className={styles.tab}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
            <sup>{tab.products.length}</sup>
          </button>
        ))}
      </div>

      {/* key를 바꿔서 탭을 바꿀 때마다 등장 애니메이션을 다시 재생 */}
      <div role="tabpanel" key={current.key} className={styles.panel}>
        {current.products.length === 0 ? (
          <p className={styles.empty}>{emptyLabel}</p>
        ) : (
          <ul className={styles.grid}>
            {current.products.map((product, index) => (
              <li key={product.id} style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import Image from "next/image";
import type { Badge } from "@/data/catalog";
import styles from "./ProductCard.module.css";

/** 서버에서 언어·통화에 맞게 가공해서 넘기는 카드 데이터 */
export type CardData = {
  id: number;
  image: string;
  name: string;
  price: string;
  listPrice?: string;
  badges: Badge[];
  soldOut: boolean;
  soldOutLabel: string;
};

type Props = {
  product: CardData;
  /** BEST 순위 등 카드 위에 크게 붙는 번호 */
  rank?: number;
  sizes?: string;
  /** tile: 밝은 박스 안에 사진과 글자를 넣는 형태 (BESTSELLER·TIGHTS 그리드용) */
  variant?: "default" | "tile";
};

export default function ProductCard({ product, rank, sizes = "(max-width: 720px) 50vw, 25vw", variant = "default" }: Props) {
  const className = variant === "tile" ? `${styles.card} ${styles.tile}` : styles.card;
  return (
    <a href="#" className={className} data-soldout={product.soldOut || undefined}>
      <div className={styles.image}>
        <Image src={product.image} alt={product.name} fill sizes={sizes} />
        {rank !== undefined && <span className={styles.rank}>{String(rank).padStart(2, "0")}</span>}
        {product.soldOut && <span className={styles.soldOut}>{product.soldOutLabel}</span>}
      </div>
      <div className={styles.body}>
        <span className={styles.name}>{product.name}</span>
        {product.badges.length > 0 && (
          <span className={styles.badges}>
            {product.badges.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </span>
        )}
        <span className={styles.price}>
          {product.price}
          {product.listPrice && <s>{product.listPrice}</s>}
        </span>
      </div>
    </a>
  );
}

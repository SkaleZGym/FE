import Image from "next/image";
import CategoryTabs from "@/components/CategoryTabs";
import ProductCard, { type CardData } from "@/components/ProductCard";
import QuickMenu from "@/components/QuickMenu";
import Reveal from "@/components/Reveal";
import SiteHeader from "@/components/SiteHeader";
import {
  bestIds,
  business,
  collabs,
  currencyFor,
  formatMoney,
  heroTightsIds,
  images,
  productById,
  products,
  type CategoryKey,
  type Product,
} from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import { getDictionary, getLocale, type Dictionary } from "@/i18n/dictionaries";
import styles from "./page.module.css";

/** 상품 데이터를 현재 언어·통화로 바꿔 카드에 넘긴다 */
function toCard(product: Product, locale: Locale, dict: Dictionary): CardData {
  const currency = currencyFor(locale);
  return {
    id: product.id,
    image: product.image,
    name: product.name[locale],
    price: formatMoney(product.price[currency], currency, locale),
    listPrice: product.listPrice && formatMoney(product.listPrice[currency], currency, locale),
    badges: product.badges,
    soldOut: Boolean(product.soldOut),
    soldOutLabel: dict.product.soldOut,
  };
}

/** 섹션 사이를 흐르는 얇은 글자 띠: "/ BESTSELLER / BESTSELLER / ..." */
function Ticker({ words, reverse = false }: { words: string[]; reverse?: boolean }) {
  const items = Array.from({ length: 8 }, () => words).flat();
  return (
    <div className={styles.ticker} aria-hidden="true">
      <div className={styles.tickerTrack} data-reverse={reverse || undefined}>
        {[...items, ...items].map((word, index) => (
          <span key={index}>/ {word}</span>
        ))}
      </div>
    </div>
  );
}

/** 왼쪽(또는 오른쪽)에 세로로 큰 라벨이 붙은 7칸 상품 그리드 + 전체 보기 칸 */
function LabeledGrid({
  label,
  cards,
  side = "left",
  viewAll,
  viewAllHref,
}: {
  label: string;
  cards: CardData[];
  side?: "left" | "right";
  viewAll: string;
  viewAllHref: string;
}) {
  return (
    <div className={styles.labeled} data-side={side}>
      <Reveal className={styles.verticalLabel}>
        <span>{label}</span>
      </Reveal>
      {cards.slice(0, 7).map((card, index) => (
        <Reveal key={card.id} delay={(index % 4) * 80} className={styles.cell}>
          <ProductCard product={card} variant="tile" sizes="(max-width: 720px) 50vw, 20vw" />
        </Reveal>
      ))}
      <Reveal delay={240} className={styles.cell}>
        <a href={viewAllHref} className={styles.viewAllTile}>
          <span>{viewAll} →</span>
        </a>
      </Reveal>
    </div>
  );
}

const categoryKeys: CategoryKey[] = ["top", "tights", "women", "goods"];

export default async function HomePage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const currency = currencyFor(locale);

  const heroMain = productById(heroTightsIds.main);
  const [thumbA, thumbB] = heroTightsIds.thumbs.map(productById);
  const drop = productById(292);
  const best = bestIds.map((id) => toCard(productById(id), locale, dict));
  const tights = products
    .filter((product) => product.category === "tights")
    .sort((a, b) => Number(Boolean(a.soldOut)) - Number(Boolean(b.soldOut))) // 품절은 뒤로
    .map((product) => toCard(product, locale, dict));
  const categoryTabs = categoryKeys.map((key) => ({
    key,
    label: dict.category.tabs[key],
    products: products.filter((product) => product.category === key).map((product) => toCard(product, locale, dict)),
  }));
  const pastCollabs = collabs.filter((name) => name !== "KAIDO");

  const nav = [
    { label: dict.nav.best, href: "#best" },
    { label: dict.nav.tights, href: "#tights" },
    { label: dict.nav.collab, href: "#collab" },
    { label: dict.nav.category, href: "#category" },
    { label: dict.nav.support, href: "#support" },
  ];

  return (
    <>
      <div className={styles.progress} aria-hidden="true" />

      <SiteHeader
        locale={locale}
        logo={images.wordmark}
        nav={nav}
        labels={{ cart: dict.nav.cart, language: dict.nav.language, menu: dict.nav.menu, close: dict.nav.close }}
      />

      <main>
        {/* 1. 배너: 주력 상품인 컴프레션 타이즈 */}
        <section className={styles.hero}>
          <div className={styles.heroMeta}>
            <span>[ SKALEZ / CORE LINE ]</span>
            <span className={styles.heroMetaRight}>[ LEG DAY · SET 01 ]</span>
          </div>

          <div className={styles.heroStage}>
            <h1 className={styles.heroWord}>COMPRESSION</h1>
            <div className={styles.heroImage}>
              <Image src={heroMain.image} alt={heroMain.name[locale]} fill sizes="(max-width: 820px) 80vw, 34vw" priority />
            </div>
            <div className={`${styles.heroThumb} ${styles.thumbA}`}>
              <Image src={thumbA.image} alt={thumbA.name[locale]} fill sizes="170px" />
            </div>
            <div className={`${styles.heroThumb} ${styles.thumbB}`}>
              <Image src={thumbB.image} alt={thumbB.name[locale]} fill sizes="170px" />
            </div>
          </div>

          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>{dict.hero.eyebrow}</span>
            <p>{dict.hero.note}</p>
          </div>
          <a href="#tights" className={styles.shopBar}>
            <span>{dict.hero.shop}</span>
            <span className={styles.shopArrow} aria-hidden="true">
              →
            </span>
          </a>
        </section>

        <Ticker words={["COMPRESSION TIGHTS", "KAIDO × SKALEZ", "FORGED, NOT BORN"]} />

        {/* 2. 콜라보 하나 (지금은 KAIDO) */}
        <section className={styles.collabFeature} id="collab">
          <div className={styles.collabBg} aria-hidden="true">
            <Image src={images.kaidoPoster} alt="" fill sizes="100vw" />
          </div>

          <div className={styles.collabTop}>
            <Reveal className={styles.collabStory}>
              <span className={styles.collabLabel}>[ COLLAB 01 ] {dict.collab.label}</span>
              <p>{dict.collab.story}</p>
            </Reveal>
            <span className={styles.collabMeta}>
              [ DROP 09.28.2026 ]
              <br />
              [ DRAGON SCALES ]
            </span>
          </div>

          <Reveal className={styles.collabWord}>
            <h2>
              KAIDO <span>×</span> SKALEZ
            </h2>
          </Reveal>

          <div className={styles.collabBottom}>
            <Reveal className={styles.pastCollabs}>
              <span className={styles.collabLabel}>{dict.collab.past}</span>
              <p>{pastCollabs.join(" / ")}</p>
            </Reveal>
            <Reveal className={styles.collabCta} delay={150}>
              <div className={styles.dropCard}>
                <div className={styles.dropImage}>
                  <Image src={drop.image} alt={drop.name[locale]} fill sizes="120px" />
                </div>
                <div className={styles.dropText}>
                  <span>{drop.name[locale]}</span>
                  <span className={styles.dropPrice}>
                    {formatMoney(drop.price[currency], currency, locale)}
                    {drop.listPrice && <s>{formatMoney(drop.listPrice[currency], currency, locale)}</s>}
                  </span>
                </div>
              </div>
              <a href="#best" className={styles.dropButton}>
                {dict.collab.shop} →
              </a>
            </Reveal>
          </div>
        </section>

        <Ticker words={["BESTSELLER"]} reverse />

        {/* 3. 베스트셀러 */}
        <section className={`${styles.gridSection} ${styles.dark}`} id="best">
          <LabeledGrid label="BESTSELLER" cards={best} viewAll={dict.best.viewAll} viewAllHref="#category" />
        </section>

        <Ticker words={["COMPRESSION TIGHTS"]} />

        {/* 4. 주력: 타이즈 */}
        <section className={`${styles.gridSection} ${styles.light}`} id="tights">
          <Reveal className={styles.gridIntro}>
            <h2 className={styles.sectionTitle}>THE CORE LINE</h2>
            <p className={styles.sectionNote}>{dict.tights.note}</p>
          </Reveal>
          <LabeledGrid label="TIGHTS" cards={tights} side="right" viewAll={dict.tights.viewAll} viewAllHref="#category" />
        </section>

        {/* 5. 카테고리별 상품 */}
        <section className={`${styles.section} ${styles.dark}`} id="category">
          <Reveal className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>SHOP BY CATEGORY</h2>
            <p className={styles.sectionNote}>{dict.category.note}</p>
          </Reveal>
          <Reveal>
            <CategoryTabs tabs={categoryTabs} emptyLabel={dict.category.empty} />
          </Reveal>
        </section>

        {/* 6. 공지 · FAQ */}
        <section className={`${styles.section} ${styles.light}`} id="support">
          <div className={styles.support}>
            <Reveal className={styles.notice}>
              <div className={styles.supportHead}>
                <h2 className={styles.sectionTitle}>NOTICE</h2>
                <span className={styles.supportSub}>{dict.notice.title}</span>
              </div>
              <ul className={styles.noticeList}>
                {dict.notice.items.map((item) => (
                  <li key={item.title}>
                    <a href="#">
                      <span className={styles.noticeTag}>[{item.tag}]</span>
                      <span className={styles.noticeTitle}>{item.title}</span>
                      <span className={styles.noticeDate}>{item.date}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <a href="#" className={styles.viewAll}>
                {dict.notice.more} →
              </a>
            </Reveal>

            <Reveal className={styles.faq} delay={120}>
              <div className={styles.supportHead}>
                <h2 className={styles.sectionTitle}>FAQ</h2>
                <span className={styles.supportSub}>{dict.faq.title}</span>
              </div>
              <div className={styles.faqList}>
                {dict.faq.items.map((item, index) => (
                  <details key={item.q} name="faq" open={index === 0}>
                    <summary>
                      <span className={styles.faqIndex}>Q{index + 1}</span>
                      {item.q}
                    </summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* 7. 푸터 */}
      <footer className={styles.footer}>
        <Reveal className={styles.footerWordmark}>
          <Image src={images.wordmark} alt="SKALEZ" width={1200} height={236} sizes="100vw" />
        </Reveal>
        <div className={styles.footerGrid}>
          <dl className={styles.business}>
            <div>
              <dt>{dict.footer.company}</dt>
              <dd>{business.company}</dd>
            </div>
            <div>
              <dt>{dict.footer.ceo}</dt>
              <dd>{business.ceo}</dd>
            </div>
            <div>
              <dt>{dict.footer.businessNumber}</dt>
              <dd>{business.businessNumber}</dd>
            </div>
            <div>
              <dt>{dict.footer.mailOrder}</dt>
              <dd>{business.mailOrder}</dd>
            </div>
            <div>
              <dt>{dict.footer.address}</dt>
              <dd>{business.address}</dd>
            </div>
            <div>
              <dt>{dict.footer.contact}</dt>
              <dd>{business.contact}</dd>
            </div>
            <div>
              <dt>{dict.footer.email}</dt>
              <dd>{business.email}</dd>
            </div>
          </dl>
          <div className={styles.footerLinks}>
            <a href="#">{dict.footer.terms}</a>
            <a href="#">{dict.footer.privacy}</a>
            <span>© 2026 SKALEZ</span>
          </div>
        </div>
      </footer>

      <QuickMenu labels={dict.quick} />
    </>
  );
}

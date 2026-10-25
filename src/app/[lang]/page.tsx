import Image from "next/image";
import HeroShowcase, { type ShowcaseItem } from "@/components/HeroShowcase";
import ProductCard, { type CardData } from "@/components/ProductCard";
import QuickMenu from "@/components/QuickMenu";
import Reveal from "@/components/Reveal";
import SerpentIntro from "@/components/SerpentIntro";
import SiteHeader from "@/components/SiteHeader";
import {
  business,
  currencyFor,
  fitOf,
  formatMoney,
  heroShowcase,
  images,
  picks,
  productById,
  shopByTiles,
  sizesOf,
  trendImageId,
  type Product,
} from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import styles from "./page.module.css";

/** 현재 언어의 통화로 가격 문자열을 만든다 */
function priceOf(product: Product, locale: Locale) {
  const currency = currencyFor(locale);
  return {
    price: formatMoney(product.price[currency], currency, locale),
    listPrice: product.listPrice && formatMoney(product.listPrice[currency], currency, locale),
  };
}

/** 테이프 티커: 같은 문장을 두 벌 이어 붙여 절반 지점에서 되감겨도 끊김이 없다 */
function Tape({ text, repeat }: { text: string; repeat: number }) {
  return (
    <p>
      {Array.from({ length: repeat * 2 }, (_, index) => (
        <span key={index}>{text}</span>
      ))}
    </p>
  );
}

/** 신뢰 바 아이콘 (방패 · 트럭 · 상자 · 헤드셋). 사전의 trust.items 순서와 같다 */
const trustIcons = [
  <g key="official"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></g>,
  <g key="ship"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></g>,
  <g key="exchange"><path d="M4 8l8-4 8 4v8l-8 4-8-4V8Z" /><path d="M4 8l8 4 8-4M12 12v8" /></g>,
  <g key="here"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /></g>,
];

export default async function HomePage() {
  const locale = await getLocale();
  const dict = await getDictionary();

  const showcase: ShowcaseItem[] = heroShowcase.map(({ id, line }) => {
    const product = productById(id);
    return { id, image: product.image, name: product.name[locale], line, ...priceOf(product, locale) };
  });
  const cards: CardData[] = picks.map(({ id, badge }) => {
    const product = productById(id);
    const kind = product.category === "tights" ? dict.featured.sub.compression : dict.featured.sub.gymwear;
    return {
      id,
      image: product.image,
      name: product.name[locale],
      sub: `${dict.fit[fitOf(product)]} · ${kind}`,
      ...priceOf(product, locale),
      sizes: sizesOf(product),
      soldOut: Boolean(product.soldOut),
      badge: { label: dict.featured.badges[badge], tone: badge === "new" ? ("red" as const) : undefined },
    };
  });
  const cardLabels = { add: dict.featured.add, restock: dict.featured.restock, wish: dict.featured.wish };
  const tiles = (["tights", "tops", "hoodies"] as const).map((key) => ({
    key,
    image: productById(shopByTiles[key]).image,
    ...dict.shopBy[key],
  }));
  const trend = productById(trendImageId);

  const nav = [
    { label: dict.nav.shop, href: "#featured" },
    { label: dict.nav.tights, href: "#shopby" },
    { label: dict.nav.collab, href: "#trend" },
    { label: dict.nav.support, href: "#trust" },
  ];

  return (
    <>
      <SiteHeader
        locale={locale}
        introDim
        logo={images.wordmark}
        nav={nav}
        labels={{ cart: dict.nav.cart, language: dict.nav.language, menu: dict.nav.menu, close: dict.nav.close }}
      />

      <main>
        {/* 0. 서펜트 비늘 인트로가 1번 히어로를 감싼다. 비늘이 걷히고 로고가 헤더로 날아가면 히어로가 나타난다 */}
        <SerpentIntro logo={images.wordmark} labels={dict.intro}>
          <section className={styles.hero} id="hero">
            <div className={styles.heroLeft}>
              <span className={styles.kicker}>{dict.hero.kicker}</span>
              <h1 className={styles.heroTitle}>
                Forged,
                <br />
                not <em>born.</em>
              </h1>
              <p className={styles.heroLead}>{dict.hero.lead}</p>
              <div className={styles.ctas}>
                <a className={`${styles.btn} ${styles.btnWhite}`} href="#featured">
                  {dict.hero.shop} <span>→</span>
                </a>
                <a className={`${styles.btn} ${styles.btnGhost}`} href="#shopby">
                  {dict.hero.tights} <span>→</span>
                </a>
              </div>
              <div className={styles.globe} role="img" aria-label={dict.hero.globe}>
                <svg className={styles.ring} viewBox="0 0 92 92" aria-hidden="true">
                  <defs>
                    <path id="globe-circle" d="M46,46 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
                  </defs>
                  <text>
                    <textPath href="#globe-circle">WORLDWIDE SHIPPING · 2027 · </textPath>
                  </text>
                </svg>
                <span className={styles.globeIcon}>🌐</span>
              </div>
            </div>
            <div className={styles.heroRight}>
              <div className={styles.graffiti} aria-hidden="true">
                FORGE
                <br />
                YOUR
                <br />
                SCALES
              </div>
              <div className={styles.shadow} aria-hidden="true" />
              <HeroShowcase items={showcase} labels={{ prev: dict.hero.prev, next: dict.hero.next }} />
              <div className={styles.sticker} aria-hidden="true">
                <div className={styles.face}>
                  KAIDO
                  <br />
                  ×
                  <br />
                  SKZ
                </div>
                <div className={styles.tag}>
                  <b>LIMITED</b>
                  <b>FORGE IT.</b>
                </div>
              </div>
            </div>
          </section>
        </SerpentIntro>

        {/* 2. 테이프 티커 */}
        <div className={styles.tape} aria-hidden="true">
          <div className={`${styles.tapeLine} ${styles.t1}`}>
            <Tape text={dict.tape.line1} repeat={6} />
          </div>
          <div className={`${styles.tapeLine} ${styles.t2}`}>
            <Tape text={dict.tape.line2} repeat={8} />
          </div>
        </div>

        {/* 3. 추천 상품 (밝은 섹션) */}
        <section className={styles.featured} id="featured">
          <div className={styles.secHead}>
            <div>
              <span className={styles.kicker}>{dict.featured.kicker}</span>
              <h2>{dict.featured.title}</h2>
            </div>
            <a className={styles.btn} href="#">
              {dict.featured.viewAll} <span>→</span>
            </a>
          </div>
          <div className={styles.cards}>
            {cards.map((card, index) => (
              <Reveal key={card.id} delay={index * 90}>
                <ProductCard product={card} labels={cardLabels} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* 4. 카테고리 타일 */}
        <section className={styles.shopBy} id="shopby">
          {tiles.map((tile, index) => (
            <Reveal key={tile.key} delay={index * 100}>
              <a className={styles.tile} href="#">
                <div className={styles.tileImage}>
                  <Image src={tile.image} alt="" fill sizes="(max-width: 860px) 100vw, 40vw" />
                </div>
                <div className={styles.tileText}>
                  <div>
                    <small>{tile.small}</small>
                    <b>{tile.title}</b>
                  </div>
                  <span className={styles.go}>→</span>
                </div>
              </a>
            </Reveal>
          ))}
        </section>

        {/* 5. 트렌드 배너 */}
        <section className={styles.trend} id="trend">
          <div className={styles.trendBg} aria-hidden="true">
            <Image src={trend.image} alt="" fill sizes="100vw" />
          </div>
          <Reveal>
            <h2 className={styles.trendTitle}>
              Don&apos;t follow
              <br />
              the trend.
              <br />
              <em>Forge it.</em>
            </h2>
            <a className={`${styles.btn} ${styles.btnWhite} ${styles.trendCta}`} href="#featured">
              {dict.trend.cta} <span>→</span>
            </a>
          </Reveal>
          <div className={styles.scrawl} aria-hidden="true">
            LEG
            <br />
            DAY.
          </div>
        </section>

        {/* 6. 신뢰 바 */}
        <section className={styles.trust} id="trust">
          {dict.trust.items.map((item, index) => (
            <div className={styles.trustItem} key={item.accent}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {trustIcons[index]}
              </svg>
              <p>
                <b>
                  {item.title} <em>{item.accent}</em>
                </b>
                <span>{item.desc}</span>
              </p>
            </div>
          ))}
        </section>
      </main>

      {/* 7. 푸터 */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <Image src={images.wordmark} alt="SKALEZ" width={110} height={22} style={{ height: "auto" }} />
          <span>{dict.footer.tagline} · © 2026 SKALEZ</span>
        </div>
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
        </div>
      </footer>

      <QuickMenu labels={dict.quick} introDim />
    </>
  );
}

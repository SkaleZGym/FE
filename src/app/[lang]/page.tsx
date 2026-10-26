import Image from "next/image";
import HeroShowcase, { type ShowcaseItem } from "@/components/HeroShowcase";
import ProductPanel, { type PanelProduct } from "@/components/ProductPanel";
import ProductShelf, { type ShelfItem } from "@/components/ProductShelf";
import QuickMenu from "@/components/QuickMenu";
import Reveal from "@/components/Reveal";
import SerpentIntro from "@/components/SerpentIntro";
import SiteHeader from "@/components/SiteHeader";
import {
  business,
  currencyFor,
  descriptions,
  fabricOf,
  fitOf,
  formatMoney,
  heroShowcase,
  images,
  productById,
  shelves,
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
  // 13번 시안의 세로 제목 상품 섹션 3개 (BESTSELLER · TIGHTS · TOPS)
  const shelfItems = (ids: readonly number[]): ShelfItem[] =>
    ids.map((id) => {
      const product = productById(id);
      return {
        id,
        image: product.image,
        name: product.name[locale],
        badges: product.badges,
        ...priceOf(product, locale),
        soldOut: Boolean(product.soldOut),
      };
    });
  const shelfLabels = {
    viewAll: dict.shelves.viewAll,
    more: dict.shelves.more,
    quickAdd: dict.shelves.quickAdd,
    restock: dict.shelves.restock,
    soldOut: dict.shelves.soldOut,
    sale: dict.shelves.sale,
  };
  const trend = productById(trendImageId);
  // 상품 정보 패널에서 열 수 있는 상품: 히어로 로테이션 + 세 섹션의 상품
  const panelIds = [...heroShowcase.map((item) => item.id), ...shelves.best, ...shelves.tights, ...shelves.tops];
  const panelProducts: PanelProduct[] = [...new Set(panelIds)].map((id) => {
    const product = productById(id);
    return {
      id,
      image: product.image,
      name: product.name[locale],
      badges: product.badges,
      ...priceOf(product, locale),
      soldOut: Boolean(product.soldOut),
      desc: descriptions[id]?.[locale],
      sizes: sizesOf(product),
      fit: dict.fit[fitOf(product)],
      fabric: dict.fabric[fabricOf(product)],
    };
  });

  // 19번 시안의 메뉴 5개. COLLAB은 인트로가 끝난 히어로 자리(#drop), ABOUT은 아직 소개 페이지가 없어 신뢰 바로
  const nav = [
    { label: dict.nav.shop, href: "#best" },
    { label: dict.nav.newDrops, href: "#tops" },
    { label: dict.nav.tights, href: "#tights" },
    { label: dict.nav.collab, href: "#drop" },
    { label: dict.nav.about, href: "#trust" },
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
                <a className={`${styles.btn} ${styles.btnWhite}`} href="#best">
                  {dict.hero.shop} <span>→</span>
                </a>
                <a className={`${styles.btn} ${styles.btnGhost}`} href="#tights">
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
            <Tape text={dict.tape.line1} repeat={3} />
          </div>
          <div className={`${styles.tapeLine} ${styles.t2}`}>
            <Tape text={dict.tape.line2} repeat={5} />
          </div>
        </div>

        {/* 3·4. 세로 제목 상품 섹션 (13번 시안): BESTSELLER(제목 왼쪽) → TIGHTS(제목 오른쪽) */}
        <ProductShelf id="best" title={dict.shelves.best.title} kicker={dict.shelves.best.kicker} ranked items={shelfItems(shelves.best)} moreHref="#" labels={shelfLabels} />
        <ProductShelf id="tights" title={dict.shelves.tights.title} kicker={dict.shelves.tights.kicker} flip items={shelfItems(shelves.tights)} moreHref="#" labels={shelfLabels} />

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
            <a className={`${styles.btn} ${styles.btnWhite} ${styles.trendCta}`} href="#best">
              {dict.trend.cta} <span>→</span>
            </a>
          </Reveal>
          <div className={styles.scrawl} aria-hidden="true">
            LEG
            <br />
            DAY.
          </div>
        </section>

        {/* 5-1. TOPS (제목 왼쪽) */}
        <ProductShelf id="tops" title={dict.shelves.tops.title} kicker={dict.shelves.tops.kicker} items={shelfItems(shelves.tops)} moreHref="#" labels={shelfLabels} />

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
      <ProductPanel products={panelProducts} labels={dict.panel} />
    </>
  );
}

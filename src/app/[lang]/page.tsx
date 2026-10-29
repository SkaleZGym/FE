import Image from "next/image";
import HeroShowcase, { type ShowcaseItem } from "@/components/HeroShowcase";
import NoticeBoard from "@/components/NoticeBoard";
import ProductPanel, { type PanelProduct } from "@/components/ProductPanel";
import ProductShelf, { type ShelfItem } from "@/components/ProductShelf";
import QuickMenu from "@/components/QuickMenu";
import Reveal from "@/components/Reveal";
import SerpentIntro from "@/components/SerpentIntro";
import ShippingInfo from "@/components/ShippingInfo";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { headerLabels, siteNav } from "@/components/siteNav";
import { bestsellerIds, heroShowcase, images, productById, shopByTiles, trendImageId } from "@/data/catalog";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getBanners } from "@/lib/api";
import { localHref } from "@/lib/links";
import { bySku, getShopProducts, priceText, productsOfPage, type ShopProduct } from "@/lib/shop";
import styles from "./page.module.css";

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

  const products = await getShopProducts(locale);

  // 히어로 상품 슬라이드: 관리자 '메인 히어로' 배너가 켜져 있으면 그 순서대로, 없으면 기본 상품
  const heroBanners = (await getBanners(locale, "MAIN_HERO")) ?? [];
  const heroProducts = heroShowcase
    .map(({ id, line }) => ({ product: bySku(products, id), line }))
    .filter((item): item is { product: ShopProduct; line: string } => Boolean(item.product));
  const showcase: ShowcaseItem[] =
    heroBanners.length > 0
      ? heroBanners.map((banner) => ({
          id: -banner.id, // 상품 번호와 겹치지 않게
          image: banner.imageUrl,
          name: banner.headline ?? "",
          line: banner.subtext ?? "",
          price: banner.price ?? "",
          href: banner.linkUrl ? localHref(banner.linkUrl, locale, `/${locale}`) : undefined,
          remote: true,
        }))
      : heroProducts.map(({ product, line }) => ({ id: product.id, image: product.image, name: product.name, line, ...priceText(product, locale) }));

  // 13번 시안의 세로 제목 BESTSELLER: 정해 둔 순서의 상품 먼저, 나머지 BEST 상품을 뒤에 (최대 7개)
  const picked = bestsellerIds.map((id) => bySku(products, id)).filter((product): product is ShopProduct => Boolean(product));
  const bestProducts = [...picked, ...productsOfPage(products, "best").filter((product) => !picked.includes(product))].slice(0, 7);
  const bestItems: ShelfItem[] = bestProducts.map((product) => ({
    id: product.id,
    image: product.image,
    name: product.name,
    badges: product.badges,
    ...priceText(product, locale),
    soldOut: product.soldOut,
  }));
  const shelfLabels = {
    viewAll: dict.shelves.viewAll,
    more: dict.shelves.more,
    quickAdd: dict.shelves.quickAdd,
    restock: dict.shelves.restock,
    soldOut: dict.shelves.soldOut,
    sale: dict.shelves.sale,
  };
  // SHOP BY 카테고리 타일: 정해 둔 상품 사진, 없으면 그 카테고리 첫 상품, 그것도 없으면 기본 사진
  const tiles = (["tights", "tops", "hoodies"] as const).map((key) => ({
    key,
    image: (bySku(products, shopByTiles[key]) ?? productsOfPage(products, key)[0])?.image ?? productById(shopByTiles[key]).image,
    ...dict.shopBy[key],
  }));
  // 트렌드 배너 배경은 브랜드 사진이라 고정
  const trend = productById(trendImageId);
  const subBanner = (await getBanners(locale, "MAIN_SUB"))?.[0];
  // 상품 정보 패널에서 열 수 있는 상품: 히어로 로테이션 + BESTSELLER
  const panelSource = [...new Set([...heroProducts.map((item) => item.product), ...bestProducts])];
  const panelProducts: PanelProduct[] = panelSource.map((product) => ({
    id: product.id,
    sku: product.sku,
    image: product.image,
    name: product.name,
    badges: product.badges,
    ...priceText(product, locale),
    soldOut: product.soldOut,
    desc: product.description ?? undefined,
    sizes: product.sizes,
    fit: dict.fit[product.fit],
    fabric: dict.fabric[product.fabric],
  }));

  const nav = siteNav(locale, dict.nav);

  return (
    <>
      <SiteHeader
        locale={locale}
        introDim
        logo={images.wordmark}
        nav={nav}
        labels={headerLabels(dict.nav)}
      />

      <main>
        {/* 0. 서펜트 비늘 인트로가 1번 히어로를 감싼다. 비늘이 걷히고 로고가 헤더로 날아가면 히어로가 나타난다 */}
        <SerpentIntro logo={images.wordmark} labels={dict.intro}>
          <section className={styles.hero} id="hero">
            <div className={styles.heroLeft}>
              {/* 인트로의 큰 로고가 S자로 날아와 내려앉는 자리 (data-intro-target) */}
              <div className={styles.heroLogo} data-intro-target="">
                <Image src={images.wordmark} alt="SKALEZ" width={420} height={83} priority />
              </div>
              <h1 className={styles.heroTitle}>
                Forged,
                <br />
                not <em>born.</em>
              </h1>
              <p className={styles.heroLead}>{dict.hero.lead}</p>
              {/* data-hero-ctas: 모바일에서 버튼이 화면 아래에 오므로 퀵메뉴가 이걸 보고 위로 비켜선다 */}
              <div className={styles.ctas} data-hero-ctas>
                <a className={`${styles.btn} ${styles.btnWhite}`} href={`/${locale}/shop/new`}>
                  {dict.hero.shop} <span>→</span>
                </a>
                <a className={`${styles.btn} ${styles.btnGhost}`} href={`/${locale}/shop/tights`}>
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

        {/* 3. BESTSELLER (13번 시안의 세로 제목 섹션) */}
        <ProductShelf id="best" title={dict.shelves.best.title} ranked items={bestItems} moreHref={`/${locale}/shop/best`} labels={shelfLabels} />

        {/* 4. 카테고리 타일 */}
        <section className={styles.shopBy} id="shopby">
          {tiles.map((tile, index) => (
            <Reveal key={tile.key} delay={index * 100}>
              <a className={styles.tile} href={`/${locale}/shop/${tile.key}`}>
                <div className={styles.tileImage}>
                  <Image src={tile.image} alt="" fill sizes="(max-width: 860px) 100vw, 40vw" />
                </div>
                <div className={styles.tileText}>
                  <div>
                    <b>{tile.title}</b>
                  </div>
                  <span className={styles.go}>→</span>
                </div>
              </a>
            </Reveal>
          ))}
        </section>

        {/* 5. 트렌드 배너 (쇼핑하기) */}
        <section className={styles.trend} id="trend">
          <div className={styles.trendBg} aria-hidden="true">
            {/* 관리자 '메인 중간 배너'가 켜져 있으면 그 사진·문구, 없으면 기본 문구 */}
            {subBanner ? (
              <Image src={subBanner.imageUrl} alt="" fill sizes="100vw" unoptimized />
            ) : (
              <Image src={trend.image} alt="" fill sizes="100vw" />
            )}
          </div>
          <Reveal>
            {subBanner?.subtext && <p className={styles.trendKicker}>{subBanner.subtext}</p>}
            {subBanner?.headline ? (
              <h2 className={styles.trendTitle}>{subBanner.headline}</h2>
            ) : (
              <h2 className={styles.trendTitle}>
                Don&apos;t follow
                <br />
                the trend.
                <br />
                <em>Forge it.</em>
              </h2>
            )}
            {subBanner?.price && <p className={styles.trendPrice}>{subBanner.price}</p>}
            <a className={`${styles.btn} ${styles.btnWhite} ${styles.trendCta}`} href={localHref(subBanner?.linkUrl, locale, `/${locale}/shop/all`)}>
              {dict.trend.cta} <span>→</span>
            </a>
          </Reveal>
          <div className={styles.scrawl} aria-hidden="true">
            LEG
            <br />
            DAY.
          </div>
        </section>

        {/* 6. 배송 안내 (BE 배송 설정) + 신뢰 바 */}
        <ShippingInfo locale={locale} labels={dict.shipping} />
        {/* 6-1. 신뢰 바 */}
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

        {/* 7. 공지사항 · FAQ (BE) */}
        <NoticeBoard locale={locale} labels={dict.board} />
      </main>

      {/* 8. 푸터 */}
      <SiteFooter locale={locale} labels={dict.footer} />

      <QuickMenu locale={locale} labels={dict.quick} introDim />
      <ProductPanel locale={locale} products={panelProducts} labels={dict.panel} />
    </>
  );
}

import type { Locale } from "@/i18n/config";

// BE 연동 전 임시 데이터. 상품 정보와 사진은 기존 skalez.com(한국어)·skalezus.imweb.me(영문)에서 가져왔다.
// 가격은 기존 사이트처럼 시장별로 따로 정한다(KRW / USD) — BE의 Money(금액 + 통화) 구조와 같은 모양.

export type Currency = "KRW" | "USD";

export type Badge = "NEW" | "SALE" | "BEST" | "HOT";

export type CategoryKey = "top" | "tights" | "women" | "goods";

/** 핏. 사전의 fit.* 라벨 키와 같다 */
export type Fit = "oversized" | "semi" | "muscle" | "regular" | "compression" | "free";

export type Product = {
  id: number;
  category: CategoryKey;
  image: string;
  badges: Badge[];
  name: Record<Locale, string>;
  price: Record<Currency, number>;
  /** 할인 전 가격 */
  listPrice?: Record<Currency, number>;
  soldOut?: boolean;
  /** 없으면 카테고리 기본값 (타이즈=컴프레션, 굿즈=프리, 그 외=오버핏) */
  fit?: Fit;
};

/** 한국어는 원화, 그 외 언어는 기존 영문 사이트의 달러 가격 */
export const currencyFor = (locale: Locale): Currency => (locale === "ko" ? "KRW" : "USD");

export function formatMoney(amount: number, currency: Currency, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(amount);
}

export const fitOf = (product: Product): Fit =>
  product.fit ?? (product.category === "tights" ? "compression" : product.category === "goods" ? "free" : "oversized");

/** 카테고리별 사이즈 전개 (기존 사이트 기준) */
export const sizesOf = (product: Product): string[] =>
  product.category === "tights" ? ["S", "M", "L", "XL"] : product.category === "goods" ? ["FREE"] : ["M", "L", "XL", "2XL", "3XL"];

/** 소재. 사전의 fabric.* 라벨 키와 같다 */
export type Fabric = "cotton" | "cottonPoly" | "polyRayon" | "nylonSpandex" | "polySilicone";

const fabricById: Partial<Record<number, Fabric>> = {
  291: "polyRayon",
  261: "cottonPoly",
  249: "cottonPoly",
  251: "cottonPoly",
  252: "cottonPoly",
  250: "polySilicone",
};

/** 없으면 카테고리 기본값 (타이즈=나일론·스판덱스, 그 외=코튼 100%) */
export const fabricOf = (product: Product): Fabric =>
  fabricById[product.id] ?? (product.category === "tights" ? "nylonSpandex" : "cotton");

/** 상품 정보 패널에 나오는 설명 (있는 상품만) */
export const descriptions: Partial<Record<number, Record<Locale, string>>> = {
  292: {
    ko: "네추럴 보디빌더 곽현성(KAIDO)과 SKALEZ의 콜라보. 강함은 타고나는 것이 아니라, 스스로 만들어가는 것. 한 겹씩 돋아나는 용의 비늘처럼.",
    en: "A collaboration between natural bodybuilder Kwak Hyunseong (KAIDO) and SKALEZ. Strength isn't something you're born with. You build it, like dragon scales growing one layer at a time.",
    ja: "ナチュラルボディビルダー、クァク・ヒョンソン(KAIDO)とSKALEZのコラボ。強さは生まれ持つものではなく、自ら築くもの。一枚ずつ生えそろう竜の鱗のように。",
    "zh-CN": "自然健美运动员郭贤成(KAIDO)与 SKALEZ 的联名。力量不是与生俱来的，而是自己锻造的。如同一层层生长的龙鳞。",
  },
  291: {
    ko: "KAIDO × SKALEZ 드래곤 스케일 컬렉션. 세미 오버핏으로 어깨는 넓게, 기장은 깔끔하게.",
    en: "KAIDO × SKALEZ Dragon Scales collection. Semi-oversized: wide through the shoulders, clean at the hem.",
    ja: "KAIDO × SKALEZ ドラゴンスケイル コレクション。セミオーバーサイズで肩幅は広く、着丈はすっきり。",
    "zh-CN": "KAIDO × SKALEZ 龙鳞系列。半宽松版型，肩部宽阔，衣长利落。",
  },
  278: {
    ko: "두툼한 헤비 코튼. 운동 중에도 형태가 무너지지 않는 오버핏.",
    en: "Thick heavyweight cotton. An oversized fit that keeps its shape through every set.",
    ja: "厚手のヘビーコットン。トレーニング中も形が崩れないオーバーサイズ。",
    "zh-CN": "厚实重磅棉。训练中也不变形的宽松版型。",
  },
  276: {
    ko: "가볍고 시원한 라이트 코튼. 여름 훈련용 오버핏.",
    en: "Light, breathable cotton. An oversized fit for summer training.",
    ja: "軽くて涼しいライトコットン。夏のトレーニング向けオーバーサイズ。",
    "zh-CN": "轻薄透气的棉质。适合夏季训练的宽松版型。",
  },
  251: {
    ko: "본세트 전, 몸을 데우는 웜업 후드. 두툼한 기모 안감.",
    en: "A warm-up hoodie for before your working sets. Thick brushed fleece lining.",
    ja: "本番セット前に体を温めるウォームアップパーカー。厚手の裏起毛。",
    "zh-CN": "正式组前热身用的连帽衫。厚实抓绒内里。",
  },
  164: {
    ko: "하체 훈련용 컴프레션 쇼츠. 스쿼트 깊이에서도 밀려 올라가지 않는 밑단.",
    en: "Compression shorts for leg day. The hem stays put even at full squat depth.",
    ja: "脚トレ用コンプレッションショーツ。深いスクワットでもずり上がらない裾。",
    "zh-CN": "腿部训练用压缩短裤。深蹲到底也不会上卷的裤脚。",
  },
  166: {
    ko: "SKALEZ 시그니쳐 카모 패턴. 4방향 스트레치 원단으로 무릎 굽힘이 자유롭다.",
    en: "SKALEZ signature camo pattern. Four-way stretch fabric lets your knees bend freely.",
    ja: "SKALEZ シグネチャーカモ柄。4方向ストレッチ素材で膝の曲げ伸ばしが自由。",
    "zh-CN": "SKALEZ 经典迷彩图案。四向弹力面料，屈膝自如。",
  },
};

const cdn = "https://cdn.imweb.me";

export const images = {
  wordmark: `${cdn}/upload/S20210930976effc85cf48/50270fd40561c.png`,
};

export const kakaoChannelUrl = "https://pf.kakao.com/_byDUxj/chat";

type Names = [ko: string, en: string, ja: string, zhCN: string];

function product(
  id: number,
  category: CategoryKey,
  image: string,
  [ko, en, ja, zhCN]: Names,
  price: [krw: number, usd: number],
  options: { badges?: Badge[]; list?: [krw: number, usd: number]; soldOut?: boolean; fit?: Fit } = {},
): Product {
  return {
    id,
    category,
    image: `${cdn}/thumbnail/${image}`,
    badges: options.badges ?? [],
    name: { ko, en, ja, "zh-CN": zhCN },
    price: { KRW: price[0], USD: price[1] },
    listPrice: options.list && { KRW: options.list[0], USD: options.list[1] },
    soldOut: options.soldOut,
    fit: options.fit,
  };
}

export const products: Product[] = [
  // ---------- 상의 ----------
  product(292, "top", "20260927/413a3c65358d441c.png",
    ["드래곤 오버핏 티셔츠", "DRAGON SCALES Oversized T-shirt", "ドラゴンスケイル オーバーサイズTシャツ", "龙鳞宽松T恤"],
    [69000, 49], { badges: ["NEW", "SALE"], list: [79000, 59] }),
  product(291, "top", "20260927/5b5dac00c0fe4517.png",
    ["매드니스 세미 오버핏 티셔츠", "MADNESS Semi-Oversized T-shirt", "マッドネス セミオーバーサイズTシャツ", "MADNESS 半宽松T恤"],
    [59000, 39], { badges: ["NEW", "SALE"], list: [69000, 49], fit: "semi" }),
  product(278, "top", "20250701/237cfa5bb37bd.jpg",
    ["헤비 웨이트 오버핏 티셔츠 화이트", "Heavy Weight Oversized T-Shirt White", "ヘビーウェイト オーバーサイズTシャツ ホワイト", "重磅宽松T恤 白色"],
    [43000, 42.18], { badges: ["BEST", "HOT"] }),
  product(276, "top", "20250701/38d6b9b43ccfa.jpg",
    ["라이트 웨이트 오버핏 티셔츠 화이트", "Light Weight Oversized T-Shirt White", "ライトウェイト オーバーサイズTシャツ ホワイト", "轻磅宽松T恤 白色"],
    [43000, 42.18], { badges: ["BEST", "HOT"] }),
  product(273, "top", "20250625/65926f9cca419.jpg",
    ["워크아웃 숄더라인 슬리브리스 화이트", "Workout =/ Homework Sleeveless White", "ワークアウト スリーブレス ホワイト", "Workout 无袖背心 白色"],
    [38000, 36.91], { badges: ["BEST", "HOT"], fit: "regular" }),
  product(272, "top", "20250625/606212dc38d43.jpg",
    ["워크아웃 숄더라인 슬리브리스 블랙", "Workout =/ Homework Sleeveless Black", "ワークアウト スリーブレス ブラック", "Workout 无袖背心 黑色"],
    [38000, 36.91], { badges: ["BEST", "HOT"], fit: "regular" }),
  product(275, "top", "20250625/3eff9da129f55.jpg",
    ["파라밸럼 오버핏 티셔츠 화이트", "Si Vis Pacem Para Bellum Oversized T-Shirt White", "パラベラム オーバーサイズTシャツ ホワイト", "Para Bellum 宽松T恤 白色"],
    [43000, 42.18], { badges: ["BEST", "HOT"] }),
  product(274, "top", "20250625/188d5a5827c63.jpg",
    ["파라밸럼 오버핏 티셔츠 블랙", "Si Vis Pacem Para Bellum Oversized T-Shirt Black", "パラベラム オーバーサイズTシャツ ブラック", "Para Bellum 宽松T恤 黑色"],
    [43000, 42.18], { badges: ["BEST", "HOT"] }),
  product(271, "top", "20250612/d5919d71eb8cd.jpg",
    ["췌 빅로고 머슬핏 티셔츠 화이트", "Chweya Big Logo Muscle Fit T-shirt White", "チェヤ ビッグロゴ マッスルフィットTシャツ ホワイト", "Chweya 大Logo 修身T恤 白色"],
    [43000, 42.18], { badges: ["BEST", "HOT"], fit: "muscle" }),
  product(270, "top", "20250612/614ff3bae5703.jpg",
    ["췌 빅로고 머슬핏 티셔츠 블랙", "Chweya Big Logo Muscle Fit T-shirt Black", "チェヤ ビッグロゴ マッスルフィットTシャツ ブラック", "Chweya 大Logo 修身T恤 黑色"],
    [43000, 42.18], { badges: ["BEST", "HOT"], fit: "muscle" }),
  product(269, "top", "20250612/2ddbf3593b758.jpg",
    ["췌 에센셜 머슬핏 티셔츠 화이트", "Chweya Essential Muscle Fit T-shirt White", "チェヤ エッセンシャル マッスルフィットTシャツ ホワイト", "Chweya 基础修身T恤 白色"],
    [39000, 36.91], { badges: ["BEST", "HOT"], fit: "muscle" }),
  product(268, "top", "20250612/4eb82fca09cc7.jpg",
    ["췌 에센셜 머슬핏 티셔츠 블랙", "Chweya Essential Muscle Fit T-shirt Black", "チェヤ エッセンシャル マッスルフィットTシャツ ブラック", "Chweya 基础修身T恤 黑色"],
    [39000, 36.91], { badges: ["BEST", "HOT"], fit: "muscle" }),
  product(264, "top", "20250325/636693509b31e.jpg",
    ["FCK 헤비 코튼 오버핏 티셔츠 블랙", "FCK Heavy Cotton Oversized T-shirt Black", "FCK ヘビーコットン オーバーサイズTシャツ ブラック", "FCK 重磅纯棉宽松T恤 黑色"],
    [45000, 52.73], { badges: ["BEST"] }),
  product(265, "top", "20250325/ea072bfaaef19.jpg",
    ["FCK 머슬핏 골지 민소매", "FCK Ribbed Tank Black", "FCK リブタンクトップ ブラック", "FCK 罗纹背心 黑色"],
    [35000, 36.91], { badges: ["BEST"], fit: "muscle" }),
  product(261, "top", "20250114/4427b63a9a3bc.jpg",
    ["플리즈 세미 오버핏 후드 빈티지 브라운", "PLEASE Oversized Hoodie Vintage Brown", "PLEASE オーバーサイズパーカー ヴィンテージブラウン", "PLEASE 宽松连帽衫 复古棕"],
    [85000, 63.28], { badges: ["BEST", "HOT"], fit: "semi" }),
  product(249, "top", "20241129/58ee0b8c399b6.jpg",
    ["플리즈 세미 오버핏 후드 블랙", "PLEASE Oversized Hoodie Black", "PLEASE オーバーサイズパーカー ブラック", "PLEASE 宽松连帽衫 黑色"],
    [85000, 63.28], { badges: ["BEST", "HOT"], fit: "semi" }),
  product(251, "top", "20241219/98cc17ce37660.jpg",
    ["멘탈리티 웜업 후드 블랙", "Mentality Warm-up Hoodie Black", "メンタリティ ウォームアップパーカー ブラック", "Mentality 热身连帽衫 黑色"],
    [89000, 73.82], { badges: ["BEST", "HOT"] }),
  product(252, "top", "20241219/ebd3be45f0d78.jpg",
    ["멘탈리티 웜업 후드 네이비", "Mentality Warm-up Hoodie Navy", "メンタリティ ウォームアップパーカー ネイビー", "Mentality 热身连帽衫 藏青色"],
    [89000, 73.82], { badges: ["BEST", "HOT"] }),
  product(248, "top", "20241129/61e1348c32334.jpg",
    ["플리즈 헤비 코튼 오버핏 티셔츠 블랙", "PLEASE Heavy Cotton Oversized Tee", "PLEASE ヘビーコットン オーバーサイズTシャツ", "PLEASE 重磅纯棉宽松T恤"],
    [45000, 42.18], { badges: ["BEST", "HOT"] }),

  // ---------- 타이즈 ----------
  product(164, "tights", "20250610/dd7ffae5cfc8c.jpg",
    ["에센셜 타이즈 쇼츠 차콜", "Essential Tights Shorts Charcoal", "エッセンシャル タイツショーツ チャコール", "基础紧身短裤 炭灰色"],
    [39800, 39.02], { badges: ["BEST"] }),
  product(166, "tights", "20250607/4ee657dd39d9f.jpg",
    ["시그니쳐 카모 타이즈 블랙", "Signature Camouflage Tights Black", "シグネチャー カモ タイツ ブラック", "经典迷彩紧身裤 黑色"],
    [47800, 50.62], { badges: ["BEST"] }),
  product(168, "tights", "20230320/626a45bfbf366.png",
    ["크로스 트레이닝 타이즈 블랙", "Cross-Training Tights", "クロストレーニング タイツ ブラック", "交叉训练紧身裤 黑色"],
    [49800, 52.73], { badges: ["BEST"] }),
  product(162, "tights", "20250607/e9f4275163b18.jpg",
    ["에센셜 타이즈 차콜", "Essential Tights Charcoal", "エッセンシャル タイツ チャコール", "基础紧身裤 炭灰色"],
    [42800, 42.18], { badges: ["BEST"] }),
  product(200, "tights", "20240403/11c8ecf3796b0.jpg",
    ["프로 슬리브 타이즈 블랙", "Pro Sleeve Tights Black", "プロスリーブ タイツ ブラック", "Pro 袖套紧身裤 黑色"],
    [54800, 52.73]),
  product(202, "tights", "20240403/f448a0e6f0d0b.jpg",
    ["프로 슬리브 타이즈 화이트", "Pro Sleeve Tights White", "プロスリーブ タイツ ホワイト", "Pro 袖套紧身裤 白色"],
    [54800, 52.73]),
  product(165, "tights", "20230320/f7efaf2d5f5b1.png",
    ["에센셜 타이즈 쇼츠 컬러드", "Essential Tights Shorts Coloured", "エッセンシャル タイツショーツ カラード", "基础紧身短裤 彩色"],
    [39800, 39.02], { badges: ["BEST"] }),
  product(216, "tights", "20240821/1a15747c5cd95.jpg",
    ["시그니쳐 카모 타이즈 쇼츠 블랙", "Signature Camo Tights Shorts Black", "シグネチャー カモ タイツショーツ ブラック", "经典迷彩紧身短裤 黑色"],
    [44800, 42.18], { badges: ["BEST", "HOT"], soldOut: true }),
  product(163, "tights", "20250607/70e7d8ec48d24.jpg",
    ["에센셜 타이즈 쇼츠 리치블랙", "Essential Tights Shorts Black", "エッセンシャル タイツショーツ ブラック", "基础紧身短裤 黑色"],
    [39800, 39.02], { badges: ["BEST"], soldOut: true }),
  product(152, "tights", "20250607/f161af6e542fd.jpg",
    ["에센셜 타이즈 리치블랙", "Essential Tights Black", "エッセンシャル タイツ ブラック", "基础紧身裤 黑色"],
    [42800, 42.18], { badges: ["BEST"], soldOut: true }),
  product(167, "tights", "20230428/1af4daf085a14.png",
    ["시그니쳐 카모 타이즈 네이비", "Signature Camouflage Tights Navy", "シグネチャー カモ タイツ ネイビー", "经典迷彩紧身裤 藏青色"],
    [47800, 50.62], { badges: ["BEST"], soldOut: true }),

  // ---------- 굿즈 ----------
  product(250, "goods", "20241129/4af60854c2fad.jpg",
    ["플리즈 소프트 논 슬립 헤어밴드", "PLEASE Soft Non-Slip Headband", "PLEASE ソフト ノンスリップ ヘアバンド", "PLEASE 柔软防滑发带"],
    [20000, 21.09], { badges: ["BEST", "HOT"] }),
];

export const productById = (id: number) => products.find((item) => item.id === id)!;

/** 히어로 오른쪽에서 5초마다 돌아가는 대표 상품. line은 상품 위에 작게 붙는 라인 이름(고유명사라 번역하지 않는다) */
export const heroShowcase = [
  { id: 292, line: "KAIDO × SKALEZ" },
  { id: 166, line: "SIGNATURE CAMO" },
  { id: 291, line: "KAIDO × SKALEZ" },
  { id: 162, line: "ESSENTIAL" },
];

/**
 * 13번 시안의 세로 제목 상품 섹션. 섹션당 7개 + 마지막 칸 "전체 보기".
 * BESTSELLER는 순위(01~07) 순서다 — BE 연동 후에는 실제 판매량으로 바꾼다
 */
export const shelves = {
  best: [166, 164, 168, 278, 249, 162, 268],
  tights: [200, 202, 166, 162, 165, 168, 216],
  tops: [292, 291, 251, 252, 261, 271, 264],
} as const;

/** 트렌드 배너 배경 사진 */
export const trendImageId = 270;

// TODO: 대표님 확인 필요 — 기존 사이트 하단에 주소가 두 가지로 표기되어 있음
export const business = {
  company: "스케일즈(SKALEZ)",
  ceo: "하정권",
  businessNumber: "263-64-00511",
  mailOrder: "제 2021-경기파주-2436 호",
  address: "경기 고양시 덕양구 서삼릉길 340-1 (원흥동) 1층",
  contact: "010-5817-8169",
  email: "skalez@naver.com",
};

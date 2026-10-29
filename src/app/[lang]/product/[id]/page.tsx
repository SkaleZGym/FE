import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/account/PageShell";
import ProductDetail, { type DetailProduct } from "@/components/product/ProductDetail";
import { currencyFor, formatMoney } from "@/data/catalog";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getShippingPolicy } from "@/lib/api";
import { getShopProducts, pageOfProduct } from "@/lib/shop";

// 상품은 관리자가 언제든 추가해서 번호를 미리 알 수 없다 → 요청 때 그린다 (BE 응답은 몇 분 캐시)
export const instant = false;

async function find(id: string) {
  if (!/^\d+$/.test(id)) return null;
  const locale = await getLocale();
  return (await getShopProducts(locale)).find((product) => product.id === Number(id)) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/[lang]/product/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await find(id);
  if (!product) return {};
  const dict = await getDictionary();
  return {
    title: `${product.name} | ${dict.meta.title}`,
    description: product.description ?? dict.meta.description,
    openGraph: { images: [product.image] },
  };
}

/** 상품 상세: 사진 + 구매 상자, 아래에 상세정보 · 사이즈 · 리뷰 탭 (라이즌푸드 상세 화면 구성) */
export default async function ProductPage({ params }: PageProps<"/[lang]/product/[id]">) {
  const { id } = await params;
  const product = await find(id);
  if (!product) notFound();

  const locale = await getLocale();
  const dict = await getDictionary();
  const currency = currencyFor(locale);
  const policy = await getShippingPolicy(locale);
  // 이름 위 작은 영문 제목: 영어 상품명
  const english = locale === "en" ? product : (await getShopProducts("en")).find((item) => item.id === product.id);

  const detail: DetailProduct = {
    id: product.id,
    sku: product.sku,
    image: product.image,
    name: product.name,
    kicker: (english?.name ?? product.name).toUpperCase(),
    badges: product.badges,
    soldOut: product.soldOut,
    price: product.price,
    listPrice: product.listPrice,
    currency,
    sizes: product.sizes,
    fit: dict.fit[product.fit],
    fabric: dict.fabric[product.fabric],
    description: product.description,
    categoryHref: `/${locale}/shop/${pageOfProduct(product)}`,
  };

  // 배송비 안내는 BE 배송 설정 (최소 단위: 원·센트) → 화면 단위로. BE가 꺼져 있으면 사전 문구
  const minor = (amount: number) => (currency === "USD" ? amount / 100 : amount);
  const shipping = policy
    ? {
        fee: minor(policy.baseFee),
        freeThreshold: policy.freeThreshold == null ? null : minor(policy.freeThreshold),
        text: (policy.freeThreshold == null ? dict.product.shippingFeeAlways : dict.product.shippingFee)
          .replace("{fee}", formatMoney(minor(policy.baseFee), currency, locale))
          .replace("{threshold}", policy.freeThreshold == null ? "" : formatMoney(minor(policy.freeThreshold), currency, locale)),
        extra:
          currency === "KRW" && (policy.jejuExtraFee > 0 || policy.islandExtraFee > 0)
            ? dict.product.shippingExtra
                .replace("{jeju}", formatMoney(policy.jejuExtraFee, currency, locale))
                .replace("{island}", formatMoney(policy.islandExtraFee, currency, locale))
            : null,
      }
    : { fee: 0, freeThreshold: null, text: dict.panel.shippingValue, extra: null };

  return (
    <PageShell>
      <ProductDetail
        locale={locale}
        product={detail}
        shipping={shipping}
        labels={{ ...dict.product, panel: dict.panel, common: dict.common, soldOutTag: dict.shelves.soldOut, sale: dict.shelves.sale }}
      />
    </PageShell>
  );
}

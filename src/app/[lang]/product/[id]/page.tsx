import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/account/PageShell";
import ProductDetail, { type DetailProduct } from "@/components/product/ProductDetail";
import { currencyFor, descriptions, fabricOf, fitOf, formatMoney, products, sizesOf } from "@/data/catalog";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getShippingPolicy } from "@/lib/api";

export function generateStaticParams() {
  return products.map((product) => ({ id: String(product.id) }));
}

const find = (id: string) => products.find((product) => String(product.id) === id);

export async function generateMetadata({ params }: PageProps<"/[lang]/product/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = find(id);
  if (!product) return {};
  const locale = await getLocale();
  const dict = await getDictionary();
  return {
    title: `${product.name[locale]} | ${dict.meta.title}`,
    description: descriptions[product.id]?.[locale] ?? dict.meta.description,
    openGraph: { images: [product.image] },
  };
}

/** 상품 상세: 사진 + 구매 상자, 아래에 상세정보 · 사이즈 · 리뷰 탭 (라이즌푸드 상세 화면 구성) */
export default async function ProductPage({ params }: PageProps<"/[lang]/product/[id]">) {
  const { id } = await params;
  const product = find(id);
  if (!product) notFound();

  const locale = await getLocale();
  const dict = await getDictionary();
  const currency = currencyFor(locale);
  const policy = await getShippingPolicy(locale);

  const detail: DetailProduct = {
    id: product.id,
    image: product.image,
    name: product.name[locale],
    kicker: product.name.en.toUpperCase(),
    badges: product.badges,
    soldOut: Boolean(product.soldOut),
    price: product.price[currency],
    listPrice: product.listPrice?.[currency] ?? null,
    currency,
    sizes: sizesOf(product),
    fit: dict.fit[fitOf(product)],
    fabric: dict.fabric[fabricOf(product)],
    description: descriptions[product.id]?.[locale] ?? null,
    categoryHref: `/${locale}/shop/${product.category === "top" ? "tops" : product.category === "women" ? "all" : product.category}`,
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

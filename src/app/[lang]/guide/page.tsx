import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import LegalDoc from "@/components/LegalDoc";
import { formatMoney } from "@/data/catalog";
import { shoppingGuide } from "@/data/legal";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getShippingPolicy } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.footer.guide} | ${dict.meta.title}` };
}

/** 이용안내 (배송·교환·반품). 본문은 한국어 기준이라 국내 배송비(원)를 관리자 '배송 설정'에서 읽어 넣는다 */
export default async function GuidePage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const policy = await getShippingPolicy("ko");
  const won = (amount: number) => formatMoney(amount, "KRW", "ko");
  const doc = shoppingGuide({
    base: won(policy?.baseFee ?? 3000),
    free: policy ? (policy.freeThreshold == null ? null : won(policy.freeThreshold)) : won(100000),
    jeju: won(policy?.jejuExtraFee ?? 3000),
    island: won(policy?.islandExtraFee ?? 5000),
  });
  return (
    <PageShell title="SHOPPING GUIDE" lead={dict.footer.guide}>
      <LegalDoc doc={doc} effectiveLabel={dict.legal.effective} notice={locale === "ko" ? undefined : dict.legal.koreanOnly} />
    </PageShell>
  );
}

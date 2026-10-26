import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import OrderResult from "@/components/account/OrderResult";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.order.successTitle} | ${dict.meta.title}`, robots: { index: false } };
}

/** 결제 결과 (제목은 주문 상태에 따라 본문이 그린다) */
export default async function OrderResultPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell>
      <OrderResult locale={locale} labels={dict.order} />
    </PageShell>
  );
}

import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import CheckoutView from "@/components/account/CheckoutView";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.checkout.title} | ${dict.meta.title}`, robots: { index: false } };
}

export default async function CheckoutPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title={dict.checkout.title}>
      <CheckoutView locale={locale} labels={dict.checkout} cartLabels={dict.cart} common={dict.common} more={dict.order.more} />
    </PageShell>
  );
}

import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import CartView from "@/components/account/CartView";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.cart.title} | ${dict.meta.title}`, robots: { index: false } };
}

export default async function CartPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title={dict.cart.title}>
      <CartView locale={locale} labels={dict.cart} common={dict.common} />
    </PageShell>
  );
}

import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import WishlistView from "@/components/account/WishlistView";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.wishlist.title} | ${dict.meta.title}`, robots: { index: false } };
}

export default async function WishlistPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title={dict.wishlist.title}>
      <WishlistView locale={locale} labels={dict.wishlist} common={dict.common} soldOut={dict.shelves.soldOut} />
    </PageShell>
  );
}

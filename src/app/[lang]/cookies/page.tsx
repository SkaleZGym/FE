import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import LegalDoc from "@/components/LegalDoc";
import { cookiePolicy } from "@/data/legal";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.footer.cookies} | ${dict.meta.title}` };
}

export default async function CookiesPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title="COOKIE POLICY" lead={dict.footer.cookies}>
      <LegalDoc doc={cookiePolicy} effectiveLabel={dict.legal.effective} notice={locale === "ko" ? undefined : dict.legal.koreanOnly} />
    </PageShell>
  );
}

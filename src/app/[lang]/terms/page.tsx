import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import LegalDoc from "@/components/LegalDoc";
import { terms } from "@/data/legal";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.footer.terms} | ${dict.meta.title}` };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title="TERMS OF USE" lead={dict.footer.terms}>
      <LegalDoc doc={terms} effectiveLabel={dict.legal.effective} notice={locale === "ko" ? undefined : dict.legal.koreanOnly} />
    </PageShell>
  );
}

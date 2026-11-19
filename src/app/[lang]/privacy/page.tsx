import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import LegalDoc from "@/components/LegalDoc";
import { privacy } from "@/data/legal";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { pageAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.footer.privacy} | ${dict.meta.title}`, alternates: pageAlternates(await getLocale(), "/privacy") };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title="PRIVACY POLICY" lead={dict.footer.privacy}>
      <LegalDoc doc={privacy} effectiveLabel={dict.legal.effective} notice={locale === "ko" ? undefined : dict.legal.koreanOnly} />
    </PageShell>
  );
}

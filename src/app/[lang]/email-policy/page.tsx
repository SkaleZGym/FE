import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import LegalDoc from "@/components/LegalDoc";
import { emailRefusal } from "@/data/legal";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.footer.emailRefusal} | ${dict.meta.title}` };
}

export default async function EmailPolicyPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title="EMAIL POLICY" lead={dict.footer.emailRefusal}>
      <LegalDoc doc={emailRefusal} effectiveLabel={dict.legal.effective} notice={locale === "ko" ? undefined : dict.legal.koreanOnly} />
    </PageShell>
  );
}

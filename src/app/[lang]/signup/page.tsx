import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import SignupForm from "@/components/account/SignupForm";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.account.signupTitle} | ${dict.meta.title}`, robots: { index: false } };
}

export default async function SignupPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title={dict.account.signupTitle} lead={dict.account.signupLead} narrow>
      <SignupForm locale={locale} labels={dict.account} common={dict.common} />
    </PageShell>
  );
}

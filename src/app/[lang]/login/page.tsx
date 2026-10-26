import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import LoginForm from "@/components/account/LoginForm";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.account.loginTitle} | ${dict.meta.title}`, robots: { index: false } };
}

export default async function LoginPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title={dict.account.loginTitle} lead={dict.account.loginLead} narrow>
      <LoginForm locale={locale} labels={dict.account} common={dict.common} />
    </PageShell>
  );
}

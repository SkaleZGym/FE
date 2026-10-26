import type { Metadata } from "next";
import SocialSignupForm from "@/components/account/auth/SocialSignupForm";
import PageShell from "@/components/account/PageShell";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.account.auth.socialTitle} | ${dict.meta.title}`, robots: { index: false } };
}

/** 카카오·네이버로 처음 온 사람: 약관 동의 후 가입 */
export default async function SocialSignupPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title={dict.account.auth.socialTitle} lead={dict.account.auth.socialLead} narrow>
      <SocialSignupForm locale={locale} labels={dict.account} common={dict.common} />
    </PageShell>
  );
}

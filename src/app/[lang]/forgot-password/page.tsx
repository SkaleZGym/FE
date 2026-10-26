import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/account/ForgotPasswordForm";
import PageShell from "@/components/account/PageShell";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.account.forgotTitle} | ${dict.meta.title}`, robots: { index: false } };
}

/** 비밀번호 찾기 · 아임웹 이전 회원의 첫 비밀번호 설정 */
export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title={dict.account.forgotTitle} lead={dict.account.forgotLead} narrow>
      <ForgotPasswordForm locale={locale} labels={dict.account} common={dict.common} />
    </PageShell>
  );
}

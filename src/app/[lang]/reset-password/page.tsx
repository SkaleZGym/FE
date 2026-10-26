import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import ResetPasswordForm from "@/components/account/ResetPasswordForm";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.account.resetTitle} | ${dict.meta.title}`, robots: { index: false } };
}

/** 메일 링크(?token=)로 새 비밀번호 설정 */
export default async function ResetPasswordPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title={dict.account.resetTitle} lead={dict.account.resetLead} narrow>
      <ResetPasswordForm locale={locale} labels={dict.account} common={dict.common} />
    </PageShell>
  );
}

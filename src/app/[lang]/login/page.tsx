import type { Metadata } from "next";
import AuthCard from "@/components/account/auth/AuthCard";
import PageShell from "@/components/account/PageShell";
import { productById, trendImageId } from "@/data/catalog";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.account.loginTitle} | ${dict.meta.title}`, robots: { index: false } };
}

/** 로그인 · 회원가입은 한 장의 슬라이드 카드 (주소만 /login · /signup 으로 나뉜다) */
export default async function LoginPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell>
      <AuthCard locale={locale} initialMode="login" image={productById(trendImageId).image} labels={dict.account} common={dict.common} />
    </PageShell>
  );
}

import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import MyPage from "@/components/account/MyPage";
import { getDictionary, getLocale } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `${dict.mypage.title} | ${dict.meta.title}`, robots: { index: false } };
}

export default async function MyPageRoute() {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <PageShell title={dict.mypage.title}>
      <MyPage
        locale={locale}
        labels={{ mypage: dict.mypage, order: dict.order, inquiry: dict.inquiry, account: dict.account, common: dict.common }}
      />
    </PageShell>
  );
}

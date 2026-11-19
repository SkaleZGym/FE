import type { Metadata } from "next";
import PageShell from "@/components/account/PageShell";
import FaqList from "@/components/board/FaqList";
import JsonLd from "@/components/JsonLd";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getFaqs } from "@/lib/api";
import { faqLd, pageAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: `FAQ | ${dict.meta.title}`, description: dict.board.faqLead, alternates: pageAlternates(await getLocale(), "/faq") };
}

/** 자주 묻는 질문 (분류 탭). 등록된 FAQ가 없으면 사전의 기본 FAQ */
export default async function FaqPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const faqs = await getFaqs(locale);
  const items =
    faqs && faqs.length > 0 ? faqs : dict.board.fallbackFaqs.map((faq, index) => ({ id: -index - 1, category: "ETC", ...faq }));

  return (
    <PageShell title={dict.board.faqTitle} lead={dict.board.faqLead}>
      <JsonLd data={faqLd(items)} />
      <FaqList locale={locale} items={items} labels={dict.board} />
    </PageShell>
  );
}

import { business, categoryPages, formatMoney } from "@/data/catalog";
import { getFaqs, getShippingPolicy } from "@/lib/api";
import { SITE_URL } from "@/lib/backend";
import { getShopProducts, productsOfPage } from "@/lib/shop";

/**
 * /llms.txt — AI 검색·답변 서비스(ChatGPT, Claude, Perplexity, 네이버 AI 브리핑 등)가 읽는 사이트 요약 (GEO).
 * 사람이 보는 화면 대신, 브랜드가 무엇이고 무엇을 얼마에 파는지·배송과 교환이 어떤지를 사실만 짧게 적는다.
 * 상품·배송비·FAQ 는 관리자에서 바꾼 값을 그대로 읽으므로 따로 고칠 필요가 없다 (몇 분 캐시)
 */
export async function GET() {
  const locale = "ko" as const;
  const url = (path: string) => `${SITE_URL}/${locale}${path}`;
  const won = (amount: number) => formatMoney(amount, "KRW", locale);

  const [products, policy, faqs] = await Promise.all([getShopProducts(locale), getShippingPolicy(locale), getFaqs(locale)]);
  const categoryNames: Record<string, string> = { tights: "타이즈·레깅스", tops: "상의(티셔츠·슬리브리스)", hoodies: "후디", goods: "굿즈" };

  const lines: string[] = [
    "# SKALEZ (스케일즈)",
    "",
    "> 보디빌더와 웨이트 트레이닝을 하는 사람을 위한 한국의 퍼포먼스 웨어 브랜드 SKALEZ(스케일즈)의 공식 온라인 스토어. 하체 훈련용 컴프레션 타이즈와 오버핏 티셔츠, 후디를 판매한다. 브랜드 이름은 비늘(scales)에서 왔다.",
    "",
    "## 브랜드 정보",
    `- 상호: ${business.company}`,
    `- 소재지: ${business.address} (대한민국)`,
    `- 고객센터: ${business.contact} / ${business.email}`,
    `- 공식 스토어: ${url("")}`,
    `- 지원 언어: 한국어(${SITE_URL}/ko), English(${SITE_URL}/en), 日本語(${SITE_URL}/ja), 简体中文(${SITE_URL}/zh-CN)`,
    "- 판매 지역: 대한민국 (해외 배송은 2027년 시작 예정)",
    "",
    "## 상품 분류",
    `- [전체 상품](${url("/shop/all")}): ${products.length}개`,
    ...categoryPages
      .filter((page) => categoryNames[page])
      .map((page) => ({ page, count: productsOfPage(products, page).length }))
      .filter(({ count }) => count > 0)
      .map(({ page, count }) => `- [${categoryNames[page]}](${url(`/shop/${page}`)}): ${count}개`),
    "",
    "## 상품 목록 (이름: 가격)",
    ...products.map((product) => {
      const sale = product.listPrice != null ? ` (정가 ${won(product.listPrice)})` : "";
      return `- [${product.name}](${url(`/product/${product.id}`)}): ${won(product.price)}${sale}${product.soldOut ? " — 품절" : ""}`;
    }),
    "",
    "## 배송·교환",
    ...(policy && policy.currency === "KRW"
      ? [
          `- 기본 배송비: ${won(policy.baseFee)}`,
          ...(policy.freeThreshold != null ? [`- 무료 배송: ${won(policy.freeThreshold)} 이상 구매 시`] : []),
          ...(policy.jejuExtraFee > 0 || policy.islandExtraFee > 0 ? [`- 추가 배송비: 제주 ${won(policy.jejuExtraFee)}, 도서산간 ${won(policy.islandExtraFee)}`] : []),
        ]
      : []),
    `- 자세한 배송·교환·반품 안내: ${url("/guide")}`,
    "",
    ...(faqs && faqs.length > 0
      ? ["## 자주 묻는 질문", ...faqs.slice(0, 30).flatMap((faq) => [`### ${faq.question}`, faq.answer.trim(), ""])]
      : []),
    "## 더 보기",
    `- [자주 묻는 질문](${url("/faq")})`,
    `- [공지사항](${url("/notice")})`,
    `- [이용약관](${url("/terms")})`,
    `- [개인정보처리방침](${url("/privacy")})`,
    `- [사이트맵](${SITE_URL}/sitemap.xml)`,
    "",
  ];

  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=600" } });
}

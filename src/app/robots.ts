import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/backend";
import { isLiveSite } from "@/lib/seo";

/**
 * AI 검색·답변 서비스의 수집기. 일반 검색엔진과 같은 규칙으로 허용한다고 따로 적어 둔다 (GEO):
 * 이름을 적어 두면 '허용 여부를 모름'으로 건너뛰는 일이 없고, 나중에 특정 수집기만 막기도 쉽다
 */
const AI_CRAWLERS = [
  "GPTBot", // OpenAI 학습
  "OAI-SearchBot", // ChatGPT 검색
  "ChatGPT-User", // ChatGPT 가 사용자의 요청으로 여는 페이지
  "ClaudeBot", // Anthropic
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended", // Gemini·AI 개요
  "Applebot-Extended",
  "Yeti", // 네이버 (검색 + AI 브리핑)
];

/** 정식 주소일 때만 검색에 노출한다. 시험 주소(new.skalez.com)·로컬은 통째로 막아 검색 결과에 시험 화면이 남지 않게 */
export default function robots(): MetadataRoute.Robots {
  if (!isLiveSite) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  // 로그인해야 보이거나 사람마다 다른 화면은 검색에서 뺀다
  const personal = ["mypage", "cart", "checkout", "order", "login", "signup", "forgot-password", "reset-password", "wishlist", "search"];
  const disallow = ["/admin", "/api/", ...personal.map((path) => `/*/${path}`)];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt"], disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

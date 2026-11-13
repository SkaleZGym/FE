import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/backend";

/** 정식 주소일 때만 검색에 노출한다. 시험 주소(new.skalez.com)·로컬은 통째로 막아 검색 결과에 시험 화면이 남지 않게 */
const LIVE_HOSTS = ["skalez.com", "www.skalez.com"];

export default function robots(): MetadataRoute.Robots {
  if (!LIVE_HOSTS.includes(new URL(SITE_URL).hostname)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  // 로그인해야 보이거나 사람마다 다른 화면은 검색에서 뺀다
  const personal = ["mypage", "cart", "checkout", "order", "login", "signup", "forgot-password", "reset-password", "wishlist", "search"];
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", ...personal.map((path) => `/*/${path}`)],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

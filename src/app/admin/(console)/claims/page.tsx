import type { Metadata } from "next";
import ClaimManager from "./ClaimManager";

export const metadata: Metadata = { title: "교환·반품" };

// 관리자 화면은 로그인 확인 뒤에 브라우저에서 그려서 미리 그린 화면(즉시 이동) 검증에서 뺀다
export const instant = false;

export default function AdminClaimsPage() {
  return <ClaimManager />;
}

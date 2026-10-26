import type { Metadata } from "next";
import MemberManager from "./MemberManager";

export const metadata: Metadata = { title: "회원 관리" };

export default function AdminMembersPage() {
  return <MemberManager />;
}

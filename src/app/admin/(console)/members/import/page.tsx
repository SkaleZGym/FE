import type { Metadata } from "next";
import MemberImport from "./MemberImport";

export const metadata: Metadata = { title: "회원 가져오기" };

export default function AdminMemberImportPage() {
  return <MemberImport />;
}

import { Suspense } from "react";
import AdminShell from "../_components/AdminShell";

/** 로그인 화면을 뺀 관리자 화면 전체가 같은 틀(메뉴·알림)을 쓴다. 화면들이 주소 쿼리(?status=)를 읽어서 Suspense로 감싼다 */
export default function ConsoleLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminShell>
      <Suspense fallback={<div className="loading">불러오는 중…</div>}>{children}</Suspense>
    </AdminShell>
  );
}

import type { Metadata } from "next";
import AdminLogin from "./AdminLogin";

export const metadata: Metadata = { title: "로그인" };

export default function AdminLoginPage() {
  return <AdminLogin />;
}

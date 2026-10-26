import type { Metadata } from "next";
import DashboardView from "./DashboardView";

export const metadata: Metadata = { title: "대시보드" };

export default function AdminDashboardPage() {
  return <DashboardView />;
}

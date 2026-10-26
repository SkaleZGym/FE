import type { Metadata } from "next";
import BannerManager from "./BannerManager";

export const metadata: Metadata = { title: "배너·팝업" };

export default function AdminBannersPage() {
  return <BannerManager />;
}

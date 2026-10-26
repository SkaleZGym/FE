import type { Metadata } from "next";
import ReviewManager from "./ReviewManager";

export const metadata: Metadata = { title: "후기 관리" };

export default function AdminReviewsPage() {
  return <ReviewManager />;
}

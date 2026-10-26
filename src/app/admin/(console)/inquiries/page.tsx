import type { Metadata } from "next";
import InquiryManager from "./InquiryManager";

export const metadata: Metadata = { title: "1:1 문의" };

export default function AdminInquiriesPage() {
  return <InquiryManager />;
}

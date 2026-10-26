import { NextResponse } from "next/server";
import { ADMIN_COOKIE_PATH, ADMIN_TOKEN_COOKIE } from "@/lib/backend";

/** 관리자 로그아웃: 관리자 쿠키만 지운다 (쇼핑몰 손님 로그인은 그대로) */
export async function POST() {
  const result = new NextResponse(null, { status: 204 });
  result.cookies.delete({ name: ADMIN_TOKEN_COOKIE, path: ADMIN_COOKIE_PATH });
  return result;
}

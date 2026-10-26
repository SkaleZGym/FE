import { NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/backend";

/** 로그아웃: 토큰 쿠키만 지운다 (BE 토큰은 상태가 없어 서버에서 따로 지울 것이 없다) */
export async function POST() {
  const result = new NextResponse(null, { status: 204 });
  result.cookies.delete(TOKEN_COOKIE);
  return result;
}

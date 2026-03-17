import { NextResponse } from "next/server";
import { generateAuthUrl, generateState } from "@/lib/auth";
import { cookies } from "next/headers";

// 登录 - 跳转到 SecondMe OAuth
export async function GET() {
  const state = generateState();

  // 将 state 存储到 cookie（7天有效期）
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 天
    path: "/",
  });

  const authUrl = generateAuthUrl(state);

  return NextResponse.redirect(authUrl);
}

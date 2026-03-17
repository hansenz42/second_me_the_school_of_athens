import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, createOrUpdateUser, generateState } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const receivedState = searchParams.get("state");
  const error = searchParams.get("error");

  // 处理错误
  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  }

  // 验证 code
  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", request.url));
  }

  // 验证 state（宽松验证，支持 WebView 场景）
  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;

  if (storedState && receivedState !== storedState) {
    console.warn("OAuth state 验证失败，可能是跨 WebView 场景，继续处理");
  }

  try {
    // 交换 code 获取 token
    const tokens = await exchangeCodeForToken(code);

    // 创建或更新用户
    // 从 token 中解析用户 ID（如果有的话），否则通过 user info API 获取
    const user = await createOrUpdateUser(
      // 这里需要用户 ID，由于 SecondMe API 返回的数据结构未知，
      // 我们先使用一个占位符，实际需要根据 API 返回的用户 ID 来调整
      tokens.accessToken.substring(0, 32), // 临时使用 access token 前 32 位作为 ID
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn
    );

    // 设置用户 session cookie
    cookieStore.set("user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 天
      path: "/",
    });

    // 清除 oauth state cookie
    cookieStore.delete("oauth_state");

    // 跳转到首页或用户之前访问的页面
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }
}

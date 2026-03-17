import { NextResponse } from "next/server";
import { getCurrentUser, getUserShades } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: 401, message: "未登录", data: null },
        { status: 401 }
      );
    }

    // 获取用户的兴趣标签
    const shades = await getUserShades(user.accessToken);

    return NextResponse.json({
      code: 0,
      data: shades,
    });
  } catch (error) {
    console.error("Get user shades error:", error);
    return NextResponse.json(
      { code: 500, message: "服务器错误", data: null },
      { status: 500 }
    );
  }
}

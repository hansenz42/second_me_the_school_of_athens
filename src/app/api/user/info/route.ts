import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: 401, message: "未登录", data: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      code: 0,
      data: {
        id: user.id,
        secondmeUserId: user.secondmeUserId,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Get user info error:", error);
    return NextResponse.json(
      { code: 500, message: "服务器错误", data: null },
      { status: 500 }
    );
  }
}

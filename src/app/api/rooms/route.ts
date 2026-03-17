import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取房间列表
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: 401, message: "未登录", data: null },
        { status: 401 }
      );
    }

    // 获取所有房间
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
            participants: true,
          },
        },
      },
    });

    return NextResponse.json({
      code: 0,
      data: rooms,
    });
  } catch (error) {
    console.error("Get rooms error:", error);
    return NextResponse.json(
      { code: 500, message: "服务器错误", data: null },
      { status: 500 }
    );
  }
}

// 创建新房间
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: 401, message: "未登录", data: null },
        { status: 401 }
      );
    }

    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json(
        { code: 400, message: "缺少房间标题", data: null },
        { status: 400 }
      );
    }

    // 创建房间
    const room = await prisma.room.create({
      data: {
        title,
        description: description || null,
        status: "waiting",
      },
    });

    // 添加创建者为参与者
    await prisma.roomParticipant.create({
      data: {
        userId: user.id,
        roomId: room.id,
        role: "owner",
      },
    });

    return NextResponse.json({
      code: 0,
      data: room,
    });
  } catch (error) {
    console.error("Create room error:", error);
    return NextResponse.json(
      { code: 500, message: "服务器错误", data: null },
      { status: 500 }
    );
  }
}

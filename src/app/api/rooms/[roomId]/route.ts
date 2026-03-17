import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 加入房间
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: 401, message: "未登录", data: null },
        { status: 401 }
      );
    }

    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { code: 400, message: "缺少 roomId 参数", data: null },
        { status: 400 }
      );
    }

    // 检查房间是否存在
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json(
        { code: 404, message: "房间不存在", data: null },
        { status: 404 }
      );
    }

    // 检查是否已经是参与者
    const existingParticipant = await prisma.roomParticipant.findUnique({
      where: {
        userId_roomId: {
          userId: user.id,
          roomId,
        },
      },
    });

    if (existingParticipant) {
      return NextResponse.json(
        { code: 400, message: "已经是房间成员", data: null },
        { status: 400 }
      );
    }

    // 添加为参与者
    await prisma.roomParticipant.create({
      data: {
        userId: user.id,
        roomId,
        role: "participant",
      },
    });

    // 更新房间状态为进行中
    if (room.status === "waiting") {
      await prisma.room.update({
        where: { id: roomId },
        data: { status: "active" },
      });
    }

    return NextResponse.json({
      code: 0,
      data: { success: true },
    });
  } catch (error) {
    console.error("Join room error:", error);
    return NextResponse.json(
      { code: 500, message: "服务器错误", data: null },
      { status: 500 }
    );
  }
}

// 获取房间详情
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: 401, message: "未登录", data: null },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json(
        { code: 400, message: "缺少 roomId 参数", data: null },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
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
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { code: 404, message: "房间不存在", data: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 0,
      data: room,
    });
  } catch (error) {
    console.error("Get room error:", error);
    return NextResponse.json(
      { code: 500, message: "服务器错误", data: null },
      { status: 500 }
    );
  }
}
